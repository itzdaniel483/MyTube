import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdating(userId);
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(users.map(u => u.id === userId ? updatedUser : u));
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role');
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(userId);
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="text-gray-400 text-xl">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                User Management
            </h2>

            <div className="bg-dark-800 rounded-2xl border border-dark-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-dark-900 border-b border-dark-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-dark-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="text-white font-medium">
                                                    {u.displayName || u.username}
                                                </div>
                                                {u.displayName && (
                                                    <div className="text-xs text-gray-500">@{u.username}</div>
                                                )}
                                            </div>
                                            {u.id === user?.id && (
                                                <span className="text-xs bg-primary-500/20 text-primary-500 px-2 py-1 rounded-full border border-primary-500/30">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-400 text-sm">{u.email || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${u.role === 'admin'
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                            {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {u.id === user?.id ? (
                                                <span className="text-gray-500 text-sm">—</span>
                                            ) : (
                                                <>
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        disabled={updating === u.id}
                                                        className="px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all disabled:opacity-50"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id, u.displayName || u.username)}
                                                        disabled={deleting === u.id}
                                                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Delete user"
                                                    >
                                                        {deleting === u.id ? '...' : '🗑️'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No users found
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-dark-800 rounded-xl border border-dark-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">ℹ️ Role Information</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                    <li><strong className="text-purple-400">Admin:</strong> Can delete videos, manage users, and access settings</li>
                    <li><strong className="text-blue-400">User:</strong> Can upload videos and edit tags</li>
                </ul>
            </div>
        </div>
    );
};

export default UserManagement;
