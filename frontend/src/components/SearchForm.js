import React from 'react';
import { motion } from 'framer-motion';
import { LocationMarkerIcon, ZapIcon } from './icons';

const SearchForm = ({ formData, isLoading, handleSubmit, handleChange, handleGetCurrentLocation }) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            id="recommender"
            className="relative z-20 bg-slate-800/60 backdrop-blur-lg p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-2 lg:col-span-1">
                    <label htmlFor="latitude" className="block text-sm font-medium text-slate-400 mb-1">Your Location</label>
                    <div className="flex">
                        <input type="number" step="0.0001" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" required className="w-full bg-slate-700 border-slate-600 rounded-l-md p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                        <input type="number" step="0.0001" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" required className="w-full bg-slate-700 border-slate-600 p-3 border-l border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                        <button type="button" onClick={handleGetCurrentLocation} title="Use my current location" className="px-4 bg-slate-600 text-slate-300 rounded-r-md hover:bg-slate-500 transition-colors">
                            <LocationMarkerIcon />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="max_distance" className="block text-sm font-medium text-slate-400 mb-1">Distance (km)</label>
                        <input type="number" name="max_distance" value={formData.max_distance} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                    </div>
                    <div className="flex items-center justify-center pt-6">
                        <input id="fast_charging_only" name="fast_charging_only" type="checkbox" checked={!!formData.fast_charging_only} onChange={handleChange} className="h-5 w-5 text-emerald-500 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer" />
                        <label htmlFor="fast_charging_only" className="ml-3 text-sm text-slate-300 cursor-pointer">Fast Charging Only</label>
                    </div>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center px-6 py-3 font-semibold rounded-md shadow-lg text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 disabled:bg-slate-500 disabled:from-slate-500 transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                        <ZapIcon /> {isLoading ? 'Searching...' : 'Find Stations'}
                    </button>
                </div>
            </form>
        </motion.section>
    );
};

export default SearchForm;

