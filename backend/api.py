from flask import Flask, request, jsonify, send_from_directory
import sys
import os

# Add the parent directory of the current file to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from ml.trainModel import EVRecommendationModelTrainer  # Adjusted import

app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")

# Initialize the model trainer
trainer = EVRecommendationModelTrainer()

# Debugging information
print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Python path:", sys.path)

try:
    import seaborn as sns
    print("Seaborn imported successfully!")
except ModuleNotFoundError as e:
    print("Error importing seaborn:", e)

@app.route('/train', methods=['POST'])
def train_model():
    """
    Endpoint to train the model.
    Request Body:
        {
            "algorithm": "random_forest"  # or "linear"
        }
    """
    data = request.get_json()
    algorithm = data.get('algorithm', 'random_forest')

    try:
        print(f"🚀 Training model with algorithm: {algorithm}")
        performance = trainer.train_final_model(algorithm=algorithm)
        if performance:
            return jsonify({
                "message": "Model trained successfully!",
                "performance": performance
            }), 200
        else:
            return jsonify({"message": "Model training failed!"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict_rating():
    """
    Endpoint to predict station rating.
    Request Body:
        {
            "user_features": { ... },
            "station_features": { ... }
        }
    """
    data = request.get_json()
    user_features = data.get('user_features')
    station_features = data.get('station_features')

    if not trainer.is_trained:
        return jsonify({"error": "Model is not trained yet!"}), 400

    try:
        predicted_rating = trainer.predict_station_rating(user_features, station_features)
        return jsonify({"predicted_rating": predicted_rating}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def model_status():
    """
    Endpoint to check if the model is trained.
    """
    return jsonify({"is_trained": trainer.is_trained}), 200

@app.route('/')
def serve():
    """
    Serve the main webpage.
    """
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    """
    Handle 404 errors by serving the index.html file.
    """
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
