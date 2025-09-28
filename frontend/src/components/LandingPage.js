import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

// Import the components from the same directory
import SearchForm from './SearchForm';
import ResultsSection from './ResultsSection';

const LandingPage = () => {
    // State management for the application
    const [formData, setFormData] = useState({
        latitude: '12.9716', // Default to a location like Bengaluru
        longitude: '77.5946',
        max_distance: 15,
        fast_charging_only: 0,
    });
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('Find the best EV stations near you.');
    const [selectedStation, setSelectedStation] = useState(null);

    // The backend API endpoint from your server.js
    const API_URL = 'http://localhost:5000/api/recommend';

    // Handles changes in form inputs
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
    };

    // Fetches user's current geolocation
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            setMessage('Fetching your location...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({ ...prev, latitude: position.coords.latitude.toFixed(4), longitude: position.coords.longitude.toFixed(4) }));
                    setMessage('Location acquired! Find stations now.');
                },
                (err) => {
                    setError('Could not get location. Please grant permission or enter it manually.');
                    setTimeout(() => setError(null), 3000);
                }
            );
        } else {
            setError('Geolocation is not supported by this browser.');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Submits the form and fetches station data from the backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.latitude || !formData.longitude) {
            setError('Please provide a valid location.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setIsLoading(true);
        setError(null);
        setMessage('');
        setStations([]);
        setSelectedStation(null);

        try {
            // **FIXED: The real API call is now active.**
            const response = await axios.post(API_URL, {
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                max_distance: parseInt(formData.max_distance),
                fast_charging_only: parseInt(formData.fast_charging_only),
            });

            if (response.data && response.data.length > 0) {
                setStations(response.data);
            } else {
                setMessage('No stations found matching your criteria. Try expanding your search.');
            }

        } catch (err) {
            // **FIXED: Error handling no longer shows mock data.**
            setError('Failed to fetch recommendations. Is the server running?');
            console.error("API Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handles selecting a station from the list
    const handleStationSelect = (station) => {
        setSelectedStation(station);
        // On mobile, scroll to the map for a better user experience
        if (window.innerWidth < 1024) {
            const mapElement = document.getElementById('map-container');
            if (mapElement) {
                mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans overflow-x-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/20 animate-gradient-xy -z-10"></div>

            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20 px-4 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(30,213,142,0.1),_transparent_40%)]"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">ChargePoint Finder</h1>
                    <p className="text-lg md:text-xl mt-4 max-w-2xl mx-auto text-slate-300">Your intelligent guide to the best EV charging stations.</p>
                </div>
            </motion.header>

            <main className="container mx-auto px-4 pb-12 -mt-10">
                <SearchForm
                    formData={formData}
                    isLoading={isLoading}
                    handleSubmit={handleSubmit}
                    handleChange={handleChange}
                    handleGetCurrentLocation={handleGetCurrentLocation}
                />
                <ResultsSection
                    isLoading={isLoading}
                    error={error}
                    message={message}
                    stations={stations}
                    userLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                    selectedStation={selectedStation}
                    handleStationSelect={handleStationSelect}
                />
            </main>
        </div>
    );
};

export default LandingPage;

