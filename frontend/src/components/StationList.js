import React from 'react';
import { motion } from 'framer-motion';
import StationCard from './StationCard';

const StationList = ({ stations, selectedStation, handleStationSelect }) => {
    // Animation container variants to stagger the children
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <motion.div
            className="space-y-4 lg:col-span-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
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

