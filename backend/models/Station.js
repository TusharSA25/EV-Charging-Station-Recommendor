// models/Station.js
const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  // Use the ID from OpenChargeMap as our primary reference
  station_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  name: { type: String, required: true },
  operator: { type: String, index: true },
  
  // GeoJSON for location-based queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  
  address: String,
  usage_cost: Number,
  access_type: String,
  fast_charging: Boolean,
  max_power_kw: Number,
  connection_types: [String],
  status: String,
  
  // Timestamp for cache invalidation
  last_updated: {
    type: Date,
    default: Date.now,
  },
});

// Create the 2dsphere index for efficient geospatial queries
stationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', stationSchema);