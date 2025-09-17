import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- (New) Custom Icon Definitions ---
// We define custom icons to differentiate between the user and EV stations.
// These are simple SVG-based icons to avoid issues with image paths.

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const stationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


// --- (New) Helper Component to Adjust Map View ---
// This component will automatically zoom and pan the map to fit all markers.
const MapViewUpdater = ({ stations, userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (stations && stations.length > 0 && userLocation.latitude && userLocation.longitude) {
      // Create a bounding box including all station markers and the user's location
      const bounds = L.latLngBounds([
        ...stations.map(s => [s.latitude, s.longitude]),
        [userLocation.latitude, userLocation.longitude]
      ]);
      
      // Fit the map to these bounds with some padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, userLocation, map]);

  return null; // This component does not render anything itself
};


const MapDisplay = ({ stations, userLocation }) => {
  
  // A fixed center for when the map first loads, before results are available
  const initialMapCenter = [12.9716, 77.5946]; 

  return (
    <MapContainer 
      center={initialMapCenter} 
      zoom={13} 
      style={{ height: '500px', width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* --- (New) Marker Rendering Logic --- */}

      {/* Add a marker for the user's location if it exists */}
      {userLocation && userLocation.latitude && (
        <Marker 
          position={[userLocation.latitude, userLocation.longitude]} 
          icon={userIcon}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* Map over the stations and create a marker for each one */}
      {stations && stations.map(station => (
        <Marker 
          key={station.id} 
          position={[station.latitude, station.longitude]} 
          icon={stationIcon}
        >
          <Popup>
            <b>{station.name}</b><br />
            {station.operator}
          </Popup>
        </Marker>
      ))}

      {/* Add the MapViewUpdater component to control map bounds */}
      <MapViewUpdater stations={stations} userLocation={userLocation} />
      
    </MapContainer>
  );
};

export default MapDisplay;