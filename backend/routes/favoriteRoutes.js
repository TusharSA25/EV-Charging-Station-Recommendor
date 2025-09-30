// routes/favoriteRoutes.js
const express = require('express');
const router = express.Router();
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

// Apply the 'protect' middleware to all routes in this file
router.route('/')
  .get(protect, getFavorites)
  .post(protect, addFavorite);

router.route('/:station_id')
  .delete(protect, removeFavorite);

module.exports = router;