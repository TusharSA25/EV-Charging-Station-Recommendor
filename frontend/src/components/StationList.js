import React from 'react';
import { motion } from 'framer-motion';
import StationCard from './StationCard';

const StationList = ({ stations, selectedStation, handleStationSelect }) => {
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
            // The class h-[600px] sets a fixed height to match the map
            className="space-y-4 lg:col-span-5 h-[600px] overflow-y-auto pr-2 custom-scrollbar"
        >
            {stations.map(station => (
                <StationCard
                    key={station.id}
                    station={station}
                    selectedStation={selectedStation}
                    handleStationSelect={handleStationSelect}
                />
            ))}
        </motion.div>
    );
};

export default StationList;

