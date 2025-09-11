const axios = require('axios');

/**
 * OpenChargeMap API service for fetching EV charging station data
 * Documentation: https://openchargemap.org/site/develop/api
 */

const BASE_URL = process.env.OPENCHARGEMAP_BASE_URL || 'https://api.openchargemap.io/v3';
const API_KEY = process.env.OPENCHARGEMAP_API_KEY;

// Create axios instance with default config
const openChargeMapAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY })
  }
});

/**
 * Fetch nearby charging stations from OpenChargeMap API
 * @param {Object} params - Search parameters
 * @param {number} params.latitude - Latitude coordinate
 * @param {number} params.longitude - Longitude coordinate  
 * @param {number} params.max_distance - Maximum distance in km
 * @param {boolean} params.fast_charging_only - Filter for fast charging only
 * @param {boolean} params.public_access_only - Filter for public access only
 * @returns {Array} Array of charging stations
 */
const fetchNearbyStations = async ({
  latitude,
  longitude,
  max_distance = 10,
  fast_charging_only = false,
  public_access_only = false
}) => {
  try {
    console.log(`🌐 Calling OpenChargeMap API for location: ${latitude}, ${longitude}`);

    const params = {
      latitude,
      longitude,
      distance: max_distance,
      distanceunit: 'KM',
      maxresults: 100, // Limit results for performance
      compact: false, // Get full details
      verbose: false,
      includecomments: false,
      // Status filters
      statustype: '(operational)', // Only operational stations
      // Access type filter
      ...(public_access_only && { usagetype: '(public)' }),
      // Connection type filters for fast charging
      ...(fast_charging_only && { 
        minpowerkw: 50 // Minimum 50kW for fast charging
      })
    };

    const response = await openChargeMapAPI.get('/poi/', { params });

    console.log(`✅ OpenChargeMap API returned ${response.data.length} stations`);
    return response.data;

  } catch (error) {
    console.error('❌ OpenChargeMap API Error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('OpenChargeMap API timeout. Please try again.');
    } else if (error.response) {
      // API returned an error response
      const { status, data } = error.response;
      throw new Error(`OpenChargeMap API error (${status}): ${data.message || 'Unknown error'}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('OpenChargeMap API is not responding. Please try again later.');
    } else {
      // Something else happened
      throw new Error(`OpenChargeMap API error: ${error.message}`);
    }
  }
};

/**
 * Get available operators from OpenChargeMap
 * @returns {Array} Array of operators
 */
const fetchOperators = async () => {
  try {
    console.log('🏢 Fetching operators from OpenChargeMap API...');
    
    const response = await openChargeMapAPI.get('/operators/');
    
    const operators = response.data
      .filter(op => op.IsPrivateIndividual === false) // Filter out private individuals
      .map(op => ({
        id: op.ID,
        title: op.Title,
        website: op.WebsiteURL,
        isRestrictedEdit: op.IsRestrictedEdit
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically

    console.log(`✅ Fetched ${operators.length} operators`);
    return operators;

  } catch (error) {
    console.error('❌ Error fetching operators:', error.message);
    throw new Error(`Failed to fetch operators: ${error.message}`);
  }
};

/**
 * Get connection types (connector types) from OpenChargeMap
 * @returns {Array} Array of connection types
 */
const fetchConnectionTypes = async () => {
  try {
    console.log('🔌 Fetching connection types from OpenChargeMap API...');
    
    const response = await openChargeMapAPI.get('/connectiontypes/');
    
    const connectionTypes = response.data
      .map(ct => ({
        id: ct.ID,
        title: ct.Title,
        formalName: ct.FormalName,
        isDiscontinued: ct.IsDiscontinued,
        isObsolete: ct.IsObsolete
      }))
      .filter(ct => !ct.isDiscontinued && !ct.isObsolete) // Filter out discontinued/obsolete
      .sort((a, b) => a.title.localeCompare(b.title));

    console.log(`✅ Fetched ${connectionTypes.length} connection types`);
    return connectionTypes;

  } catch (error) {
    console.error('❌ Error fetching connection types:', error.message);
    throw new Error(`Failed to fetch connection types: ${error.message}`);
  }
};

module.exports = {
  fetchNearbyStations,
  fetchOperators,
  fetchConnectionTypes
};