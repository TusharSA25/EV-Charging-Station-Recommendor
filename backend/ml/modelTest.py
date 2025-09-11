"""
EV Station Recommender Testing & Demo
Test the trained model with different scenarios
"""

import pandas as pd
import numpy as np
import requests
from datetime import datetime
import joblib
# from data_collector import EVStationDataCollector # Removed import
# from model_trainer import EVRecommendationModelTrainer # Removed import

class EVRecommenderTester:
    def __init__(self):
        # Access classes directly from notebook environment
        self.trainer = EVRecommendationModelTrainer()
        self.collector = EVStationDataCollector()
        self.model_loaded = False

    def load_model(self, model_path='ev_recommender_model.pkl'):
        """Load the trained model"""

        self.model_loaded = self.trainer.load_trained_model(model_path)
        if not self.model_loaded:
            print("⚠️ Model not found. Run model_trainer.py first!")
        return self.model_loaded

    def test_recommendations_for_location(self, latitude, longitude, user_prefs, location_name="Test Location"):
        """Test recommendations for a specific location"""

        print(f"\n🌍 Testing Recommendations for {location_name}")
        print("=" * 60)
        print(f"📍 Location: ({latitude}, {longitude})")
        print(f"👤 User Preferences: {user_prefs}")

        # Fetch nearby stations
        # Assuming fetch_nearby_stations exists in EVStationDataCollector,
        # but based on the provided code, it should be fetch_stations_by_location
        # Correcting the method call here.
        nearby_stations = self.collector.fetch_stations_by_location(latitude, longitude, radius_km=25)

        if nearby_stations.empty:
            print("❌ No stations found in this area")
            return None

        print(f"🔍 Found {len(nearby_stations)} nearby stations")

        # Get recommendations
        if self.model_loaded:
            recommendations = self._get_ml_recommendations(user_prefs, nearby_stations)
        else:
            recommendations = self._get_simple_recommendations(user_prefs, nearby_stations)

        # Display results
        self._display_recommendations(recommendations)

        return recommendations

    def _get_ml_recommendations(self, user_prefs, stations_df):
        """Get ML-based recommendations"""

        print("🤖 Using trained ML model...")

        recommendations = []

        for _, station in stations_df.iterrows():
            try:
                # Prepare station features - Ensure all needed features are present
                station_features = {
                    'distance_km': station['distance_from_search_center'],
                    'available_slots': station['available_slots'],
                    'total_connections': station['total_connections'],
                    'max_power_kw': station['max_power_kw'],
                    'price_per_kwh': station['simulated_price_per_kwh'],
                    'charger_type': station['charger_category'],
                    'reliability_score': station.get('reliability_score', 0.8)
                }

                # Prepare user features for prediction
                user_features_for_prediction = {
                    'battery_capacity': user_prefs.get('battery_capacity', 45), # Default if not provided
                    'is_price_sensitive': user_prefs.get('is_price_sensitive', 0) # Default if not provided
                }

                # Calculate engineered features, handling potential issues
                distance_km = station_features['distance_km']
                available_slots = station_features['available_slots']
                total_connections = station_features['total_connections']
                max_power_kw = station_features['max_power_kw']
                price_per_kwh = station_features['price_per_kwh']

                price_per_km = price_per_kwh * distance_km if not pd.isna(price_per_kwh) and not pd.isna(distance_km) else 0

                if price_per_kwh is None or pd.isna(price_per_kwh) or price_per_kwh == 0:
                    power_efficiency = 0
                    value_score = 0
                else:
                    power_efficiency = max_power_kw / price_per_kwh if not pd.isna(max_power_kw) else 0
                    if total_connections is None or pd.isna(total_connections) or total_connections == 0:
                         value_score = 0
                    else:
                        availability_ratio = available_slots / total_connections if not pd.isna(available_slots) and not pd.isna(total_connections) else 0
                        value_score = (max_power_kw * availability_ratio) / price_per_kwh


                # Construct feature vector using a DataFrame for robust NaN handling
                feature_data = {
                    'distance_km': distance_km,
                    'distance_category': 1 if distance_km < 5 else (2 if distance_km < 15 else 3) if not pd.isna(distance_km) else 0,
                    'available_slots': available_slots,
                    'total_connections': total_connections,
                    'max_power_kw': max_power_kw,
                    'price_per_kwh': price_per_kwh,
                    'reliability_score': station_features.get('reliability_score', 0.8),
                    'charger_type_encoded': self.trainer.charger_encoder.transform([station_features['charger_type']])[0],
                    'battery_capacity': user_features_for_prediction['battery_capacity'],
                    'is_price_sensitive': user_features_for_prediction['is_price_sensitive'],
                    'availability_ratio': available_slots / total_connections if not pd.isna(available_slots) and not pd.isna(total_connections) and total_connections != 0 else 0,
                    'price_per_km': price_per_km,
                    'power_efficiency': power_efficiency,
                    'value_score': value_score
                }

                # Handle missing time features if the model was trained with them
                if 'is_weekend' in self.trainer.feature_names and 'hour_of_day' in self.trainer.feature_names:
                    # Add default time features (e.g., weekday noon)
                    feature_data['is_weekend'] = 0
                    feature_data['hour_of_day'] = 12

                feature_df = pd.DataFrame([feature_data])

                # Ensure feature columns match the trained model's feature names
                # Add missing columns with default values if any
                for col in self.trainer.feature_names:
                    if col not in feature_df.columns:
                        feature_df[col] = 0 # Or a more appropriate default

                # Reorder columns to match the trained model
                feature_df = feature_df[self.trainer.feature_names]

                # Fill any remaining NaNs (should be minimal after engineered feature handling)
                # Using mean from training data scaler if available, otherwise a default
                if hasattr(self.trainer.scaler, 'mean_') and len(self.trainer.scaler.mean_) == len(self.trainer.feature_names):
                     feature_df = feature_df.fillna(pd.Series(self.trainer.scaler.mean_, index=self.trainer.feature_names))
                else:
                    feature_df = feature_df.fillna(0) # Fallback to filling with 0


                # Scale and predict
                feature_vector_scaled = self.trainer.scaler.transform(feature_df)
                predicted_rating = self.trainer.model.predict(feature_vector_scaled)[0]

                # Clamp prediction to valid range
                final_predicted_rating = max(1.0, min(5.0, predicted_rating))


                recommendations.append({
                    'station_id': station['station_id'],
                    'name': station['name'],
                    'operator': station['operator'],
                    'predicted_rating': round(final_predicted_rating, 2),
                    'distance_km': round(station['distance_from_search_center'], 2),
                    'available_slots': station['available_slots'],
                    'total_connections': station['total_connections'],
                    'price_per_kwh': station['simulated_price_per_kwh'],
                    'charger_type': station['charger_category'],
                    'max_power_kw': station['max_power_kw'],
                    'estimated_wait': station['simulated_avg_wait_minutes']
                })

            except Exception as e:
                print(f"⚠️ Error processing station {station.get('name', 'Unknown')}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # Sort by predicted rating
        recommendations_df = pd.DataFrame(recommendations)
        if recommendations_df.empty:
            return []
        top_recommendations = recommendations_df.nlargest(3, 'predicted_rating')

        return top_recommendations.to_dict('records')


    def _get_simple_recommendations(self, user_prefs, stations_df):
        """Get rule-based recommendations (fallback)"""

        print("📐 Using rule-based scoring...")

        stations_df = stations_df.copy()

        # Simple scoring formula
        stations_df['score'] = (
            30 / (stations_df['distance_from_search_center'] + 1) +  # Distance
            25 * stations_df['available_slots'] +                    # Availability
            20 / (stations_df['simulated_price_per_kwh'] + 1) +     # Price
            15 * (stations_df['max_power_kw'] / 50) +               # Power
            10 * stations_df['is_operational']                      # Operational
        )

        # User preference adjustments
        if user_prefs.get('is_price_sensitive', 0):
            stations_df['score'] += 15 / (stations_df['simulated_price_per_kwh'] + 1)

        if user_prefs.get('battery_capacity', 40) > 50:
            fast_bonus = (stations_df['charger_category'].isin(['fast', 'superfast'])).astype(int) * 10
            stations_df['score'] += fast_bonus

        # Get top 3
        top_stations = stations_df.nlargest(3, 'score')

        recommendations = []
        for _, station in top_stations.iterrows():
            recommendations.append({
                'station_id': station['station_id'],
                'name': station['name'],
                'operator': station['operator'],
                'rule_score': round(station['score'], 2),
                'distance_km': round(station['distance_from_search_center'], 2),
                'available_slots': station['available_slots'],
                'total_connections': station['total_connections'],
                'price_per_kwh': station['simulated_price_per_kwh'],
                'charger_type': station['charger_category'],
                'max_power_kw': station['max_power_kw'],
                'estimated_wait': station['simulated_avg_wait_minutes']
            })

        return recommendations

    def _display_recommendations(self, recommendations):
        """Display recommendations in a nice format"""

        if not recommendations:
            print("❌ No recommendations generated")
            return

        print(f"\n🏆 Top {len(recommendations)} Recommendations:")
        print("-" * 80)

        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. 🏢 {rec['name']}")
            print(f"   🏪 Operator: {rec['operator']}")

            if 'predicted_rating' in rec:
                print(f"   ⭐ Predicted Rating: {rec['predicted_rating']}/5.0")
            elif 'rule_score' in rec:
                print(f"   📊 Rule Score: {rec['rule_score']}")

            print(f"   📍 Distance: {rec['distance_km']} km")
            print(f"   🔌 Available: {rec['available_slots']}/{rec['total_connections']} slots")
            print(f"   💰 Price: ₹{rec['price_per_kwh']}/kWh")
            print(f"   ⚡ Type: {rec['charger_type']} ({rec['max_power_kw']} kW)")
            print(f"   ⏱️ Est. Wait: {rec['estimated_wait']} minutes")

    def run_test_scenarios(self):
        """Run comprehensive test scenarios"""

        print("🧪 Running Comprehensive Test Scenarios")
        print("=" * 60)

        # Test scenarios
        test_cases = [
            {
                'name': 'Price-Conscious User in Bangalore',
                'location': (12.9716, 77.5946),
                'user_prefs': {
                    'battery_capacity': 35,
                    'is_price_sensitive': 1
                }
            },
            {
                'name': 'Convenience-First User in Mumbai',
                'location': (19.0760, 72.8777),
                'user_prefs': {
                    'battery_capacity': 60,
                    'is_price_sensitive': 0
                }
            },
            {
                'name': 'Fast Charging User in Delhi',
                'location': (28.6139, 77.2090),
                'user_prefs': {
                    'battery_capacity': 72,
                    'is_price_sensitive': 0
                }
            },
            {
                'name': 'Budget User in Pune',
                'location': (18.5204, 73.8567),
                'user_prefs': {
                    'battery_capacity': 25,
                    'is_price_sensitive': 1
                }
            }
        ]

        all_results = {}

        for test_case in test_cases:
            try:
                recommendations = self.test_recommendations_for_location(
                    test_case['location'][0],
                    test_case['location'][1],
                    test_case['user_prefs'],
                    test_case['name']
                )

                if recommendations:
                    all_results[test_case['name']] = recommendations

                print("\n" + "="*60)

            except Exception as e:
                print(f"❌ Error in test case '{test_case['name']}': {e}")
                continue

        return all_results

    def evaluate_model_performance(self):
        """Evaluate model performance metrics"""

        if not self.model_loaded:
            print("❌ No model loaded for evaluation")
            return

        print("📊 Model Performance Evaluation")
        print("=" * 40)

        # Load test data
        try:
            bookings_df = pd.read_csv('training_bookings.csv')
            stations_df = pd.read_csv('real_stations.csv')
            users_df = pd.read_csv('training_users.csv')
        except FileNotFoundError:
            print("❌ Training data not found")
            return

        # Sample some test cases
        test_sample = bookings_df.sample(min(100, len(bookings_df)))

        precisions = []
        distance_accuracies = []

        for _, booking in test_sample.iterrows():
            user = users_df[users_df['user_id'] == booking['user_id']].iloc[0]

            user_prefs = {
                'battery_capacity': user['battery_capacity_kwh'],
                'is_price_sensitive': user['is_price_sensitive']
            }

            # Get actual nearby stations
            user_lat = user['home_latitude']
            user_lng = user['home_longitude']

            nearby_stations = stations_df.copy()
            nearby_stations['distance_from_search_center'] = nearby_stations.apply(
                lambda row: self.collector._calculate_distance(user_lat, user_lng, row['latitude'], row['longitude']),
                axis=1
            )

            nearby_stations = nearby_stations[nearby_stations['distance_from_search_center'] < 30]

            if len(nearby_stations) < 3:
                continue

            # Get recommendations
            recommendations = self._get_ml_recommendations(user_prefs, nearby_stations)

            if recommendations:
                # Check if any recommendation has rating > 3.5
                high_rated = [r for r in recommendations if r.get('predicted_rating', 0) > 3.5]
                precision = len(high_rated) / len(recommendations)
                precisions.append(precision)

                # Check distance optimization
                avg_distance = np.mean([r['distance_km'] for r in recommendations])
                distance_accuracies.append(avg_distance)

        if precisions:
            print(f"📊 Performance Metrics:")
            print(f"   Precision@3 (rating >3.5): {np.mean(precisions):.3f}")
            print(f"   Average recommended distance: {np.mean(distance_accuracies):.2f} km")
            print(f"   Distance std deviation: {np.std(distance_accuracies):.2f} km")
        else:
            print("⚠️ Could not calculate performance metrics")

    def interactive_test(self):
        """Interactive testing mode"""

        print("🎮 Interactive Testing Mode")
        print("Enter location and preferences to get recommendations")
        print("Type 'quit' to exit")
        print("-" * 50)

        while True:
            try:
                print("\n📍 Enter location:")
                lat = input("Latitude: ").strip()
                if lat.lower() == 'quit':
                    break

                lng = input("Longitude: ").strip()
                if lng.lower() == 'quit':
                    break

                lat = float(lat)
                lng = float(lng)

                print("\n👤 User preferences:")
                battery = int(input("Battery capacity (kWh) [default: 45]: ") or "45")
                price_sensitive = input("Price sensitive? (y/n) [default: n]: ").lower().startswith('y')

                user_prefs = {
                    'battery_capacity': battery,
                    'is_price_sensitive': 1 if price_sensitive else 0
                }

                # Get recommendations
                recommendations = self.test_recommendations_for_location(
                    lat, lng, user_prefs, f"Custom Location ({lat}, {lng})"
                )

            except ValueError:
                print("❌ Please enter valid numbers for coordinates")
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

    def benchmark_model(self):
        """Benchmark model against simple baseline"""

        print("🏁 Benchmarking ML Model vs Simple Rules")
        print("=" * 50)

        # Load test data
        try:
            bookings_df = pd.read_csv('training_bookings.csv').sample(50)  # Small sample for quick test
            stations_df = pd.read_csv('real_stations.csv')
            users_df = pd.read_csv('training_users.csv')
        except FileNotFoundError:
            print("❌ Training data not found")
            return

        ml_scores = []
        rule_scores = []

        for _, booking in bookings_df.iterrows():
            user = users_df[users_df['user_id'] == booking['user_id']].iloc[0]

            user_prefs = {
                'battery_capacity': user['battery_capacity_kwh'],
                'is_price_sensitive': user['is_price_sensitive']
            }

            # Create nearby stations
            # Use actual stations from the loaded data instead of sampling and simulating distances
            user_lat = user['home_latitude']
            user_lng = user['home_longitude']

            nearby_stations = stations_df.copy()
            nearby_stations['distance_from_search_center'] = nearby_stations.apply(
                lambda row: self.collector._calculate_distance(user_lat, user_lng, row['latitude'], row['longitude']),
                axis=1
            )

            nearby_stations = nearby_stations[nearby_stations['distance_from_search_center'] < 30]

            if len(nearby_stations) < 3:
                continue


            # ML recommendations
            if self.model_loaded:
                ml_recs = self._get_ml_recommendations(user_prefs, nearby_stations)
                if ml_recs:
                    ml_avg_rating = np.mean([r.get('predicted_rating', 0) for r in ml_recs])
                    ml_scores.append(ml_avg_rating)

            # Rule-based recommendations
            rule_recs = self._get_simple_recommendations(user_prefs, nearby_stations)
            if rule_recs:
                # Convert rule scores to rating scale (rough approximation)
                rule_avg_score = np.mean([r.get('rule_score', 0) for r in rule_recs])
                # Normalizing rule score based on the max possible score in simple_recommendations
                # Max score can be roughly estimated: 30 + 25*max_conn + 20 + 15*max_power/50 + 10 + 15 + 10 = ~150
                # So dividing by 30 might give a rough 1-5 scale. Adjusting slightly.
                rule_scores.append(min(5.0, rule_avg_score / 30))

        # Compare results
        if ml_scores and rule_scores:
            print(f"📊 Benchmark Results:")
            print(f"   🤖 ML Model avg predicted rating: {np.mean(ml_scores):.2f}")
            print(f"   📐 Rule-based avg normalized score: {np.mean(rule_scores):.2f}")
            # Print a note about the score comparison
            print("   (Rule-based scores are normalized to a 1-5 scale for comparison)")
            # It's hard to directly compare these as one is a predicted rating and other a normalized score.
            # A better comparison would be how often the top recommendation matches the actual booking.
            # But given the current structure, this is a basic comparison.
        else:
            print("⚠️ Could not complete benchmark")

def run_quick_demo():
    """Quick demo with predefined scenarios"""

    print("🚀 Quick Demo - EV Station Recommendations")
    print("=" * 60)

    tester = EVRecommenderTester()

    # Try to load model
    tester.load_model()

    # Predefined test scenarios
    demo_scenarios = [
        {
            'name': 'Bangalore Tech Park Employee',
            'location': (12.9716, 77.5946),  # Bangalore center
            'user_prefs': {
                'battery_capacity': 50,
                'is_price_sensitive': 1
            }
        },
        {
            'name': 'Mumbai Highway Traveler',
            'location': (19.0760, 72.8777),  # Mumbai center
            'user_prefs': {
                'battery_capacity': 72,
                'is_price_sensitive': 0
            }
        }
    ]

    results = {}

    for scenario in demo_scenarios:
        try:
            recommendations = tester.test_recommendations_for_location(
                scenario['location'][0],
                scenario['location'][1],
                scenario['user_prefs'],
                scenario['name']
            )

            if recommendations:
                results[scenario['name']] = recommendations

        except Exception as e:
            print(f"❌ Demo scenario failed: {e}")

    # Summary
    if results:
        print(f"\n✅ Demo completed! Tested {len(results)} scenarios successfully")
    else:
        print("❌ Demo failed - check internet connection and try again")

def performance_analysis():
    """Analyze model performance in detail"""

    print("📈 Detailed Performance Analysis")
    print("=" * 50)

    tester = EVRecommenderTester()

    if not tester.load_model():
        return

    # Run performance evaluation
    tester.evaluate_model_performance()

    # Run benchmark
    tester.benchmark_model()

def main():
    """Main testing interface"""

    print("🧪 EV Station Recommender Testing Suite")
    print("=" * 60)
    print("Choose an option:")
    print("1. Quick Demo (predefined scenarios)")
    print("2. Interactive Testing (enter your own location)")
    print("3. Performance Analysis")
    print("4. Run all tests")

    choice = input("\nEnter choice (1-4): ").strip()

    if choice == '1':
        run_quick_demo()
    elif choice == '2':
        tester = EVRecommenderTester()
        tester.load_model()
        tester.interactive_test()
    elif choice == '3':
        performance_analysis()
    elif choice == '4':
        print("🔄 Running all tests...")
        run_quick_demo()
        performance_analysis()
    else:
        print("❌ Invalid choice. Running quick demo...")
        run_quick_demo()

if __name__ == "__main__":
    main()