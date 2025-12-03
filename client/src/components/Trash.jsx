import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Trash = () => {
    const [deletedVideos, setDeletedVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchTrash();
    }, []);

    const fetchTrash = async () => {
        try {
            const response = await fetch('/api/videos/trash', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setDeletedVideos(data);
            }
        } catch (error) {
            console.error('Error fetching trash:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        setActionLoading(id);
        try {
            const response = await fetch(`/api/videos/${id}/restore`, {
                method: 'PATCH',
                credentials: 'include'
            });
            if (response.ok) {
                setDeletedVideos(deletedVideos.filter(v => v.id !== id));
            } else {
                alert('Failed to restore video');
            }
        } catch (error) {
            console.error('Error restoring video:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!window.confirm('Are you sure? This cannot be undone!')) return;

        setActionLoading(id);
        try {
            const response = await fetch(`/api/videos/${id}/permanent`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                setDeletedVideos(deletedVideos.filter(v => v.id !== id));
            } else {
                alert('Failed to delete video permanently');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="text-gray-400 text-xl">Loading trash...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                    Trash Bin 🗑️
                </h2>
                <span className="text-gray-400 text-sm">
                    {deletedVideos.length} items found
                </span>
            </div>

            {deletedVideos.length === 0 ? (
                <div className="text-center py-20 bg-dark-800 rounded-2xl border border-dark-700">
                    <p className="text-gray-500 text-xl">Trash is empty</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {deletedVideos.map(video => (
                        <div key={video.id} className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700 opacity-75 hover:opacity-100 transition-opacity">
                            <div className="relative aspect-video bg-dark-900">
                                {video.thumbnail ? (
                                    <img
                                        src={`${video.thumbnail}`}
                                        alt={video.title}
                                        className="w-full h-full object-cover grayscale"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-dark-700">
                                        <span className="text-4xl">▶️</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-red-500 font-bold border-2 border-red-500 px-4 py-1 rounded -rotate-12">
                                        DELETED
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="text-lg font-bold text-gray-300 mb-2 truncate">{video.title}</h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Deleted: {new Date(video.deletedAt).toLocaleDateString()}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(video.id)}
                                        disabled={actionLoading === video.id}
                                        className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-500 rounded-lg text-sm font-medium transition-colors border border-green-600/30"
                                    >
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => handlePermanentDelete(video.id)}
                                        disabled={actionLoading === video.id}
                                        className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Trash;
