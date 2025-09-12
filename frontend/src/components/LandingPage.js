import React, { useState } from 'react';
import axios from 'axios';

// --- Reusable Icon Components (or you can use an icon library like react-icons) ---
const Zap = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const LocationMarker = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;

const LandingPage = () => {
    // --- STATE MANAGEMENT ---
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        max_distance: 15,
        budget: 50,
        fast_charging_only: 0,
    });
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('Enter your location to find the best EV stations near you.'); // User feedback

    // --- API CONFIGURATION ---
    const API_URL = 'http://localhost:5000/api/recommend';

    // --- HANDLER FUNCTIONS ---
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
                    setError('Could not get location. Please enter it manually.');
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

        try {
            const response = await axios.post(API_URL, {
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                max_distance: parseInt(formData.max_distance),
                budget: parseInt(formData.budget),
                fast_charging_only: parseInt(formData.fast_charging_only),
            });
            
            if (response.data && response.data.length > 0) {
                setStations(response.data);
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

    // --- JSX RENDER ---
    return (
        <div className="bg-gray-900 min-h-screen text-white font-sans">
            {/* HERO SECTION */}
            <header className="text-center py-20 bg-gray-800 shadow-2xl">
                <h1 className="text-5xl font-extrabold text-green-400">EV Station Finder</h1>
                <p className="text-xl mt-4 text-gray-300">Find the best EV charging stations, personalized for you.</p>
            </header>
            
            <main className="container mx-auto px-4 py-12">
                {/* RECOMMENDATION FORM SECTION */}
                <section id="recommender" className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-3xl font-bold mb-6 text-center text-green-400">Find Your Perfect Charge</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Location Inputs */}
                        <div className="md:col-span-2">
                            <label htmlFor="latitude" className="block text-sm font-medium text-gray-400">Your Location</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <input type="number" step="0.0001" name="latitude" id="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" required className="flex-1 block w-full rounded-none rounded-l-md bg-gray-700 border-gray-600 focus:ring-green-500 focus:border-green-500 sm:text-sm p-2" />
                                <input type="number" step="0.0001" name="longitude" id="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" required className="flex-1 block w-full rounded-none bg-gray-700 border-gray-600 focus:ring-green-500 focus:border-green-500 sm:text-sm p-2" />
                                <button type="button" onClick={handleGetCurrentLocation} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-600 bg-gray-600 text-gray-300 text-sm hover:bg-gray-500">
                                    <LocationMarker />
                                </button>
                            </div>
                        </div>

                        {/* Other Filters */}
                        <div>
                            <label htmlFor="max_distance" className="block text-sm font-medium text-gray-400">Max Distance (km)</label>
                            <input type="number" name="max_distance" id="max_distance" value={formData.max_distance} onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:ring-green-500 focus:border-green-500 sm:text-sm p-2" />
                        </div>
                        <div className="flex items-end">
                             <div className="flex items-center h-full mt-6">
                                <input id="fast_charging_only" name="fast_charging_only" type="checkbox" checked={formData.fast_charging_only} onChange={handleChange} className="h-4 w-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"/>
                                <label htmlFor="fast_charging_only" className="ml-2 block text-sm text-gray-300">Fast Charging Only</label>
                            </div>
                        </div>
                       
                        {/* Submit Button */}
                        <div className="md:col-span-2 lg:col-span-4 text-center mt-4">
                            <button type="submit" disabled={isLoading} className="w-full md:w-1/2 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500 transition-colors">
                                <Zap/> {isLoading ? 'Searching...' : 'Find Stations'}
                            </button>
                        </div>
                    </form>
                </section>
                
                {/* RESULTS SECTION */}
                <section id="results" className="mt-12">
                    {/* Loading State */}
                    {isLoading && <div className="text-center py-10"><p>Finding the best stations for you...</p></div>}
                    
                    {/* Error State */}
                    {error && <div className="text-center py-10 text-red-400 font-semibold">{error}</div>}
                    
                    {/* Message State */}
                    {message && !isLoading && <div className="text-center py-10 text-gray-400">{message}</div>}

                    {/* Success State */}
                    {stations.length > 0 && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6 text-center">Top Recommendations</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {stations.map(station => (
                                    <div key={station.id} className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 transform hover:-translate-y-1 transition-transform">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-green-400">{station.name}</h3>
                                            <span className="bg-green-900 text-green-300 text-sm font-semibold px-2.5 py-0.5 rounded-full">{station.predicted_rating.toFixed(1)} ★</span>
                                        </div>
                                        <p className="mt-2 text-gray-400">{station.operator}</p>
                                        <div className="mt-4 border-t border-gray-700 pt-4 flex justify-between text-sm text-gray-300">
                                            <span>{station.distance} km away</span>
                                            <span>{station.max_power_kw} kW max</span>
                                            <span className={`${station.fast_charging ? 'text-green-400' : 'text-gray-500'}`}>Fast Charge</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default LandingPage;