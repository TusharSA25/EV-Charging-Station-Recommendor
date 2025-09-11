/**
 * Utility functions for processing and filtering charging station data
 */

/**
 * Transform raw OpenChargeMap station data to our app format
 * @param {Array} rawStations - Raw station data from OpenChargeMap API
 * @returns {Array} Transformed station data
 */
const transformStationData = (rawStations) => {
  return rawStations.map(station => {
    // Get the primary connection (highest power rating)
    const connections = station.Connections || [];
    const primaryConnection = connections.reduce((prev, current) => {
      const prevPower = prev?.PowerKW || 0;
      const currentPower = current?.PowerKW || 0;
      return currentPower > prevPower ? current : prev;
    }, connections[0] || {});

    // Determine if it's fast charging (50kW or higher)
    const maxPowerKW = primaryConnection?.PowerKW || 0;
    const fast_charging = maxPowerKW >= 50;

    // Get operator name
    const operator = station.OperatorInfo?.Title || 'Unknown';

    // Calculate estimated usage cost (simplified calculation)
    const usage_cost = calculateUsageCost(maxPowerKW, station.UsageType);

    // Get access type
    const access_type = getAccessType(station.UsageType);

    // Format address
    const address = formatAddress(station.AddressInfo);

    // Calculate distance if coordinates are available
    const distance = station.AddressInfo?.Distance || 0;

    return {
      id: station.ID,
      name: station.AddressInfo?.Title || `Charging Station ${station.ID}`,
      operator: operator,
      latitude: station.AddressInfo?.Latitude,
      longitude: station.AddressInfo?.Longitude,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      usage_cost: usage_cost,
      access_type: access_type,
      address: address,
      fast_charging: fast_charging,
      max_power_kw: maxPowerKW,
      connection_type: primaryConnection?.ConnectionType?.Title || 'Unknown',
      total_connections: connections.length,
      status: station.StatusType?.Title || 'Unknown',
      last_verified: station.DateLastVerified,
      // Additional useful data
      phone: station.AddressInfo?.ContactTelephone1,
      website: station.AddressInfo?.RelatedURL,
      operator_website: station.OperatorInfo?.WebsiteURL,
      comments: station.GeneralComments,
      // Raw data for ML model
      raw_data: {
        usage_type_id: station.UsageType?.ID,
        status_type_id: station.StatusType?.ID,
        operator_id: station.OperatorInfo?.ID,
        connection_types: connections.map(c => c.ConnectionType?.ID),
        power_ratings: connections.map(c => c.PowerKW)
      }
    };
  }).filter(station => station.latitude && station.longitude); // Filter out stations without coordinates
};

/**
 * Filter stations based on user preferences
 * @param {Array} stations - Array of transformed stations
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered stations
 */
const filterStations = (stations, filters) => {
  const {
    budget,
    preferred_operator,
    fast_charging_only,
    public_access_only
  } = filters;

  return stations.filter(station => {
    // Budget filter
    if (budget && station.usage_cost > budget) {
      return false;
    }

    // Operator filter
    if (preferred_operator && 
        !station.operator.toLowerCase().includes(preferred_operator.toLowerCase())) {
      return false;
    }

    // Fast charging filter
    if (fast_charging_only && !station.fast_charging) {
      return false;
    }

    // Public access filter
    if (public_access_only && station.access_type !== 'Public') {
      return false;
    }

    // Status filter - only operational stations
    if (station.status !== 'Operational' && station.status !== 'Unknown') {
      return false;
    }

    return true;
  });
};

/**
 * Calculate estimated usage cost for a charging session
 * @param {number} powerKW - Power rating in kW
 * @param {Object} usageType - Usage type object from OpenChargeMap
 * @returns {number} Estimated cost in dollars
 */
const calculateUsageCost = (powerKW, usageType) => {
  // Default cost per kWh (varies by region and operator)
  const baseCostPerKWh = 0.25; // $0.25 per kWh
  
  // Typical charging session (30 minutes for estimation)
  const chargingTimeHours = 0.5;
  
  // Calculate energy consumed
  const energyKWh = (powerKW || 22) * chargingTimeHours; // Default to 22kW if power not specified
  
  // Apply multipliers based on usage type
  let multiplier = 1.0;
  
  if (usageType) {
    switch (usageType.Title?.toLowerCase()) {
      case 'public':
        multiplier = 1.0;
        break;
      case 'private - restricted access':
        multiplier = 1.2;
        break;
      case 'privately owned - notice required':
        multiplier = 1.1;
        break;
      case 'public - membership required':
        multiplier = 0.9;
        break;
      default:
        multiplier = 1.0;
    }
  }
  
  // Fast charging premium
  if (powerKW >= 150) {
    multiplier *= 1.3; // 30% premium for ultra-fast charging
  } else if (powerKW >= 50) {
    multiplier *= 1.1; // 10% premium for fast charging
  }
  
  const totalCost = energyKWh * baseCostPerKWh * multiplier;
  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
};

