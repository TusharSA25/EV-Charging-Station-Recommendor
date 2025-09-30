import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import SearchForm from './SearchForm';
import ResultsSection from './ResultsSection';
import AuthContext from '../context/AuthContext';
import api, { getFavorites, addFavorite, removeFavorite } from '../services/api';

const LandingPage = () => {
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        max_distance: 15,
        fast_charging_only: 0,
    });
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('Enter your location to find the best EV stations near you.');
    const [selectedStation, setSelectedStation] = useState(null);
    const { user } = useContext(AuthContext);
    const [favorites, setFavorites] = useState(new Set());

    useEffect(() => {
        const fetchFavorites = async () => {
            if (user) {
                try {
                    const { data } = await getFavorites();
                    const favoriteIds = new Set(data.map(fav => fav.station_id));
                    setFavorites(favoriteIds);
                } catch (err) {
                    console.error("Could not fetch favorites", err);
                }
            } else {
                setFavorites(new Set());
            }
        };
        fetchFavorites();
    }, [user]);

    const handleToggleFavorite = async (stationId) => {
        const isCurrentlyFavorite = favorites.has(stationId);
        const newFavorites = new Set(favorites);
        if (isCurrentlyFavorite) {
            newFavorites.delete(stationId);
        } else {
            newFavorites.add(stationId);
        }
        setFavorites(newFavorites);

        try {
            if (isCurrentlyFavorite) {
                await removeFavorite(stationId);
            } else {
                await addFavorite(stationId);
            }
        } catch (err) {
            console.error("Failed to update favorite status", err);
            setFavorites(favorites);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoading(true);
            setMessage('Fetching your location...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude.toFixed(4),
                        longitude: position.coords.longitude.toFixed(4),
                    }));
                    setIsLoading(false);
                    setMessage('Location acquired! Find stations now.');
                },
                (err) => {
                    setError('Could not get your location. Please enter it manually.');
                    setIsLoading(false);
                }
            );
        } else {
            setError('Geolocation is not supported by this browser.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.latitude || !formData.longitude) {
            setError('Please provide a valid location.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setMessage('');
        setStations([]);
        setSelectedStation(null);

        try {
            const { data } = await api.post('/recommend', {
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                max_distance: parseInt(formData.max_distance),
                fast_charging_only: parseInt(formData.fast_charging_only),
            });

            if (data && data.length > 0) {
                setStations(data);
            } else {
                setMessage('No stations found matching your criteria. Try expanding your search distance.');
            }
        } catch (err) {
            setError('Failed to fetch recommendations. The server might be down.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStationSelect = (station) => {
        setSelectedStation(station);
    };

    const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(4),
            longitude: lng.toFixed(4)
        }));
        setMessage('Location selected on map. Ready to search.');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">
            <div className="background-gradient"></div>
            <header className="text-center pt-12 pb-8 relative z-10">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500"
                >
                    EV Station Finder
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg mt-4 text-slate-300"
                >
                    Find the best EV charging stations, personalized for you.
                </motion.p>
            </header>

            <main className="container mx-auto px-4 pb-12 relative z-10">
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
                    stations={stations}
                    message={message}
                    selectedStation={selectedStation}
                    handleStationSelect={handleStationSelect}
                    userLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                    handleMapClick={handleMapClick}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    isLoggedIn={!!user}
                />
            </main>
        </div>
    );
};

export default LandingPage;