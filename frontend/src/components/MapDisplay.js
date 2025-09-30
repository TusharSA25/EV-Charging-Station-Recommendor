import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// --- Map Controller for animations and bounds ---
const MapController = ({ stations, userLocation, selectedStation, markerRefs }) => {
    const map = useMap();

    // NEW: This effect fixes the tile loading issue.
    // It tells the map to re-evaluate its size after the component has rendered.
    useEffect(() => {
        map.invalidateSize();
    }, [stations, map]);

    useEffect(() => {
        if (!selectedStation && stations && stations.length > 0 && userLocation.latitude && userLocation.longitude) {
            const bounds = L.latLngBounds([
                ...stations.map(s => [s.latitude, s.longitude]),
                [userLocation.latitude, userLocation.longitude]
            ]);
            map.fitBounds(bounds, { padding: [50, 50], duration: 1 });
        }
    }, [stations, userLocation, map, selectedStation]);

    useEffect(() => {
        if (selectedStation) {
            const { latitude, longitude, id } = selectedStation;
            map.flyTo([latitude, longitude], 15, { duration: 1 });
            const marker = markerRefs.current[id];
            if (marker) {
                setTimeout(() => { marker.openPopup(); }, 500);
            }
        }
    }, [selectedStation, map, markerRefs]);

    return null;
};

// --- Component to handle map click events ---
const MapClickHandler = ({ handleMapClick }) => {
    useMapEvents({
        click(e) {
            handleMapClick(e);
        },
    });
    return null;
};

const MapDisplay = ({ stations, userLocation, selectedStation, handleMapClick }) => {
    const markerRefs = useRef({});
    const initialMapCenter = userLocation.latitude ? [userLocation.latitude, userLocation.longitude] : [12.9716, 77.5946];

    const userIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute w-8 h-8 bg-teal-500 rounded-full animate-ping-slow opacity-60"></div>
                 <div class="relative w-4 h-4 bg-teal-400 rounded-full border-2 border-white shadow-lg"></div>
               </div>`,
        className: 'bg-transparent border-0',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    const stationIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const ThemedPopup = (props) => (
        <Popup {...props} autoPan={false}>
            <div className="bg-slate-800 text-white rounded-lg p-0 m-0">
                {props.children}
            </div>
        </Popup>
    );

    return (
        <MapContainer
            center={initialMapCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '600px', width: '100%', borderRadius: '1.25rem', border: '2px solid #334155', cursor: 'pointer' }}
            className="map-container"
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            <MapClickHandler handleMapClick={handleMapClick} />

            {userLocation && userLocation.latitude && (
                <Marker
                    position={[userLocation.latitude, userLocation.longitude]}
                    icon={userIcon}
                >
                    <ThemedPopup>
                        <div className="p-2 bg-slate-700 rounded-lg text-center font-bold">Your Location</div>
                    </ThemedPopup>
                </Marker>
            )}

            {stations && stations.map(station => (
                <Marker
                    key={station.id}
                    position={[station.latitude, station.longitude]}
                    icon={stationIcon}
                    ref={(el) => (markerRefs.current[station.id] = el)}
                >
                    <ThemedPopup>
                        <div className="p-2 bg-slate-700 rounded-lg">
                            <b className="text-teal-400">{station.name}</b><br />
                            <span className="text-sm text-slate-300">{station.operator}</span>
                        </div>
                    </ThemedPopup>
                </Marker>
            ))}

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