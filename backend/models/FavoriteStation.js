// models/FavoriteStation.js
const mongoose = require('mongoose');

const favoriteStationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Creates a reference to the User model
  },
  station_id: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Prevent a user from favoriting the same station twice
favoriteStationSchema.index({ user: 1, station_id: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteStation', favoriteStationSchema);