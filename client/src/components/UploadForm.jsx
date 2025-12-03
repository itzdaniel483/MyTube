import React, { useState, useEffect } from 'react';

const UploadForm = ({ onUploadSuccess }) => {
    const [files, setFiles] = useState([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [uploadResults, setUploadResults] = useState([]);

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

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        setUploadResults([]);
    };

    const uploadSingleFile = async (file) => {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', files.length === 1 ? title : ''); // Use title only for single file
        formData.append('category', category);

        const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
        formData.append('tags', JSON.stringify(tagsArray));

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data, filename: file.name };
            } else {
                return { success: false, error: 'Upload failed', filename: file.name };
            }
        } catch (error) {
            return { success: false, error: error.message, filename: file.name };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });
        const results = [];

        for (let i = 0; i < files.length; i++) {
            setUploadProgress({ current: i + 1, total: files.length });
            const result = await uploadSingleFile(files[i]);
            results.push(result);

            if (result.success) {
                onUploadSuccess(result.data);
            }
        }

        setUploadResults(results);
        setUploading(false);

        // Reset form if all successful
        if (results.every(r => r.success)) {
            setFiles([]);
            setTitle('');
            setCategory('');
            setTags('');
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
        }
    };

    const isBulkUpload = files.length > 1;

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-dark-800 p-8 rounded-2xl shadow-xl border border-dark-700">
            <h2 className="text-3xl font-bold mb-8 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Upload Video{isBulkUpload ? 's' : ''}
            </h2>

            <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-2">
                    Video File{isBulkUpload ? 's' : ''}
                </label>
                <div className="relative border-2 border-dashed border-dark-600 rounded-xl p-8 hover:border-primary-500 transition-colors group text-center cursor-pointer">
                    <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                    />
                    <div className="space-y-2">
                        <div className="text-4xl group-hover:scale-110 transition-transform">📁</div>
                        <p className="text-gray-400 group-hover:text-primary-500 transition-colors">
                            {files.length > 0
                                ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                                : "Drag & drop or click to browse (multiple files supported)"}
                        </p>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-4 max-h-40 overflow-y-auto bg-dark-900 rounded-lg p-3 space-y-1">
                        {files.map((file, idx) => (
                            <div key={idx} className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="text-primary-500">•</span>
                                <span className="truncate">{file.name}</span>
                                <span className="text-xs text-gray-600">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {!isBulkUpload && (
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
                )}

                <div className={isBulkUpload ? 'md:col-span-2' : ''}>
                    <label className="block text-gray-400 text-sm font-medium mb-2">
                        Category{isBulkUpload ? ' (applies to all)' : ''}
                    </label>
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
                <label className="block text-gray-400 text-sm font-medium mb-2">
                    Tags (comma separated){isBulkUpload ? ' - applies to all' : ''}
                </label>
                <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    placeholder="e.g., funny, tutorial, 2023"
                />
            </div>

            {/* Upload Progress */}
            {uploading && (
                <div className="mb-6 bg-dark-900 p-4 rounded-xl border border-dark-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Uploading...</span>
                        <span className="text-primary-500 font-bold">{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Upload Results */}
            {uploadResults.length > 0 && !uploading && (
                <div className="mb-6 bg-dark-900 p-4 rounded-xl border border-dark-700 max-h-60 overflow-y-auto">
                    <h3 className="text-white font-bold mb-3">Upload Results</h3>
                    <div className="space-y-2">
                        {uploadResults.map((result, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{result.success ? '✓' : '✗'}</span>
                                <span className="truncate">{result.filename}</span>
                                {!result.success && result.error && (
                                    <span className="text-xs text-gray-500">({result.error})</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-dark-700 text-sm">
                        <span className="text-green-400">{uploadResults.filter(r => r.success).length} successful</span>
                        {uploadResults.some(r => !r.success) && (
                            <span className="text-red-400 ml-4">{uploadResults.filter(r => !r.success).length} failed</span>
                        )}
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={uploading || files.length === 0}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 ${uploading || files.length === 0
                        ? 'bg-dark-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-primary-500/25'
                    }`}
            >
                {uploading
                    ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`
                    : `Upload ${files.length} Video${files.length !== 1 ? 's' : ''}`}
            </button>
        </form>
    );
};

export default UploadForm;
