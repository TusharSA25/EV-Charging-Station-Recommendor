import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom pulsing icon for the user's location
const userIcon = new L.DivIcon({
  html: `<div class="pulsing-dot"></div>`,
  className: '', // This is required but can be empty
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Standard green icon for charging stations
const stationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A helper component to control the map imperatively
const MapController = ({ stations, userLocation, selectedStation, markerRefs }) => {
  const map = useMap();

  // Effect to fit all markers in view on a new search
  useEffect(() => {
    if (stations && stations.length > 0 && userLocation.latitude && userLocation.longitude) {
      const bounds = L.latLngBounds([
        ...stations.map(s => [s.latitude, s.longitude]),
        [userLocation.latitude, userLocation.longitude]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, userLocation, map]);

  // Effect to fly to a selected station and open its popup
  useEffect(() => {
    if (selectedStation) {
      const { latitude, longitude, id } = selectedStation;
      map.flyTo([latitude, longitude], 15);
      const marker = markerRefs.current[id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedStation, map, markerRefs]);

  return null;
};


const MapDisplay = ({ stations, userLocation, selectedStation }) => {
  const markerRefs = useRef({});
  const initialMapCenter = [12.9716, 77.5946]; // Bengaluru

  return (
    // Container with themed styling
    <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 h-full">
      <MapContainer
        center={initialMapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        scrollWheelZoom={false} // Prevents accidental zooming while scrolling the page
      >
        {/* Dark-themed map tiles for a cohesive look */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Marker for the user's location */}
        {userLocation && userLocation.latitude && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userIcon}
          >
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Markers for each charging station */}
        {stations && stations.map(station => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={stationIcon}
            ref={(el) => (markerRefs.current[station.id] = el)} // Store reference to marker
          >
            <Popup>
              <b>{station.name}</b><br />
              {station.operator}
            </Popup>
          </Marker>
        ))}

        {/* The controller component that manages map state */}
        <MapController
          stations={stations}
          userLocation={userLocation}
          selectedStation={selectedStation}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
};

export default MapDisplay;

