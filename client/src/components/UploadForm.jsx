import React, { useState, useEffect } from 'react';

const UploadForm = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('category', category);

        // Convert comma-separated tags to array string
        const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
        formData.append('tags', JSON.stringify(tagsArray));

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                onUploadSuccess(data);
                // Reset form
                setFile(null);
                setTitle('');
                setCategory('');
                setTags('');
            } else {
                console.error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-dark-800 p-8 rounded-2xl shadow-xl border border-dark-700">
            <h2 className="text-3xl font-bold mb-8 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Upload Video
            </h2>

            <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-2">Video File</label>
                <div className="relative border-2 border-dashed border-dark-600 rounded-xl p-8 hover:border-primary-500 transition-colors group text-center cursor-pointer">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                    />
                    <div className="space-y-2">
                        <div className="text-4xl group-hover:scale-110 transition-transform">📁</div>
                        <p className="text-gray-400 group-hover:text-primary-500 transition-colors">
                            {file ? file.name : "Drag & drop or click to browse"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        placeholder="Video Title"
                    />
                </div>

                <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-8">
                <label className="block text-gray-400 text-sm font-medium mb-2">Tags (comma separated)</label>
                <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    placeholder="e.g., funny, tutorial, 2023"
                />
            </div>

            <button
                type="submit"
                disabled={uploading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 ${uploading
                    ? 'bg-dark-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-primary-500/25'
                    }`}
            >
                {uploading ? 'Uploading...' : 'Upload Video'}
            </button>
        </form>
    );
};

export default UploadForm;
