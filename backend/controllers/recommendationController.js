const { fetchNearbyStations } = require('../services/openChargeMapService');
const { getMLRecommendations } = require('../services/mlService');
const { filterStations, transformStationData } = require('../utils/stationUtils');

/**
 * Get EV station recommendations based on user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecommendations = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      max_distance = 10,
      budget = 50,
      preferred_operator,
      fast_charging_only = 0,
      public_access_only = 0
    } = req.body;

    console.log(`🔍 Fetching recommendations for location: ${latitude}, ${longitude}`);

    // Step 1: Fetch nearby stations from OpenChargeMap
    console.log('📡 Fetching stations from OpenChargeMap API...');
    const rawStations = await fetchNearbyStations({
      latitude,
      longitude,
      max_distance,
      fast_charging_only: Boolean(fast_charging_only),
      public_access_only: Boolean(public_access_only)
    });

    if (!rawStations || rawStations.length === 0) {
      return res.status(200).json({
        message: 'No stations found in the specified area',
        stations: []
      });
    }

    console.log(`📍 Found ${rawStations.length} stations from API`);

    // Step 2: Transform and filter stations
    console.log('🔧 Processing and filtering stations...');
    let processedStations = transformStationData(rawStations);
    
    processedStations = filterStations(processedStations, {
      budget,
      preferred_operator,
      fast_charging_only: Boolean(fast_charging_only),
      public_access_only: Boolean(public_access_only)
    });

    console.log(`✅ ${processedStations.length} stations after filtering`);

    if (processedStations.length === 0) {
      return res.status(200).json({
        message: 'No stations match your criteria',
        stations: []
      });
    }

    // Step 3: Get ML-based recommendations
    console.log('🤖 Getting ML recommendations...');
    const recommendations = await getMLRecommendations({
      stations: processedStations,
      user_preferences: {
        latitude,
        longitude,
        max_distance,
        budget,
        preferred_operator,
        fast_charging_only,
        public_access_only
      }
    });

    console.log(`🎯 Returning ${recommendations.length} recommendations`);

    // Step 4: Return top recommendations (limit to 20 for performance)
    const topRecommendations = recommendations.slice(0, 20);

    res.status(200).json(topRecommendations);

  } catch (error) {
    console.error('❌ Error in getRecommendations:', error);
    
    // Provide different error messages based on error type
    if (error.message.includes('OpenChargeMap')) {
      res.status(503).json({
        error: 'Unable to fetch station data. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else if (error.message.includes('ML model')) {
      res.status(500).json({
        error: 'Recommendation system temporarily unavailable. Showing filtered results.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      res.status(500).json({
        error: 'Internal server error. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = {
  getRecommendations
};