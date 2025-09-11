const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/recommendationController');
const { validateRecommendationRequest } = require('../middleware/validation');

/**
 * @route   POST /api/recommend
 * @desc    Get EV station recommendations based on user preferences
 * @access  Public
 * @body    {
 *   latitude: number (required) - User's latitude
 *   longitude: number (required) - User's longitude  
 *   max_distance: number (optional) - Maximum distance in km (default: 10)
 *   budget: number (optional) - Budget in dollars (default: 50)
 *   preferred_operator: string (optional) - Preferred charging operator
 *   fast_charging_only: number (optional) - 1 for fast charging only, 0 for all (default: 0)
 *   public_access_only: number (optional) - 1 for public only, 0 for all (default: 0)
 * }
 * @returns {Array} Array of recommended charging stations
 */
router.post('/recommend', validateRecommendationRequest, getRecommendations);

/**
 * @route   GET /api/operators
 * @desc    Get list of available charging operators
 * @access  Public
 */
router.get('/operators', (req, res) => {
  // Common operators - this could be fetched from OpenChargeMap API
  const operators = [
    'Tesla',
    'ChargePoint',
    'EVgo',
    'Electrify America',
    'Blink',
    'SemaConnect',
    'Volta',
    'Shell Recharge'
  ];
  
  res.json({ operators });
});

module.exports = router;