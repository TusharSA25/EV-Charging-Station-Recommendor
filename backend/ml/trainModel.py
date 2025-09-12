"""
EV Station Recommendation Model Trainer
Trains ML model on collected station and user data
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import sys
import os

# Add the parent directory of the current file to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataCollector import EVStationDataCollector  # Use relative import
from datetime import datetime

class EVRecommendationModelTrainer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.charger_encoder = LabelEncoder()
        self.feature_names = None
        self.is_trained = False

    def load_training_data(self, use_collector=False):
        """
        Load all training datasets.
        Args:
            use_collector (bool): If True, fetch data using EVStationDataCollector.
        Returns:
            tuple: (stations_df, users_df, bookings_df)
        """
        if use_collector:
            print("📡 Using data collector to fetch training data...")
            collector = EVStationDataCollector()
            return collector.collect_data()

        try:
            print("📂 Loading training data from CSV files...")
            stations_df = pd.read_csv('real_stations.csv')
            users_df = pd.read_csv('training_users.csv')
            bookings_df = pd.read_csv('training_bookings.csv')

            print(f"✅ Loaded:")
            print(f"   - Stations: {len(stations_df)}")
            print(f"   - Users: {len(users_df)}")
            print(f"   - Bookings: {len(bookings_df)}")

            return stations_df, users_df, bookings_df

        except FileNotFoundError as e:
            print(f"❌ Training data not found: {e}")
            print("💡 Run data_collector.py first to collect data")
            return None, None, None

    def prepare_training_features(self, bookings_df, stations_df, users_df):
        """Prepare features for ML training"""

        print("🔧 Engineering features for training...")

        # Merge all data
        data = bookings_df.merge(stations_df, on='station_id', how='inner')
        data = data.merge(users_df, on='user_id', how='inner')

        print(f"📊 Training samples after merge: {len(data)}")
        print(f"Merged dataframe columns: {data.columns.tolist()}")

        # Prepare feature matrix
        features = pd.DataFrame()

        # Distance features
        features['distance_km'] = data['distance_km']
        features['distance_category'] = pd.cut(data['distance_km'],
                                             bins=[0, 5, 15, 30, 100],
                                             labels=[0, 1, 2, 3]).astype(float)

        # Station features
        features['available_slots'] = data['available_slots_at_booking']
        features['total_connections'] = data['total_connections_x'] # Use total_connections from bookings
        features['max_power_kw'] = data['max_power_kw_x'] # Use max_power_kw from bookings
        features['price_per_kwh'] = data['price_paid_per_kwh']
        features['reliability_score'] = data['reliability_score']

        # Encode categorical features
        features['charger_type_encoded'] = self.charger_encoder.fit_transform(data['charger_category']) # Use charger_category from stations

        # User features
        features['battery_capacity'] = data['battery_capacity_kwh']
        features['is_price_sensitive'] = data['is_price_sensitive']

        # Engineered features
        features['availability_ratio'] = data['available_slots_at_booking'] / data['total_connections_x']
        features['price_per_km'] = data['price_paid_per_kwh'] * data['distance_km']
        features['power_efficiency'] = data['max_power_kw_x'] / data['price_paid_per_kwh']
        features['value_score'] = (data['max_power_kw_x'] * (data['available_slots_at_booking'] / data['total_connections_x'])) / data['price_paid_per_kwh']


        # Time-based features (if booking has timestamp)
        if 'booking_date' in data.columns:
            data['booking_date'] = pd.to_datetime(data['booking_date'])
            features['is_weekend'] = data['booking_date'].dt.dayofweek.isin([5, 6]).astype(int)
            features['hour_of_day'] = data['booking_date'].dt.hour


        # Target variable
        target = data['user_rating']

        self.feature_names = features.columns.tolist()

        print(f"🎯 Features prepared: {len(features.columns)} features")
        print(f"📊 Target distribution: {target.describe()}")

        return features, target

    def train_model(self, algorithm='random_forest'):
        """Train the recommendation model"""

        # Load data
        stations_df, users_df, bookings_df = self.load_training_data()

        if stations_df is None:
            return False

        # Prepare features
        X, y = self.prepare_training_features(bookings_df, stations_df, users_df)

        if len(X) == 0:
            print("❌ No training samples available")
            return False

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=None
        )

        print(f"📚 Training set: {len(X_train)} samples")
        print(f"🧪 Test set: {len(X_test)} samples")

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Select and train model
        if algorithm == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=200,  # Increased from 100 to 200
                max_depth=10,
                min_samples_split=5,
                random_state=42
            )
        elif algorithm == 'linear':
            self.model = LinearRegression()
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        print(f"🤖 Training {algorithm} model...")
        self.model.fit(X_train_scaled, y_train)

        # Evaluate model
        self._evaluate_model(X_train_scaled, X_test_scaled, y_train, y_test)

        self.is_trained = True
        return True

    def _evaluate_model(self, X_train, X_test, y_train, y_test):
        """Evaluate model performance"""

        # Predictions
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)

        # Calculate metrics
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        test_mae = mean_absolute_error(y_test, test_pred)
        test_r2 = r2_score(y_test, test_pred)

        print("\n📈 Model Performance:")
        print("=" * 40)
        print(f"🎯 Training RMSE: {train_rmse:.3f}")
        print(f"🎯 Test RMSE: {test_rmse:.3f}")
        print(f"🎯 Test MAE: {test_mae:.3f}")
        print(f"🎯 Test R²: {test_r2:.3f}")

        # Model accuracy interpretation
        accuracy_pct = (1 - test_mae / 4) * 100  # Normalized by rating scale (1-5)
        print(f"🎯 Model Accuracy: {accuracy_pct:.1f}%")

        # Cross-validation score
        if hasattr(self.model, 'feature_importances_'):
            cv_scores = cross_val_score(self.model, X_test, y_test, cv=5, scoring='neg_mean_absolute_error')
            print(f"🎯 CV MAE: {-cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

            # Feature importance
            self._show_feature_importance()

        # Prediction distribution analysis
        print(f"\n📊 Prediction Analysis:")
        print(f"   Actual ratings range: {y_test.min():.1f} - {y_test.max():.1f}")
        print(f"   Predicted range: {test_pred.min():.1f} - {test_pred.max():.1f}")

        return {
            'test_rmse': test_rmse,
            'test_mae': test_mae,
            'test_r2': test_r2,
            'accuracy_pct': accuracy_pct
        }

    def _show_feature_importance(self):
        """Display feature importance for tree-based models"""

        if not hasattr(self.model, 'feature_importances_'):
            return

        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)

        print(f"\n🔍 Top Feature Importance:")
        print("-" * 30)
        for _, row in importance_df.head(8).iterrows():
            print(f"   {row['feature']}: {row['importance']:.3f}")

    def save_trained_model(self, filepath='ml/ev_recommender_model.pkl'): # <-- Path changed here

        if not self.is_trained:
            print("❌ No trained model to save")
            return False

        model_package = {
            'model': self.model,
            'scaler': self.scaler,
            'charger_encoder': self.charger_encoder,
            'feature_names': self.feature_names,
            'training_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'model_type': type(self.model).__name__
        }
        
        # Add this line to ensure the 'ml' directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        joblib.dump(model_package, filepath)
        print(f"💾 Model saved to {filepath}")
        return True

    def load_trained_model(self, filepath='ev_recommender_model.pkl'):
        """Load a pre-trained model"""

        try:
            model_package = joblib.load(filepath)

            self.model = model_package['model']
            self.scaler = model_package['scaler']
            self.charger_encoder = model_package['charger_encoder']
            self.feature_names = model_package['feature_names']
            self.is_trained = True

            print(f"✅ Model loaded from {filepath}")
            print(f"📅 Training date: {model_package.get('training_date', 'Unknown')}")
            print(f"🤖 Model type: {model_package.get('model_type', 'Unknown')}")

            return True

        except FileNotFoundError:
            print(f"❌ Model file not found: {filepath}")
            return False
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False

    def predict_station_rating(self, user_features, station_features):
        """Predict rating for a user-station combination"""

        if not self.is_trained:
            raise Exception("Model not trained! Call train_model() first.")

        # Prepare feature vector
        feature_vector = np.array([
            station_features['distance_km'],
            1 if station_features['distance_km'] < 5 else (2 if station_features['distance_km'] < 15 else 3),  # distance_category
            station_features['available_slots'],
            station_features['total_connections'],
            station_features['max_power_kw'],
            station_features['price_per_kwh'],
            station_features.get('reliability_score', 0.8),
            self.charger_encoder.transform([station_features['charger_type']])[0],
            user_features['battery_capacity'],
            user_features['is_price_sensitive'],
            station_features['available_slots'] / station_features['total_connections'],  # availability_ratio
            station_features['price_per_km'],
            station_features['power_efficiency'],
            station_features['value_score']
        ]).reshape(1, -1)

        # Handle missing time features (set defaults)
        if len(self.feature_names) > 14:  # Has time features
            # Add default time features
            feature_vector = np.append(feature_vector, [[0, 12]], axis=1)  # Not weekend, noon

        # Scale and predict
        feature_vector_scaled = self.scaler.transform(feature_vector)
        predicted_rating = self.model.predict(feature_vector_scaled)[0]

        # Clamp prediction to valid range
        return max(1.0, min(5.0, predicted_rating))

    def compare_algorithms(self):
        """Compare different ML algorithms"""

        print("🔬 Comparing ML Algorithms...")

        # Load data
        stations_df, users_df, bookings_df = self.load_training_data()
        if stations_df is None:
            return

        X, y = self.prepare_training_features(bookings_df, stations_df, users_df)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        algorithms = {
            'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'Linear Regression': LinearRegression(),
        }

        results = {}

        for name, algorithm in algorithms.items():
            print(f"\n🤖 Testing {name}...")

            # Train
            algorithm.fit(X_train_scaled, y_train)

            # Predict
            test_pred = algorithm.predict(X_test_scaled)

            # Evaluate
            rmse = np.sqrt(mean_squared_error(y_test, test_pred))
            mae = mean_absolute_error(y_test, test_pred)
            r2 = r2_score(y_test, test_pred)

            results[name] = {
                'RMSE': rmse,
                'MAE': mae,
                'R²': r2,
                'Accuracy': (1 - mae / 4) * 100
            }

            print(f"   RMSE: {rmse:.3f}")
            print(f"   MAE: {mae:.3f}")
            print(f"   R²: {r2:.3f}")
            print(f"   Accuracy: {(1 - mae / 4) * 100:.1f}%")

        # Select best model
        best_model = min(results.keys(), key=lambda x: results[x]['MAE'])
        print(f"\n🏆 Best Model: {best_model}")

        self.model = algorithms[best_model]
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True

        return results

    def train_final_model(self, algorithm='random_forest'):
        """Train the final model with full dataset"""

        print(f"🚀 Training final {algorithm} model...")

        # Load and prepare data
        stations_df, users_df, bookings_df = self.load_training_data()
        if stations_df is None:
            return False

        X, y = self.prepare_training_features(bookings_df, stations_df, users_df)

        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Select algorithm
        if algorithm == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=300,  # Increased from 150 to 300
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        elif algorithm == 'linear':
            self.model = LinearRegression()

        # Train model
        print("🔥 Training in progress...")
        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        performance = self._evaluate_model(X_train_scaled, X_test_scaled, y_train, y_test)

        self.is_trained = True

        # Save model
        if self.save_trained_model():
            print("✅ Model training completed successfully!")

        return performance

    def analyze_training_data(self):
        """Analyze the training dataset"""

        print("🔍 Analyzing Training Data Quality...")

        stations_df, users_df, bookings_df = self.load_training_data()
        if stations_df is None:
            return

        print(f"\n📊 Dataset Statistics:")
        print(f"   Cities covered: {stations_df['source_city'].nunique()}")
        print(f"   Station types: {stations_df['charger_category'].value_counts().to_dict()}")
        print(f"   Price range: ₹{stations_df['simulated_price_per_kwh'].min():.1f} - ₹{stations_df['simulated_price_per_kwh'].max():.1f}")

        print(f"\n👥 User Distribution:")
        print(f"   Battery sizes: {users_df['battery_capacity_kwh'].value_counts().to_dict()}")
        print(f"   Price sensitive: {users_df['is_price_sensitive'].value_counts().to_dict()}")

        print(f"\n📈 Booking Patterns:")
        print(f"   Rating distribution: {bookings_df['user_rating'].value_counts().sort_index().to_dict()}")
        print(f"   Success rate: {bookings_df['booking_completed'].mean():.1%}")
        print(f"   Avg distance: {bookings_df['distance_km'].mean():.2f} km")

def main():
    """Main training workflow"""

    print("🤖 EV Recommendation Model Training")
    print("=" * 50)

    trainer = EVRecommendationModelTrainer()

    # Option 1: Analyze data first
    trainer.analyze_training_data()

    # Option 2: Compare algorithms
    print("\n🔬 Comparing algorithms...")
    results = trainer.compare_algorithms()

    # Option 3: Train final model
    print("\n🎯 Training final model...")
    performance = trainer.train_final_model(algorithm='random_forest')

    if performance:
        print(f"\n🎉 Training Complete!")
        print(f"   Final Test Accuracy: {performance['accuracy_pct']:.1f}%")
        print(f"   Model ready for recommendations!")

if __name__ == "__main__":
    main()