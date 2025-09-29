import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapDisplay from './MapDisplay';
import StationList from './StationList';
import { SadFaceIcon } from './icons';

const SkeletonCard = () => (
    <div className="bg-slate-800 p-5 rounded-xl border-2 border-slate-700 animate-pulse">
        <div className="flex justify-between items-start"><div className="h-6 w-3/5 bg-slate-700 rounded"></div><div className="h-6 w-1/5 bg-slate-700 rounded-full"></div></div>
        <div className="h-4 w-2/5 bg-slate-700 rounded mt-2"></div>
        <div className="mt-4 border-t border-slate-700 pt-4 flex justify-between items-center text-sm"><div className="h-5 w-1/4 bg-slate-700 rounded"></div><div className="h-5 w-1/4 bg-slate-700 rounded"></div><div className="h-5 w-1/4 bg-slate-700 rounded"></div></div>
    </div>
);

const ResultsSection = ({ isLoading, error, message, stations, userLocation, selectedStation, handleStationSelect, handleMapClick }) => {
    return (
        <section id="results" className="mt-12">
            <AnimatePresence>
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7 h-[600px] bg-slate-800 rounded-2xl animate-pulse border-2 border-slate-700"></div>
                        <div className="space-y-4 lg:col-span-5 h-[600px]"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && <div className="text-center py-10 text-red-400 font-semibold bg-red-900/20 rounded-lg">{error}</div>}

            {!isLoading && !stations.length && message && (
                <div className="text-center py-16 text-slate-400 bg-slate-800/50 rounded-lg">
                    <SadFaceIcon />
                    <p>{message}</p>
                </div>
            )}

            {stations.length > 0 && (
                <div>
                    <h2 className="text-3xl font-bold mb-8 text-center">Top Recommendations</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7 lg:sticky lg:top-8" id="map-container">
                            <MapDisplay
                                stations={stations}
                                userLocation={userLocation}
                                selectedStation={selectedStation}
                                handleMapClick={handleMapClick}
                            />
                        </div>
                        <StationList
                            stations={stations}
                            selectedStation={selectedStation}
                            handleStationSelect={handleStationSelect}
                        />
                    </div>
                </div>
            )}
        </section>
    );
};

export default ResultsSection;