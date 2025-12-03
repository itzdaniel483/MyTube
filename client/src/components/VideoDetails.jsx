import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const VideoDetails = ({ video, onTagsUpdate, onVideoDeleted }) => {
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editedTags, setEditedTags] = useState('');
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [editedCategory, setEditedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { user } = useAuth();

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

    const isAdmin = user?.role === 'admin';

    const handleEditClick = () => {
        setEditedTags(video.tags ? video.tags.join(', ') : '');
        setIsEditingTags(true);
    };

    const handleCategoryEditClick = () => {
        setEditedCategory(video.category || 'Uncategorized');
        setIsEditingCategory(true);
    };

    const handleSaveTags = async () => {
        setSaving(true);
        const tagsArray = editedTags.split(',').map(t => t.trim()).filter(t => t);

        try {
            const response = await fetch(`/api/videos/${video.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tagsArray }),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedVideo = await response.json();
                onTagsUpdate(updatedVideo);
                setIsEditingTags(false);
            } else {
                console.error('Failed to update tags');
            }
        } catch (error) {
            console.error('Error updating tags:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCategory = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/videos/${video.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: editedCategory }),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedVideo = await response.json();
                onTagsUpdate(updatedVideo);
                setIsEditingCategory(false);
            } else {
                console.error('Failed to update category');
            }
        } catch (error) {
            console.error('Error updating category:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingTags(false);
        setEditedTags('');
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/videos/${video.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                onVideoDeleted(video.id);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div className="max-w-5xl mx-auto bg-dark-800 p-8 rounded-2xl border border-dark-700 shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold text-white">{video.title}</h2>
                {isAdmin && (
                    <button
                        onClick={handleDeleteClick}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        🗑️ Delete Video
                    </button>
                )}
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm font-medium">Tags:</span>
                    {user && !isEditingTags && (
                        <button
                            onClick={handleEditClick}
                            className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
                        >
                            ✏️ Edit Tags
                        </button>
                    )}
                </div>

                {isEditingTags ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={editedTags}
                            onChange={(e) => setEditedTags(e.target.value)}
                            className="w-full p-3 bg-dark-900 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                            placeholder="Enter tags separated by commas"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveTags}
                                disabled={saving}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            {isEditingCategory ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={editedCategory}
                                        onChange={(e) => setEditedCategory(e.target.value)}
                                        className="bg-dark-900 border border-dark-600 rounded-lg text-white px-3 py-1 text-sm focus:border-primary-500 outline-none"
                                    >
                                        <option value="Uncategorized">Uncategorized</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleSaveCategory} className="text-green-400 hover:text-green-300">✓</button>
                                    <button onClick={() => setIsEditingCategory(false)} className="text-gray-400 hover:text-gray-300">✕</button>
                                </div>
                            ) : (
                                <>
                                    <span className="bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full text-sm font-medium border border-primary-500/20">
                                        {video.category}
                                    </span>
                                    {user && (user.role === 'admin' || user.username === video.uploadedBy) && (
                                        <button
                                            onClick={handleCategoryEditClick}
                                            className="text-gray-500 hover:text-primary-500 transition-colors"
                                            title="Edit Category"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                        {video.tags && video.tags.length > 0 ? (
                            video.tags.map(tag => (
                                <span key={tag} className="bg-dark-700 text-gray-300 px-3 py-1 rounded-full text-sm border border-dark-600">
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-500 text-sm italic">No tags yet</span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center text-gray-500 text-sm border-t border-dark-700 pt-6">
                <span>Uploaded on {new Date(video.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700 max-w-md mx-4">
                        <h3 className="text-2xl font-bold text-white mb-4">Delete Video?</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete "{video.title}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={handleCancelDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoDetails;
