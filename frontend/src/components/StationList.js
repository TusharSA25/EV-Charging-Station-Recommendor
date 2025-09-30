// src/components/StationList.js
import React from 'react';
import { motion } from 'framer-motion';
import StationCard from './StationCard';

const StationList = ({ stations, selectedStation, handleStationSelect, favorites, onToggleFavorite, isLoggedIn }) => {
    const containerVariants = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 lg:col-span-5 h-[600px] overflow-y-auto pr-2 custom-scrollbar"
        >
            {stations.map(station => (
                <StationCard
                    key={station.id}
                    station={station}
                    selectedStation={selectedStation}
                    handleStationSelect={handleStationSelect}
                    // 👇 This is the crucial line to add
                    isFavorite={favorites.has(station.id)}
                    onToggleFavorite={onToggleFavorite}
                    isLoggedIn={isLoggedIn}
                />
            ))}
        </motion.div>
    );
};

export default StationList;