/**
 * Get human-readable access type
 * @param {Object} usageType - Usage type object from OpenChargeMap
 * @returns {string} Access type string
 */
const getAccessType = (usageType) => {
  if (!usageType || !usageType.Title) {
    return 'Unknown';
  }

  const title = usageType.Title.toLowerCase();
  
  if (title.includes('public')) {
    return 'Public';
  } else if (title.includes('private')) {
    return 'Private';
  } else if (title.includes('restricted')) {
    return 'Restricted';
  } else if (title.includes('membership')) {
    return 'Membership';
  } else {
    return 'Unknown';
  }
};

/**
 * Format address from OpenChargeMap address info
 * @param {Object} addressInfo - Address info object from OpenChargeMap
 * @returns {string} Formatted address string
 */
const formatAddress = (addressInfo) => {
  if (!addressInfo) return 'Address not available';

  const parts = [];
  
  if (addressInfo.AddressLine1) parts.push(addressInfo.AddressLine1);
  if (addressInfo.AddressLine2) parts.push(addressInfo.AddressLine2);
  if (addressInfo.Town) parts.push(addressInfo.Town);
  if (addressInfo.StateOrProvince) parts.push(addressInfo.StateOrProvince);
  if (addressInfo.Postcode) parts.push(addressInfo.Postcode);
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
           Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
           Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Validate station data
 * @param {Object} station - Station object
 * @returns {boolean} True if station data is valid
 */
const isValidStation = (station) => {
  return station &&
         station.name &&
         station.latitude &&
         station.longitude &&
         station.operator &&
         typeof station.distance === 'number' &&
         typeof station.usage_cost === 'number';
};

/**
 * Sort stations by multiple criteria
 * @param {Array} stations - Array of stations
 * @param {Object} sortCriteria - Sorting criteria
 * @returns {Array} Sorted stations
 */
const sortStations = (stations, sortCriteria = {}) => {
  const {
    primary = 'distance', // distance, cost, rating, power
    secondary = 'cost',
    direction = 'asc' // asc or desc
  } = sortCriteria;

  return [...stations].sort((a, b) => {
    // Primary sort
    let comparison = 0;
    
    switch (primary) {
      case 'distance':
        comparison = a.distance - b.distance;
        break;
      case 'cost':
        comparison = a.usage_cost - b.usage_cost;
        break;
      case 'rating':
        comparison = (b.predicted_rating || 0) - (a.predicted_rating || 0);
        break;
      case 'power':
        comparison = (b.max_power_kw || 0) - (a.max_power_kw || 0);
        break;
      default:
        comparison = a.distance - b.distance;
    }

    // If primary comparison is equal, use secondary criteria
    if (comparison === 0) {
      switch (secondary) {
        case 'distance':
          comparison = a.distance - b.distance;
          break;
        case 'cost':
          comparison = a.usage_cost - b.usage_cost;
          break;
        case 'rating':
          comparison = (b.predicted_rating || 0) - (a.predicted_rating || 0);
          break;
        case 'power':
          comparison = (b.max_power_kw || 0) - (a.max_power_kw || 0);
          break;
      }
    }

    return direction === 'desc' ? -comparison : comparison;
  });
};

/**
 * Group stations by operator
 * @param {Array} stations - Array of stations
 * @returns {Object} Grouped stations by operator
 */
const groupStationsByOperator = (stations) => {
  return stations.reduce((groups, station) => {
    const operator = station.operator;
    if (!groups[operator]) {
      groups[operator] = [];
    }
    groups[operator].push(station);
    return groups;
  }, {});
};

/**
 * Get statistics for a set of stations
 * @param {Array} stations - Array of stations
 * @returns {Object} Statistics object
 */
const getStationStats = (stations) => {
  if (!stations || stations.length === 0) {
    return {
      total_stations: 0,
      avg_distance: 0,
      avg_cost: 0,
      avg_power: 0,
      fast_charging_count: 0,
      public_access_count: 0,
      operators: []
    };
  }

  const total = stations.length;
  const distances = stations.map(s => s.distance);
  const costs = stations.map(s => s.usage_cost);
  const powers = stations.map(s => s.max_power_kw || 0);
  const operators = [...new Set(stations.map(s => s.operator))];

  return {
    total_stations: total,
    avg_distance: Math.round((distances.reduce((a, b) => a + b, 0) / total) * 10) / 10,
    avg_cost: Math.round((costs.reduce((a, b) => a + b, 0) / total) * 100) / 100,
    avg_power: Math.round((powers.reduce((a, b) => a + b, 0) / total) * 10) / 10,
    fast_charging_count: stations.filter(s => s.fast_charging).length,
    public_access_count: stations.filter(s => s.access_type === 'Public').length,
    operators: operators.sort(),
    operator_count: operators.length
  };
};

module.exports = {
  transformStationData,
  filterStations,
  calculateUsageCost,
  getAccessType,
  formatAddress,
  calculateDistance,
  isValidStation,
  sortStations,
  groupStationsByOperator,
  getStationStats
};