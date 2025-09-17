import React, { useEffect, useRef } from 'react'; // Import useRef
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Custom Icon Definitions (No changes here) ---
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

// --- (Updated) Combined Map Controller ---
const MapController = ({ stations, userLocation, selectedStation, markerRefs }) => {
  const map = useMap();

  // This effect runs when the list of stations changes, fitting all markers in view.
  useEffect(() => {
    if (stations && stations.length > 0 && userLocation.latitude && userLocation.longitude) {
      const bounds = L.latLngBounds([
        ...stations.map(s => [s.latitude, s.longitude]),
        [userLocation.latitude, userLocation.longitude]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, userLocation, map]);

  // --- (New) This effect runs when a station is selected from the list ---
  useEffect(() => {
    if (selectedStation) {
      const { latitude, longitude, id } = selectedStation;
      map.flyTo([latitude, longitude], 15); // Animate to the marker's position
      
      // Open the popup for the selected marker
      const marker = markerRefs.current[id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedStation, map, markerRefs]);

  return null;
};


const MapDisplay = ({ stations, userLocation, selectedStation }) => {
  // --- (New) Create a ref to hold references to our markers ---
  const markerRefs = useRef({});
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

      {userLocation && userLocation.latitude && (
        <Marker 
          position={[userLocation.latitude, userLocation.longitude]} 
          icon={userIcon}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {stations && stations.map(station => (
        // --- (Updated) Add a ref to each marker ---
        <Marker 
          key={station.id} 
          position={[station.latitude, station.longitude]} 
          icon={stationIcon}
          ref={(el) => (markerRefs.current[station.id] = el)} // Store marker instance
        >
          <Popup>
            <b>{station.name}</b><br />
            {station.operator}
          </Popup>
        </Marker>
      ))}
      
      {/* --- (Updated) Pass new props to the controller --- */}
      <MapController 
          stations={stations} 
          userLocation={userLocation} 
          selectedStation={selectedStation}
          markerRefs={markerRefs}
      />
      
    </MapContainer>
  );
};

export default MapDisplay;