import React from 'react';

// A base Icon component to reduce code repetition
const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d={path} />
    </svg>
);

export const ZapIcon = () => <Icon path="M11.9999 1.07153L3.42847 14.2858H11.9999L10.2856 22.9287L18.857 9.71438H10.2856L11.9999 1.07153Z" className="w-5 h-5 mr-2" />;
export const LocationMarkerIcon = () => <Icon path="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" className="w-5 h-5" />;
export const StarIcon = () => <Icon path="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" className="w-5 h-5 text-yellow-400" />;
export const DistanceIcon = () => <Icon path="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" className="w-5 h-5" />;
export const PowerIcon = () => <Icon path="M7 2v11h3v9l7-12h-4l4-8z" className="w-5 h-5" />;
export const FastChargeIcon = ({ available }) => (
    <div className={`flex items-center gap-2 ${available ? 'text-emerald-400' : 'text-slate-500'}`}>
        <Icon path="M15 13H7V6h2v5h6v-2l4 4-4 4v-2z" className="w-5 h-5" />
        <span>Fast Charge</span>
    </div>
);
export const SadFaceIcon = () => <Icon path="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-6c.78 2.34 3.06 4 5.76 4s4.98-1.66 5.76-4H7z" className="w-16 h-16 mx-auto text-slate-500 mb-4" />;

