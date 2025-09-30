// controllers/recommendationController.js

const { fetchNearbyStations } = require('../services/openChargeMapService');
const { getMLRecommendations } = require('../services/mlService');
const { filterStations, transformStationData, cacheStations } = require('../utils/stationUtils');
const Station = require('../models/Station'); // 👈 Import the Station model

// Define how old data can be before we refresh it (e.g., 24 hours)
const CACHE_TTL_HOURS = 24;

const getRecommendations = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      max_distance = 10,
      // ... (rest of your request body params)
      budget = 50,
      preferred_operator,
      fast_charging_only = 0,
      public_access_only = 0
    } = req.body;

    console.log(`🔍 Fetching recommendations for location: ${latitude}, ${longitude}`);

    // --- CACHING LOGIC START ---
    const stale_after_date = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);

    // 1. Check the cache first using a geospatial query
    console.log('🌍 Checking local database for stations...');
    let stationsFromDB = await Station.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: max_distance * 1000 // Convert km to meters
        }
      },
      last_updated: { $gte: stale_after_date } // Only get fresh data
    });

    let rawStations = [];

    // 2. Cache Miss or Stale Data? Fetch from API.
    if (stationsFromDB.length === 0) {
      console.log('🟡 Cache miss or stale. Fetching from OpenChargeMap API...');
      const apiStations = await fetchNearbyStations({ latitude, longitude, max_distance });
      
      if (apiStations && apiStations.length > 0) {
        // Asynchronously cache the new data without blocking the user's request
        cacheStations(apiStations).catch(console.error);
        rawStations = apiStations;
      }
    } else {
      console.log(`🟢 Cache hit! Found ${stationsFromDB.length} stations in the database.`);
      // If we have a cache hit, we can use the DB data directly.
      // We set rawStations to the format the rest of our app expects.
      rawStations = stationsFromDB.map(s => ({
        ID: s.station_id,
        AddressInfo: {
            Title: s.name,
            Latitude: s.location.coordinates[1],
            Longitude: s.location.coordinates[0],
            // You can add more address fields here if needed
        },
        OperatorInfo: { Title: s.operator },
        StatusType: { Title: s.status },
        Connections: s.connection_types.map(ct => ({ ConnectionType: { Title: ct }, PowerKW: s.max_power_kw }))
      }));
    }
    // --- CACHING LOGIC END ---

    if (!rawStations || rawStations.length === 0) {
      return res.status(200).json({ message: 'No stations found in the specified area', stations: [] });
    }

    console.log(`🔧 Processing ${rawStations.length} stations...`);
    let processedStations = transformStationData(rawStations);
    
    processedStations = filterStations(processedStations, {
      budget,
      preferred_operator,
      fast_charging_only: Boolean(fast_charging_only),
      public_access_only: Boolean(public_access_only)
    });

    if (processedStations.length === 0) {
      return res.status(200).json({ message: 'No stations match your criteria', stations: [] });
    }

    console.log('🤖 Getting ML recommendations...');
    const recommendations = await getMLRecommendations({
      stations: processedStations,
      user_preferences: { /* ... user preferences */ }
    });

    res.status(200).json(recommendations.slice(0, 20));

  } catch (error) {
    console.error('❌ Error in getRecommendations:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  getRecommendations
};