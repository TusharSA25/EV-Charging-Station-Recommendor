import React from 'react';
import { motion } from 'framer-motion';
import { StarIcon, DistanceIcon, PowerIcon, FastChargeIcon } from './Icons';

const StationCard = ({ station, selectedStation, handleStationSelect }) => {
    // Animation variants for each card
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={itemVariants}
            onClick={() => handleStationSelect(station)}
            className={`bg-slate-800 p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 ${selectedStation?.id === station.id ? 'border-emerald-500 bg-slate-700/50' : 'border-slate-700'}`}
        >
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-emerald-400">{station.name}</h3>
                <div className="flex items-center gap-1 bg-slate-700 text-yellow-400 text-sm font-semibold px-2.5 py-1 rounded-full">
                    <StarIcon /> <span>{station.predicted_rating.toFixed(1)}</span>
                </div>
            </div>
            <p className="mt-1 text-slate-400">{station.operator}</p>
            <div className="mt-4 border-t border-slate-700 pt-4 flex justify-between items-center text-sm text-slate-300">
                <div className="flex items-center gap-2"><DistanceIcon /> <span>{station.distance} km away</span></div>
                <div className="flex items-center gap-2"><PowerIcon /> <span>{station.max_power_kw} kW</span></div>
                <FastChargeIcon available={station.fast_charging} />
            </div>
        </motion.div>
    );
};

export default StationCard;

