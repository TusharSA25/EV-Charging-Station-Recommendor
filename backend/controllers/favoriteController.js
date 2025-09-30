// controllers/favoriteController.js
const FavoriteStation = require('../models/FavoriteStation');
const Station = require('../models/Station');

/**
 * @desc    Get logged in user's favorite stations
 * @route   GET /api/favorites
 * @access  Private
 */
const getFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteStation.find({ user: req.user._id });
    const station_ids = favorites.map(f => f.station_id);

    // Find the full station details for the favorited stations
    const stations = await Station.find({ station_id: { $in: station_ids } });

    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Add a station to favorites
 * @route   POST /api/favorites
 * @access  Private
 */
const addFavorite = async (req, res) => {
  const { station_id } = req.body;

  try {
    const alreadyExists = await FavoriteStation.findOne({ user: req.user._id, station_id });
    if (alreadyExists) {
      return res.status(400).json({ message: 'Station already in favorites' });
    }

    const favorite = new FavoriteStation({
      user: req.user._id,
      station_id,
    });

    const createdFavorite = await favorite.save();
    res.status(201).json(createdFavorite);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Remove a station from favorites
 * @route   DELETE /api/favorites/:station_id
 * @access  Private
 */
const removeFavorite = async (req, res) => {
  const { station_id } = req.params;

  try {
    const favorite = await FavoriteStation.findOneAndDelete({ user: req.user._id, station_id: Number(station_id) });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };