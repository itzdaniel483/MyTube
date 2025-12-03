import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const VideoCard = ({ video, onClick, onDelete }) => {
    const { user } = useAuth();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowConfirm(true);
    };

    const handleConfirmDelete = (e) => {
        e.stopPropagation();
        onDelete(video.id);
        setShowConfirm(false);
    };

    const handleCancelDelete = (e) => {
        e.stopPropagation();
        setShowConfirm(false);
    };

    return (
        <div
            className="group bg-dark-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-primary-500/20 transition-all duration-300 transform hover:-translate-y-1 border border-dark-700 hover:border-primary-500/50 relative"
            onClick={() => onClick(video)}
        >
            <div className="relative aspect-video bg-dark-900 overflow-hidden">
                {video.thumbnail ? (
                    <img
                        src={`${video.thumbnail}`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-700">
                        <span className="text-4xl">▶️</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white text-sm font-medium">Watch Now</span>
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-2 truncate group-hover:text-primary-500 transition-colors">
                    {video.title}
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                    <span className="bg-primary-500/10 text-primary-500 text-xs px-2 py-1 rounded-full font-medium border border-primary-500/20">
                        {video.category}
                    </span>
                    {video.tags && video.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-dark-700 text-gray-400 text-xs px-2 py-1 rounded-full border border-dark-600">
                            #{tag}
                        </span>
                    ))}
                    {video.tags && video.tags.length > 2 && (
                        <span className="text-gray-500 text-xs py-1">+{video.tags.length - 2}</span>
                    )}
                </div>

                <p className="text-xs text-gray-500 font-medium">
                    {new Date(video.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
            </div>

            {/* Admin Delete Button */}
            {user?.role === 'admin' && (
                <button
                    onClick={handleDeleteClick}
                    className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Delete Video"
                >
                    🗑️
                </button>
            )}

            {/* Delete Confirmation Overlay */}
            {showConfirm && (
                <div className="absolute inset-0 bg-dark-900/90 flex flex-col items-center justify-center p-4 z-20 animate-fade-in text-center">
                    <p className="text-white font-bold mb-4">Delete this video?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleConfirmDelete}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={handleCancelDelete}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoCard;
