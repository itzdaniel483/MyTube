import React from 'react';

const VideoPlayer = ({ src, type = 'video/mp4' }) => {
    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary-500/10 bg-black border border-dark-700">
                <video
                    controls
                    className="w-full h-auto max-h-[70vh]"
                    src={src}
                >
                    <source src={src} type={type} />
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    );
};

export default VideoPlayer;
