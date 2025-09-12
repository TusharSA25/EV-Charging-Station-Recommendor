const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Machine Learning service for getting station recommendations
 * This service calls a Python ML model to rank and score stations
 */

const ML_MODEL_PATH = process.env.ML_MODEL_PATH || './ml/ev_recommender_model.pkl';
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';

/**
 * Get ML-based recommendations for charging stations
 * @param {Object} params - Parameters for ML model
 * @param {Array} params.stations - Array of stations to rank
 * @param {Object} params.user_preferences - User preferences for recommendation
 * @returns {Array} Array of ranked stations with predicted ratings
 */
const getMLRecommendations = async ({ stations, user_preferences }) => {
  try {
    console.log('🤖 Starting ML recommendation process...');

    // Check if ML model exists
    const modelExists = fs.existsSync(ML_MODEL_PATH);
    
    if (!modelExists) {
      console.log('⚠️  ML model not found, using fallback scoring...');
      return getFallbackRecommendations(stations, user_preferences);
    }

    // Prepare data for Python ML script
    const mlInput = {
      stations: stations,
      user_preferences: user_preferences,
      timestamp: new Date().toISOString()
    };

    // Call Python ML script
    const recommendations = await callPythonMLScript(mlInput);
    
    console.log(`✅ ML model returned ${recommendations.length} recommendations`);
    return recommendations;

  } catch (error) {
    console.error('❌ ML Service Error:', error.message);
    console.log('🔄 Falling back to rule-based recommendations...');
    
    // Fallback to rule-based recommendations if ML fails
    return getFallbackRecommendations(stations, user_preferences);
  }
};

/**
 * Call Python ML script to get recommendations
 * @param {Object} inputData - Data to send to Python script
 * @returns {Promise<Array>} Promise resolving to array of recommendations
 */
const callPythonMLScript = (inputData) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../ml/recommend.py');
    
    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('Python ML script not found'));
      return;
    }

    console.log(`🐍 Calling Python script: ${scriptPath}`);

    const pythonProcess = spawn(PYTHON_PATH, [scriptPath]);
    
    let outputData = '';
    let errorData = '';

    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    // Collect output data
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect error data
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse ML script output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python ML script failed with code ${code}: ${errorData}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // Set timeout for Python process (30 seconds)
    const timeout = setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      reject(new Error('Python ML script timeout'));
    }, 60000);

    pythonProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
};

/**
 * Fallback recommendation system using rule-based scoring
 * This is used when ML model is not available or fails
 * @param {Array} stations - Array of stations
 * @param {Object} user_preferences - User preferences
 * @returns {Array} Array of scored and sorted stations
 */
const getFallbackRecommendations = (stations, user_preferences) => {
  console.log('🔧 Using fallback rule-based recommendations...');

  const {
    latitude,
    longitude,
    budget,
    preferred_operator,
    fast_charging_only,
    public_access_only
  } = user_preferences;

  return stations.map(station => {
    let score = 0;
    
    // Distance scoring (closer is better) - 40% weight
    const distanceScore = Math.max(0, (20 - station.distance) / 20) * 40;
    score += distanceScore;

    // Cost scoring (cheaper is better, within budget) - 25% weight
    if (station.usage_cost <= budget) {
      const costScore = Math.max(0, (budget - station.usage_cost) / budget) * 25;
      score += costScore;
    } else {
      score -= 10; // Penalty for exceeding budget
    }

    // Operator preference - 15% weight
    if (preferred_operator && 
        station.operator.toLowerCase().includes(preferred_operator.toLowerCase())) {
      score += 15;
    }

    // Access type preference - 10% weight
    if (station.access_type === 'Public') {
      score += 10;
    }

    // Fast charging bonus - 10% weight
    if (station.fast_charging) {
      score += 10;
    }

    // Normalize score to rating (1-5 scale)
    const predicted_rating = Math.min(5, Math.max(1, (score / 100) * 4 + 1));

    return {
      ...station,
      predicted_rating: Math.round(predicted_rating * 10) / 10, // Round to 1 decimal
      recommendation_score: score
    };
  })
  .sort((a, b) => b.recommendation_score - a.recommendation_score); // Sort by score descending
};

/**
 * Validate ML model availability
 * @returns {boolean} True if ML model is available
 */
const isMLModelAvailable = () => {
  return fs.existsSync(ML_MODEL_PATH);
};

/**
 * Get ML model status information
 * @returns {Object} Status information about the ML model
 */
const getMLModelStatus = () => {
  const modelExists = fs.existsSync(ML_MODEL_PATH);
  const scriptExists = fs.existsSync(path.join(__dirname, '../ml/recommend.py'));

  return {
    model_available: modelExists,
    script_available: scriptExists,
    model_path: ML_MODEL_PATH,
    python_path: PYTHON_PATH,
    fallback_active: !modelExists || !scriptExists
  };
};

module.exports = {
  getMLRecommendations,
  getFallbackRecommendations,
  isMLModelAvailable,
  getMLModelStatus
};