import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        enableDevMock: true,
        logoutUrl: '',
        appTitle: 'MyTube',
        maxUploadSizeMB: 500,
        defaultCategory: 'Uncategorized'
    });
    const [profile, setProfile] = useState({
        displayName: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [message, setMessage] = useState(null);
    const [profileMessage, setProfileMessage] = useState(null);

    // Category Management State
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [categoryMessage, setCategoryMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchCategories();
        if (user) {
            setProfile({ displayName: user.displayName || '' });
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings', {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

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
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully' });
                // Reload page if app title changed to update header
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMessage(null);

        try {
            const res = await fetch(`/api/users/${user.id}/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profile)
            });

            if (res.ok) {
                setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
                // Reload to update header
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setProfileMessage({ type: 'error', text: 'Failed to update profile' });
            }
        } catch (err) {
            setProfileMessage({ type: 'error', text: 'Error updating profile' });
        } finally {
            setSavingProfile(false);
        }
    };

    // Category Management Handlers
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newCategory.trim() })
            });

            if (res.ok) {
                const updatedCategories = await res.json();
                setCategories(updatedCategories);
                setNewCategory('');
                setCategoryMessage({ type: 'success', text: 'Category added successfully' });
            } else {
                const error = await res.json();
                setCategoryMessage({ type: 'error', text: error.error || 'Failed to add category' });
            }
        } catch (err) {
            setCategoryMessage({ type: 'error', text: 'Error adding category' });
        }
    };

    const handleDeleteCategory = async (categoryName) => {
        if (!confirm(`Are you sure you want to delete "${categoryName}"? Videos in this category will be moved to "Uncategorized".`)) return;

        try {
            const res = await fetch(`/api/categories/${encodeURIComponent(categoryName)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                const updatedCategories = await res.json();
                setCategories(updatedCategories);
                setCategoryMessage({ type: 'success', text: 'Category deleted successfully' });
            } else {
                const error = await res.json();
                setCategoryMessage({ type: 'error', text: error.error || 'Failed to delete category' });
            }
        } catch (err) {
            setCategoryMessage({ type: 'error', text: 'Error deleting category' });
        }
    };

    const startEditingCategory = (category) => {
        setEditingCategory(category);
        setEditCategoryName(category);
    };

    const handleUpdateCategory = async () => {
        if (!editCategoryName.trim() || editCategoryName === editingCategory) {
            setEditingCategory(null);
            return;
        }

        try {
            const res = await fetch(`/api/categories/${encodeURIComponent(editingCategory)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newName: editCategoryName.trim() })
            });

            if (res.ok) {
                const updatedCategories = await res.json();
                setCategories(updatedCategories);
                setCategoryMessage({ type: 'success', text: 'Category updated successfully' });
            } else {
                const error = await res.json();
                setCategoryMessage({ type: 'error', text: error.error || 'Failed to update category' });
            }
        } catch (err) {
            setCategoryMessage({ type: 'error', text: 'Error updating category' });
        } finally {
            setEditingCategory(null);
        }
    };

    if (loading) return <div className="text-white text-center mt-10">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

            {/* User Profile Section - Available to all users */}
            <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700 shadow-xl">
                <h2 className="text-2xl font-semibold text-white mb-6">Your Profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 mb-2">Display Name</label>
                        <input
                            type="text"
                            value={profile.displayName}
                            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="Enter your display name"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            This name will be displayed in the app header instead of your username.
                        </p>
                    </div>

                    {profileMessage && (
                        <div className={`p-4 rounded-xl ${profileMessage.type === 'success' ? 'bg-green-900/20 text-green-200' : 'bg-red-900/20 text-red-200'}`}>
                            {profileMessage.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={savingProfile}
                        className={`px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/25 ${savingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            {/* Admin Settings - Only visible to admins */}
            {user?.role === 'admin' && (
                <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700 shadow-xl space-y-8">
                    <h2 className="text-2xl font-semibold text-white mb-6">Admin Settings</h2>

                    {/* Category Management */}
                    <div className="border-b border-dark-700 pb-8">
                        <h3 className="text-xl font-semibold text-white mb-4">Category Management</h3>

                        {/* Add Category */}
                        <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="New category name"
                            />
                            <button
                                type="submit"
                                disabled={!newCategory.trim()}
                                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                Add
                            </button>
                        </form>

                        {/* Category List */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {categories.length === 0 ? (
                                <p className="text-gray-500 italic">No categories created yet.</p>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat} className="flex items-center justify-between bg-dark-900 p-3 rounded-lg border border-dark-700 group">
                                        {editingCategory === cat ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary-500"
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdateCategory} className="text-green-400 hover:text-green-300">✓</button>
                                                <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-300">✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-gray-300">{cat}</span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditingCategory(cat)}
                                                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded"
                                                        title="Rename"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat)}
                                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {categoryMessage && (
                            <div className={`mt-4 p-3 rounded-xl text-sm ${categoryMessage.type === 'success' ? 'bg-green-900/20 text-green-200' : 'bg-red-900/20 text-red-200'}`}>
                                {categoryMessage.text}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Application Settings */}
                        <div className="border-b border-dark-700 pb-6">
                            <h3 className="text-xl font-semibold text-white mb-4">Application</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 mb-2">App Title</label>
                                    <input
                                        type="text"
                                        value={settings.appTitle}
                                        onChange={(e) => setSettings({ ...settings, appTitle: e.target.value })}
                                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        placeholder="MyTube"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        The title displayed in the app header.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-2">Max Upload Size (MB)</label>
                                    <input
                                        type="number"
                                        value={settings.maxUploadSizeMB}
                                        onChange={(e) => setSettings({ ...settings, maxUploadSizeMB: parseInt(e.target.value) })}
                                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        min="1"
                                        max="5000"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Maximum file size for video uploads.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-2">Default Category</label>
                                    <select
                                        value={settings.defaultCategory}
                                        onChange={(e) => setSettings({ ...settings, defaultCategory: e.target.value })}
                                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                    >
                                        <option value="Uncategorized">Uncategorized</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Pre-selected category for new video uploads.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Authentication Settings */}
                        <div className="border-b border-dark-700 pb-6">
                            <h3 className="text-xl font-semibold text-white mb-4">Authentication</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 mb-2">Cloudflare Logout URL</label>
                                    <input
                                        type="text"
                                        value={settings.logoutUrl}
                                        onChange={(e) => setSettings({ ...settings, logoutUrl: e.target.value })}
                                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        placeholder="https://<your-team>.cloudflareaccess.com/cdn-cgi/access/logout"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        The URL to redirect users to when they log out.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between bg-dark-900 p-4 rounded-xl border border-dark-700">
                                    <div>
                                        <h4 className="text-white font-medium">Require SSO Authentication</h4>
                                        <p className="text-sm text-gray-400 mt-1">
                                            When enabled, forces Cloudflare SSO. When disabled, allows local dev user (dev@example.com).
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!settings.enableDevMock}
                                            onChange={(e) => setSettings({ ...settings, enableDevMock: !e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                {settings.enableDevMock && (
                                    <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-900/50 rounded-xl text-yellow-200 text-sm flex items-start">
                                        <span className="mr-2">⚠️</span>
                                        <p>
                                            <strong>Dev Mode Active:</strong> SSO is disabled. Local dev user (dev@example.com) can access the app without Cloudflare authentication.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Message */}
                        {message && (
                            <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-900/20 text-green-200' : 'bg-red-900/20 text-red-200'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between pt-4 border-t border-dark-700">
                            <button
                                type="button"
                                onClick={() => setSettings({
                                    enableDevMock: true,
                                    logoutUrl: '',
                                    appTitle: 'MyTube',
                                    maxUploadSizeMB: 500,
                                    defaultCategory: 'Uncategorized'
                                })}
                                className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Reset to Defaults
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className={`px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/25 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
