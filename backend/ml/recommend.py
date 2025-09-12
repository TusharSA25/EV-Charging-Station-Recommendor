"""
EV Station Recommender - Prediction Script
Called by the Node.js backend to get ML-based recommendations.
"""

import sys
import json
import pandas as pd
import numpy as np
import joblib
# import sklearn
# Add these three lines for debugging
# print(f"DEBUG: Python Executable Path: {sys.executable}", file=sys.stderr)
# print(f"DEBUG: Scikit-learn Version Used: {sklearn.__version__}", file=sys.stderr)
# sys.stdout.flush() # Ensures the output is sent immediately

import json
# --- Configuration ---
# This path should be relative to where the Node.js process is started,
# or an absolute path. The default in mlService.js is './ml/ev_recommender_model.pkl'.
MODEL_PATH ='./ml/ev_recommender_model.pkl'

def load_model(path):
    """Load the trained model package from a .pkl file."""
    try:
        model_package = joblib.load(path)
        return model_package
    except FileNotFoundError:
        print_error(f"Error: Model file not found at {path}", file=sys.stderr)
        return None
    except Exception as e:
        print_error(f"Error loading model: {e}", file=sys.stderr)
        return None

def predict_ratings(model_package, stations_df, user_prefs):
    """
    Predict user ratings for a list of stations.

    Args:
        model_package (dict): The loaded model, scaler, and encoder.
        stations_df (pd.DataFrame): DataFrame of candidate stations.
        user_prefs (dict): Dictionary of user preferences.

    Returns:
        list: A list of station dictionaries with 'predicted_rating' added.
    """
    if stations_df.empty:
        return []

    model = model_package['model']
    scaler = model_package['scaler']
    charger_encoder = model_package['charger_encoder']
    feature_names = model_package['feature_names']

    # --- 1. Simulate Real-Time Data ---
    # The model was trained with simulated data for availability and reliability.
    # We must generate similar data here for consistency.
    np.random.seed(42) # Use a fixed seed for reproducibility in a given request
    stations_df['available_slots'] = np.random.randint(0, stations_df['total_connections'] + 1)
    stations_df['reliability_score'] = np.random.uniform(0.75, 0.95, len(stations_df))

    # --- 2. Prepare Feature Matrix ---
    features = pd.DataFrame()
    
    # Map input data to expected feature names
    features['distance_km'] = stations_df['distance']
    features['available_slots'] = stations_df['available_slots']
    features['total_connections'] = stations_df['total_connections']
    features['max_power_kw'] = stations_df['max_power_kw']
    features['price_per_kwh'] = stations_df['usage_cost']
    features['reliability_score'] = stations_df['reliability_score']

    # Encode categorical feature
    features['charger_type_encoded'] = charger_encoder.transform(stations_df['charger_category'])

    # User features (use defaults if not provided)
    features['battery_capacity'] = user_prefs.get('battery_capacity_kwh', 45) # Default: 45 kWh
    features['is_price_sensitive'] = user_prefs.get('is_price_sensitive', 0) # Default: No

    # --- 3. Engineer Features (must match training script) ---
    features['distance_category'] = pd.cut(features['distance_km'], bins=[0, 5, 15, 100], labels=[1, 2, 3], include_lowest=True).astype(float)
    features['availability_ratio'] = (features['available_slots'] / features['total_connections']).fillna(0)
    features['price_per_km'] = features['price_per_kwh'] * features['distance_km']
    features['power_efficiency'] = (features['max_power_kw'] / features['price_per_kwh']).replace([np.inf, -np.inf], 0).fillna(0)
    features['value_score'] = (features['power_efficiency'] * features['availability_ratio']).fillna(0)

    # Handle time-based features if the model expects them
    if 'is_weekend' in feature_names and 'hour_of_day' in feature_names:
        features['is_weekend'] = 0 # Default to weekday
        features['hour_of_day'] = 14 # Default to 2 PM

    # --- 4. Scale and Predict ---
    # Ensure columns are in the same order as during training
    try:
        features = features[feature_names]
    except KeyError as e:
        print_error(f"Missing feature in prediction script: {e}")
        return []

    X_scaled = scaler.transform(features)
    predicted_ratings = model.predict(X_scaled)
    
    # Clamp predictions to a valid 1-5 range
    predicted_ratings = np.clip(predicted_ratings, 1, 5)

    # --- 5. Format Output ---
    stations_df['predicted_rating'] = np.round(predicted_ratings, 2)
    
    # Return a sorted list of dictionaries
    results = stations_df.sort_values('predicted_rating', ascending=False).to_dict('records')
    return results

def main():
    """Main execution function."""
    try:
        # Read input data from stdin
        input_data = json.load(sys.stdin)
        
        stations = input_data.get('stations', [])
        user_preferences = input_data.get('user_preferences', {})

        if not stations:
            print(json.dumps([]))
            return
            
        stations_df = pd.DataFrame(stations)

        # Load the model
        model_package = load_model(MODEL_PATH)
        if not model_package:
            sys.exit(1) # Exit with error code

        # Get recommendations
        recommendations = predict_ratings(model_package, stations_df, user_preferences)
        
        # Print final JSON output to stdout
        print(json.dumps(recommendations))

    except json.JSONDecodeError:
        print_error("Error: Invalid JSON received from Node.js.")
        sys.exit(1)
    except Exception as e:
        print_error(f"An unexpected error occurred: {e}")
        sys.exit(1)

def print_error(*args, **kwargs):
    """Helper to print errors to stderr."""
    print(*args, file=sys.stderr, **kwargs)

if __name__ == "__main__":
    main()