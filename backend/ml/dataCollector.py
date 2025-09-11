"""
EV Station Data Collector
Fetches real station data from OpenChargeMap API
"""

import pandas as pd
import numpy as np
import requests
import json
import time
from datetime import datetime

class EVStationDataCollector:
    def __init__(self, api_key=None):
        """
        Initialize data collector

        Args:
            api_key (str, optional): OpenChargeMap API key for higher rate limits
                                   Get from: https://openchargemap.org/site/develop/api
                                   If None, uses public access (limited requests)
        """
        self.base_url = "https://api.openchargemap.io/v3/poi"
        self.api_key = "a6a03ef0-604e-4369-8f27-533c223f2e52"
        self.session = requests.Session()

        if api_key:
            print("✅ Using API key for higher rate limits")
        else:
            print("⚠️ Using public access (limited requests)")

    def fetch_stations_by_location(self, latitude, longitude, radius_km=25, max_results=50):
        """
        Fetch stations near a specific location

        Args:
            latitude (float): Center latitude
            longitude (float): Center longitude
            radius_km (int): Search radius in kilometers
            max_results (int): Maximum stations to fetch

        Returns:
            pd.DataFrame: Processed station data
        """

        params = {
            'output': 'json',
            'latitude': latitude,
            'longitude': longitude,
            'distance': radius_km,
            'maxresults': max_results,
            'compact': 'false',
            'verbose': 'false',
            'includecomments': 'false'
        }

        # Add API key if provided
        if self.api_key:
            params['key'] = self.api_key

        print(f"🔍 Fetching stations near ({latitude}, {longitude}) within {radius_km}km...")

        try:
            response = self.session.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()

            raw_data = response.json()

            if not raw_data:
                print("⚠️ No stations found in this area")
                return pd.DataFrame()

            processed_df = self._process_raw_stations(raw_data, latitude, longitude)
            print(f"✅ Successfully processed {len(processed_df)} stations")

            return processed_df

        except requests.exceptions.Timeout:
            print("❌ Request timeout. Try again or reduce search radius.")
            return pd.DataFrame()
        except requests.exceptions.RequestException as e:
            print(f"❌ API request failed: {e}")
            return pd.DataFrame()
        except json.JSONDecodeError:
            print("❌ Invalid response format from API")
            return pd.DataFrame()

    def fetch_stations_multiple_cities(self, cities_config=None):
        """
        Fetch stations from multiple cities for diverse training data

        Args:
            cities_config (list): List of city configurations
                                Default: Major Indian cities

        Returns:
            pd.DataFrame: Combined station data from all cities
        """

        if cities_config is None:
            cities_config = [
                {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946, "radius": 30},
                {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777, "radius": 25},
                {"name": "Delhi", "lat": 28.6139, "lng": 77.2090, "radius": 25},
                {"name": "Chennai", "lat": 13.0827, "lng": 80.2707, "radius": 25},
                {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "radius": 20}
            ]

        all_stations = []

        for city in cities_config:
            print(f"\n📍 Processing {city['name']}...")

            city_stations = self.fetch_stations_by_location(
                city['lat'], city['lng'],
                radius_km=city['radius'],
                max_results=30
            )

            if not city_stations.empty:
                city_stations['source_city'] = city['name']
                all_stations.append(city_stations)
                print(f"   ✅ Added {len(city_stations)} stations from {city['name']}")
            else:
                print(f"   ❌ No stations found in {city['name']}")

            # Be respectful to API (avoid rate limiting)
            time.sleep(1)

        if all_stations:
            combined_df = pd.concat(all_stations, ignore_index=True)
            print(f"\n🎯 Total stations collected: {len(combined_df)}")
            return combined_df
        else:
            print("❌ No station data collected from any city")
            return pd.DataFrame()

    def _process_raw_stations(self, raw_stations, center_lat, center_lng):
        """Process raw API response into clean DataFrame"""

        processed_stations = []

        for station in raw_stations:
            try:
                # Extract address info
                addr_info = station.get('AddressInfo', {})
                lat = addr_info.get('Latitude')
                lng = addr_info.get('Longitude')

                if not lat or not lng:
                    continue

                # Extract connection details
                connections = station.get('Connections', [])
                total_connections = len(connections) if connections else 1

                # Find most powerful charger
                max_power_kw = 0
                connection_types = []

                for conn in connections:
                    power = conn.get('PowerKW') or 0
                    max_power_kw = max(max_power_kw, power)

                    conn_type = conn.get('ConnectionType', {})
                    if conn_type:
                        connection_types.append(conn_type.get('Title', 'Unknown'))

                # Default values if no connection data
                if max_power_kw == 0:
                    max_power_kw = 7  # Default slow charger

                # Classify charger speed
                if max_power_kw >= 50:
                    charger_category = 'superfast'
                elif max_power_kw >= 22:
                    charger_category = 'fast'
                else:
                    charger_category = 'slow'

                # Calculate distance from search center
                distance_km = self._calculate_distance(center_lat, center_lng, lat, lng)

                # Extract operational info
                status = station.get('StatusType', {})
                operator = station.get('OperatorInfo', {})

                station_data = {
                    'station_id': station.get('ID'),
                    'name': addr_info.get('Title', 'Unknown Station')[:50],
                    'address': addr_info.get('AddressLine1', '')[:100],
                    'city': addr_info.get('Town', 'Unknown'),
                    'state': addr_info.get('StateOrProvince', ''),
                    'country': addr_info.get('Country', {}).get('Title', ''),
                    'latitude': lat,
                    'longitude': lng,
                    'distance_from_search_center': round(distance_km, 2),

                    # Charger specifications
                    'total_connections': total_connections,
                    'max_power_kw': max_power_kw,
                    'charger_category': charger_category,
                    'connection_types': ', '.join(set(connection_types)) if connection_types else 'Unknown',

                    # Operational info
                    'operator': operator.get('Title', 'Unknown')[:30],
                    'is_operational': 1 if status.get('IsOperational') else 0,
                    'status': status.get('Title', 'Unknown'),

                    # Additional metadata
                    'last_updated': station.get('DateLastStatusUpdate', ''),
                    'data_provider': station.get('DataProvider', {}).get('Title', 'OpenChargeMap')
                }

                processed_stations.append(station_data)

            except Exception as e:
                print(f"⚠️ Error processing station ID {station.get('ID', 'Unknown')}: {e}")
                continue

        df = pd.DataFrame(processed_stations)

        # Remove duplicates and invalid entries
        df = df.drop_duplicates(subset=['station_id'])
        df = df[df['is_operational'] == 1]  # Only operational stations

        # Add simulated real-time data (since API doesn't provide this)
        df = self._add_simulated_realtime_data(df)

        return df

    def fetch_stations_multiple_cities(self, cities_config=None):
        """
        Fetch stations from multiple cities for diverse training data

        Args:
            cities_config (list): List of city configurations
                                Default: Major Indian cities

        Returns:
            pd.DataFrame: Combined station data from all cities
        """

        if cities_config is None:
            cities_config = [
                {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946, "radius": 30},
                {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777, "radius": 25},
                {"name": "Delhi", "lat": 28.6139, "lng": 77.2090, "radius": 25},
                {"name": "Chennai", "lat": 13.0827, "lng": 80.2707, "radius": 25},
                {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "radius": 20}
            ]

        all_stations = []

        for city in cities_config:
            print(f"\n📍 Processing {city['name']}...")

            city_stations = self.fetch_stations_by_location(
                city['lat'], city['lng'],
                radius_km=city['radius'],
                max_results=30
            )

            if not city_stations.empty:
                city_stations['source_city'] = city['name']
                all_stations.append(city_stations)
                print(f"   ✅ Added {len(city_stations)} stations from {city['name']}")
            else:
                print(f"   ❌ No stations found in {city['name']}")

            # Be respectful to API (avoid rate limiting)
            time.sleep(1)

        if all_stations:
            combined_df = pd.concat(all_stations, ignore_index=True)
            print(f"\n🎯 Total stations collected: {len(combined_df)}")
            return combined_df
        else:
            print("❌ No station data collected from any city")
            return pd.DataFrame()

    def _process_raw_stations(self, raw_stations, center_lat, center_lng):
        """Process raw API response into clean DataFrame"""

        processed_stations = []

        for station in raw_stations:
            try:
                # Extract address info
                addr_info = station.get('AddressInfo', {})
                lat = addr_info.get('Latitude')
                lng = addr_info.get('Longitude')

                if not lat or not lng:
                    continue

                # Extract connection details
                connections = station.get('Connections', [])
                total_connections = len(connections) if connections else 1

                # Find most powerful charger
                max_power_kw = 0
                connection_types = []

                for conn in connections:
                    power = conn.get('PowerKW') or 0
                    max_power_kw = max(max_power_kw, power)

                    conn_type = conn.get('ConnectionType', {})
                    if conn_type:
                        connection_types.append(conn_type.get('Title', 'Unknown'))

                # Default values if no connection data
                if max_power_kw == 0:
                    max_power_kw = 7  # Default slow charger

                # Classify charger speed
                if max_power_kw >= 50:
                    charger_category = 'superfast'
                elif max_power_kw >= 22:
                    charger_category = 'fast'
                else:
                    charger_category = 'slow'

                # Calculate distance from search center
                distance_km = self._calculate_distance(center_lat, center_lng, lat, lng)

                # Extract operational info
                status = station.get('StatusType', {})
                operator = station.get('OperatorInfo', {})

                station_data = {
                    'station_id': station.get('ID'),
                    'name': addr_info.get('Title', 'Unknown Station')[:50],
                    'address': addr_info.get('AddressLine1', '')[:100],
                    'city': addr_info.get('Town', 'Unknown'),
                    'state': addr_info.get('StateOrProvince', ''),
                    'country': addr_info.get('Country', {}).get('Title', ''),
                    'latitude': lat,
                    'longitude': lng,
                    'distance_from_search_center': round(distance_km, 2),

                    # Charger specifications
                    'total_connections': total_connections,
                    'max_power_kw': max_power_kw,
                    'charger_category': charger_category,
                    'connection_types': ', '.join(set(connection_types)) if connection_types else 'Unknown',

                    # Operational info
                    'operator': operator.get('Title', 'Unknown')[:30],
                    'is_operational': 1 if status.get('IsOperational') else 0,
                    'status': status.get('Title', 'Unknown'),

                    # Additional metadata
                    'last_updated': station.get('DateLastStatusUpdate', ''),
                    'data_provider': station.get('DataProvider', {}).get('Title', 'OpenChargeMap')
                }

                processed_stations.append(station_data)

            except Exception as e:
                print(f"⚠️ Error processing station ID {station.get('ID', 'Unknown')}: {e}")
                continue

        df = pd.DataFrame(processed_stations)

        # Remove duplicates and invalid entries
        df = df.drop_duplicates(subset=['station_id'])
        df = df[df['is_operational'] == 1]  # Only operational stations

        # Add simulated real-time data (since API doesn't provide this)
        df = self._add_simulated_realtime_data(df)

        return df

    def _calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two points using Haversine formula"""
        from math import radians, cos, sin, asin, sqrt

        # Convert to radians
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])

        # Haversine formula
        dlng = lng2 - lng1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth's radius in kilometers

        return c * r

    def _add_simulated_realtime_data(self, df):
        """Add simulated real-time data that API doesn't provide"""

        np.random.seed(42)  # For reproducible simulation

        # Simulate current availability (0 to total_connections)
        df['available_slots'] = np.random.randint(0, df['total_connections'] + 1)

        # Simulate pricing (based on charger type and location)
        base_prices = {
            'slow': (6, 10),
            'fast': (8, 13),
            'superfast': (10, 16)
        }

        prices = []
        for _, row in df.iterrows():
            price_range = base_prices.get(row['charger_category'], (7, 12))
            price = np.random.uniform(price_range[0], price_range[1])
            prices.append(round(price, 2))

        df['simulated_price_per_kwh'] = prices

        # Simulate average wait times
        df['simulated_avg_wait_minutes'] = np.random.randint(5, 45, len(df))

        # Simulate reliability score (higher for major operators)
        major_operators = ['Tata Power', 'Ather', 'ChargePoint', 'BPCL']
        df['reliability_score'] = np.where(
            df['operator'].str.contains('|'.join(major_operators), case=False, na=False),
            np.random.uniform(0.85, 0.98, len(df)),
            np.random.uniform(0.65, 0.85, len(df))
        )
        df['reliability_score'] = df['reliability_score'].round(2)

        return df

    def save_station_data(self, df, filename='collected_stations.csv'):
        """Save collected station data"""
        df.to_csv(filename, index=False)
        print(f"💾 Station data saved to {filename}")

    def generate_training_users(self, stations_df, n_users=300):
        """Generate simulated users for training"""

        print(f"👥 Generating {n_users} simulated users...")

        users = []
        cities = stations_df['city'].unique()

        for i in range(n_users):
            # Assign user to a city (weighted by station count)
            city_weights = stations_df['city'].value_counts(normalize=True)
            user_city = np.random.choice(cities, p=city_weights[cities])

            # Get city center coordinates
            city_stations = stations_df[stations_df['city'] == user_city]
            city_center_lat = city_stations['latitude'].mean()
            city_center_lng = city_stations['longitude'].mean()

            user = {
                'user_id': i + 1,
                'base_city': user_city,
                'home_latitude': city_center_lat + np.random.normal(0, 0.05),
                'home_longitude': city_center_lng + np.random.normal(0, 0.05),
                'ev_model': np.random.choice(['Tata Nexon EV', 'MG ZS EV', 'Hyundai Kona', 'Mahindra eXUV300'],
                                           p=[0.4, 0.25, 0.2, 0.15]),
                'battery_capacity_kwh': np.random.choice([25, 35, 44, 50, 72], p=[0.2, 0.3, 0.3, 0.15, 0.05]),
                'is_price_sensitive': np.random.choice([0, 1], p=[0.65, 0.35]),
                'preferred_charger_speed': np.random.choice(['any', 'fast', 'superfast'], p=[0.5, 0.3, 0.2]),
                'charging_frequency': np.random.choice(['daily', 'weekly', 'occasional'], p=[0.15, 0.6, 0.25])
            }

            users.append(user)

        users_df = pd.DataFrame(users)
        users_df.to_csv('training_users.csv', index=False)
        print(f"👥 Users saved to training_users.csv")

        return users_df

    def generate_booking_interactions(self, stations_df, users_df, interactions_per_user=4):
        """Generate realistic booking interactions for training"""

        print(f"📊 Generating booking interactions...")

        bookings = []

        for _, user in users_df.iterrows():
            user_bookings = self._simulate_user_bookings(user, stations_df, interactions_per_user)
            bookings.extend(user_bookings)

        bookings_df = pd.DataFrame(bookings)
        bookings_df.to_csv('training_bookings.csv', index=False)

        print(f"📊 Generated {len(bookings_df)} booking interactions")
        print(f"💾 Bookings saved to training_bookings.csv")

        return bookings_df

    def _simulate_user_bookings(self, user, stations_df, n_bookings):
        """Simulate realistic bookings for one user"""

        bookings = []

        # Find stations accessible to this user (same city or nearby)
        user_lat = user['home_latitude']
        user_lng = user['home_longitude']

        # Calculate distances to all stations
        stations_with_distance = stations_df.copy()
        stations_with_distance['distance_to_user'] = stations_with_distance.apply(
            lambda row: self._calculate_distance(user_lat, user_lng, row['latitude'], row['longitude']),
            axis=1
        )

        # Filter to reasonable distance (< 50km)
        accessible_stations = stations_with_distance[
            stations_with_distance['distance_to_user'] < 50
        ].copy()

        if len(accessible_stations) == 0:
            return bookings

        for booking_num in range(n_bookings):
            # Select station based on realistic probability
            station = self._select_station_realistically(user, accessible_stations)

            if station is None:
                continue

            # Simulate booking conditions
            booking_time = datetime.now() - pd.Timedelta(days=np.random.randint(1, 180))
            available_slots = np.random.randint(0, station['total_connections'] + 1)
            current_price = station['simulated_price_per_kwh']

            # Calculate user satisfaction rating
            rating = self._calculate_user_rating(user, station, available_slots, current_price)

            booking = {
                'booking_id': f"{user['user_id']}_{booking_num}_{station['station_id']}",
                'user_id': user['user_id'],
                'station_id': station['station_id'],
                'booking_date': booking_time.strftime('%Y-%m-%d'),
                'distance_km': round(station['distance_to_user'], 2),
                'available_slots_at_booking': available_slots,
                'price_paid_per_kwh': current_price,
                'charger_type': station['charger_category'],
                'max_power_kw': station['max_power_kw'],
                'total_connections': station['total_connections'],
                'user_rating': rating,
                'booking_completed': 1 if available_slots > 0 else 0,
                'wait_time_minutes': station['simulated_avg_wait_minutes'] if available_slots > 0 else 0
            }

            bookings.append(booking)

        return bookings

    def _select_station_realistically(self, user, stations_df):
        """Select station based on realistic user behavior"""

        if len(stations_df) == 0:
            return None

        # Calculate selection probability
        stations_df['selection_prob'] = 1 / (1 + stations_df['distance_to_user'] / 5)

        # Price sensitivity
        if user['is_price_sensitive']:
            price_factor = 15 / (stations_df['simulated_price_per_kwh'] + 1)
            stations_df['selection_prob'] *= price_factor

        # Charger preference
        if user['preferred_charger_speed'] != 'any':
            speed_match = (stations_df['charger_category'] == user['preferred_charger_speed']).astype(float)
            stations_df['selection_prob'] *= (1 + speed_match * 0.5)

        # Big battery prefers fast charging
        if user['battery_capacity_kwh'] > 50:
            fast_bonus = (stations_df['charger_category'].isin(['fast', 'superfast'])).astype(float)
            stations_df['selection_prob'] *= (1 + fast_bonus * 0.3)

        # Normalize probabilities
        total_prob = stations_df['selection_prob'].sum()
        if total_prob == 0:
            return stations_df.sample(1).iloc[0]  # Random fallback

        stations_df['selection_prob'] /= total_prob

        # Select station
        chosen_idx = np.random.choice(len(stations_df), p=stations_df['selection_prob'])
        return stations_df.iloc[chosen_idx]

    def _calculate_user_rating(self, user, station, available_slots, price):
        """Calculate realistic user rating based on experience"""

        base_rating = 3.0  # Neutral starting point

        # Distance impact
        distance = station['distance_to_user']
        if distance < 3:
            base_rating += 1.0
        elif distance < 8:
            base_rating += 0.5
        elif distance > 20:
            base_rating -= 0.7

        # Availability impact
        if available_slots == 0:
            base_rating -= 1.5  # Major negative
        elif available_slots >= 3:
            base_rating += 0.6
        elif available_slots == 1:
            base_rating -= 0.2  # Slight negative (might have to wait)

        # Price impact (especially for price-sensitive users)
        if user['is_price_sensitive']:
            if price < 8:
                base_rating += 0.5
            elif price > 13:
                base_rating -= 0.6

        # Operator reputation (simulated)
        if 'Tata' in station['operator'] or 'Ather' in station['operator']:
            base_rating += 0.2

        # Add realistic noise
        final_rating = base_rating + np.random.normal(0, 0.4)

        # Clamp to 1-5 scale
        return round(max(1.0, min(5.0, final_rating)), 1)

    def collect_data(self):
        """
        Collect station, user, and booking data as DataFrames.
        Returns:
            tuple: (stations_df, users_df, bookings_df)
        """
        print("🚀 Collecting all data for model training...")

        # Collect station data
        stations_df = self.fetch_stations_multiple_cities()
        if stations_df.empty:
            print("❌ Failed to collect station data.")
            return None, None, None

        # Generate training users
        users_df = self.generate_training_users(stations_df)

        # Generate booking interactions
        bookings_df = self.generate_booking_interactions(stations_df, users_df)

        print("✅ Data collection complete!")
        return stations_df, users_df, bookings_df

