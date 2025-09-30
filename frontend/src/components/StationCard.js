import React from 'react';
import { motion } from 'framer-motion';
import { StarIcon, DistanceIcon, PowerIcon, FastChargeIcon, HeartIcon } from './icons';

const StationCard = ({ station, selectedStation, handleStationSelect, isFavorite, onToggleFavorite, isLoggedIn }) => {
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation(); // Prevent card from being selected when clicking the heart
        onToggleFavorite(station.id);
    };

    return (
        <motion.div
            variants={itemVariants}
            onClick={() => handleStationSelect(station)}
            className={`group bg-slate-800 p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/20 ${selectedStation?.id === station.id ? 'border-teal-500 bg-slate-700/50 shadow-lg shadow-teal-500/20' : 'border-slate-700'}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <h3 className="text-xl font-bold text-teal-400">{station.name}</h3>
                    <p className="mt-1 text-slate-400">{station.operator}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-700 text-yellow-400 text-sm font-semibold px-2.5 py-1 rounded-full">
                        <StarIcon /> <span>{station.predicted_rating.toFixed(1)}</span>
                    </div>
                    {isLoggedIn && (
                        <HeartIcon isFavorite={isFavorite} onClick={handleFavoriteClick} />
                    )}
                </div>
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4 flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-teal-400 transition-colors duration-300"><DistanceIcon /> <span>{station.distance} km away</span></div>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-teal-400 transition-colors duration-300"><PowerIcon /> <span>{station.max_power_kw} kW</span></div>
                <FastChargeIcon available={station.fast_charging} />
            </div>
        </motion.div>
    );
};

export default StationCard;