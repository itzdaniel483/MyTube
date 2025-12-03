import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import VideoCard from './VideoCard';

const MyVideos = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchMyVideos();
    }, []);

    const fetchMyVideos = async () => {
        try {
            const response = await fetch('/api/videos', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Filter videos uploaded by current user
                const myVideos = data.filter(video =>
                    !video.deleted && video.uploadedBy === user?.username
                );
                setVideos(myVideos);
            }
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (videoId) => {
        setVideos(videos.filter(v => v.id !== videoId));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="text-gray-400 text-xl">Loading your videos...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">My Videos</h1>
                <p className="text-gray-400">
                    Videos you've uploaded • {videos.length} total
                </p>
            </div>

            {videos.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">📹</div>
                    <h2 className="text-2xl font-bold text-white mb-2">No videos yet</h2>
                    <p className="text-gray-400 mb-6">
                        You haven't uploaded any videos. Start by uploading your first video!
                    </p>
                    <a
                        href="#upload"
                        className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/25"
                    >
                        Upload Video
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {videos.map(video => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyVideos;