def main():
    """Main data collection workflow"""

    print("🚀 Starting EV Station Data Collection")
    print("=" * 50)

    # Option 1: Use with API key (faster, higher limits)
    # collector = EVStationDataCollector(api_key="YOUR_API_KEY_HERE")

    # Option 2: Use without API key (public access)
    collector = EVStationDataCollector()

    # Collect station data from multiple cities
    stations_df = collector.fetch_stations_multiple_cities()

    if stations_df.empty:
        print("❌ Failed to collect station data. Exiting.")
        return

    # Save station data
    collector.save_station_data(stations_df, 'real_stations.csv')

    # Generate training users
    users_df = collector.generate_training_users(stations_df)

    # Generate booking interactions
    bookings_df = collector.generate_booking_interactions(stations_df, users_df)

    # Summary statistics
    print("\n📈 Data Collection Summary:")
    print(f"   🏢 Stations: {len(stations_df)} from {stations_df['source_city'].nunique()} cities")
    print(f"   👥 Users: {len(users_df)}")
    print(f"   📊 Interactions: {len(bookings_df)}")
    print(f"   ⭐ Avg Rating: {bookings_df['user_rating'].mean():.2f}/5.0")
    print(f"   ✅ Success Rate: {bookings_df['booking_completed'].mean():.1%}")

    print("\n✅ Data collection complete! Ready for model training.")

if __name__ == "__main__":
    main()