/**
 * Validation middleware for API requests
 */

/**
 * Validate recommendation request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateRecommendationRequest = (req, res, next) => {
  const {
    latitude,
    longitude,
    max_distance,
    budget,
    preferred_operator,
    fast_charging_only,
    public_access_only
  } = req.body;

  const errors = [];

  // Required fields validation
  if (!latitude) {
    errors.push('Latitude is required');
  } else if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    errors.push('Latitude must be a number between -90 and 90');
  }

  if (!longitude) {
    errors.push('Longitude is required');
  } else if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    errors.push('Longitude must be a number between -180 and 180');
  }

  // Optional fields validation
  if (max_distance !== undefined) {
    if (typeof max_distance !== 'number' || max_distance <= 0 || max_distance > 1000) {
      errors.push('Max distance must be a positive number not exceeding 1000 km');
    }
  }

  if (budget !== undefined) {
    if (typeof budget !== 'number' || budget < 0 || budget > 1000) {
      errors.push('Budget must be a non-negative number not exceeding $1000');
    }
  }

  if (preferred_operator !== undefined) {
    if (typeof preferred_operator !== 'string' || preferred_operator.length > 100) {
      errors.push('Preferred operator must be a string not exceeding 100 characters');
    }
  }

  if (fast_charging_only !== undefined) {
    if (typeof fast_charging_only !== 'number' || (fast_charging_only !== 0 && fast_charging_only !== 1)) {
      errors.push('Fast charging only must be 0 or 1');
    }
  }

  if (public_access_only !== undefined) {
    if (typeof public_access_only !== 'number' || (public_access_only !== 0 && public_access_only !== 1)) {
      errors.push('Public access only must be 0 or 1');
    }
  }

  // If there are validation errors, return them
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Set defaults for optional parameters
  req.body.max_distance = max_distance || 10;
  req.body.budget = budget || 50;
  req.body.preferred_operator = preferred_operator || '';
  req.body.fast_charging_only = fast_charging_only || 0;
  req.body.public_access_only = public_access_only || 0;

  next();
};

/**
 * Validate coordinate parameters (for general use)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Validation result
 */
const validateCoordinates = (lat, lon) => {
  const errors = [];

  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    errors.push('Invalid latitude: must be a number between -90 and 90');
  }

  if (typeof lon !== 'number' || lon < -180 || lon > 180) {
    errors.push('Invalid longitude: must be a number between -180 and 180');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, maxLength = 255) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\\/g, ''); // Remove backslashes
};

/**
 * Validate and sanitize operator name
 * @param {string} operator - Operator name
 * @returns {string} Sanitized operator name
 */
const sanitizeOperator = (operator) => {
  if (!operator || typeof operator !== 'string') {
    return '';
  }

  // Allow only alphanumeric characters, spaces, and common punctuation
  return operator
    .trim()
    .replace(/[^a-zA-Z0-9\s\-&.]/g, '')
    .substring(0, 50);
};

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} Validation result
 */
const validateNumericRange = (value, min, max, fieldName) => {
  if (value === undefined || value === null) {
    return { isValid: true, error: null };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (value > max) {
    return { isValid: false, error: `${fieldName} must not exceed ${max}` };
  }

  return { isValid: true, error: null };
};

/**
 * Rate limiting validation (simple in-memory implementation)
 * Note: In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map();

const validateRateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = parseInt(process.env.API_RATE_LIMIT) || 100;

  // Get or create rate limit data for this IP
  let clientData = rateLimitStore.get(clientIP);
  
  if (!clientData) {
    clientData = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(clientIP, clientData);
  }

  // Reset count if window has expired
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }

  // Check if rate limit exceeded
  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Maximum ${maxRequests} requests per 15 minutes.`,
      resetTime: new Date(clientData.resetTime).toISOString()
    });
  }

  // Increment request count
  clientData.count++;

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': Math.max(0, maxRequests - clientData.count),
    'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
  });

  next();
};

/**
 * Clean up expired rate limit entries (call this periodically)
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
};

// Clean up rate limit store every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);

module.exports = {
  validateRecommendationRequest,
  validateCoordinates,
  sanitizeString,
  sanitizeOperator,
  validateNumericRange,
  validateRateLimit
};