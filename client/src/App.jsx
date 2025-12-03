import React, { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import VideoCard from './components/VideoCard';
import UploadForm from './components/UploadForm';
import VideoDetails from './components/VideoDetails';
import UserManagement from './components/UserManagement';
import SettingsPage from './components/SettingsPage';
import Trash from './components/Trash';
import MyVideos from './components/MyVideos';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const [view, setView] = useState('home'); // home, upload, watch, users, trash, myvideos
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const { user, logout, login, loading } = useAuth();

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error('Failed to fetch videos', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const catRes = await fetch('/api/categories');
      const tagRes = await fetch('/api/tags');
      setCategories(await catRes.json());
      setTags(await tagRes.json());
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchMetadata();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'home' && user) {
      fetchVideos();
    }
  }, [view, user]);

  const handleUploadSuccess = (newVideo) => {
    setVideos([...videos, newVideo]);
    fetchMetadata(); // Refresh tags/categories
    setView('home');
  };

  const handleVideoClick = (video) => {
    setCurrentVideo(video);
    setView('watch');
  };

  const handleUploadClick = () => {
    setView('upload');
  };

  const handleVideoDelete = async (videoId) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setVideos(videos.filter(v => v.id !== videoId));
      } else {
        console.error('Failed to delete video');
      }
    } catch (err) {
      console.error('Error deleting video', err);
    }
  };

  const filteredVideos = videos.filter(video => {
    if (selectedCategory && video.category !== selectedCategory) return false;
    if (selectedTag && (!video.tags || !video.tags.includes(selectedTag))) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-white">
        <div className="text-center animate-pulse">
          <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
          <p className="text-gray-400">Verifying your access via Cloudflare Zero Trust</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-white">
        <div className="text-center max-w-2xl mx-4">
          {/* Logo/Icon */}
          <div className="text-6xl mb-6">🎬</div>

          {/* Main Heading */}
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
            Welcome to MyTube
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            Your private video hosting platform, secured by Cloudflare Zero Trust
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-dark-800 p-6 rounded-xl border border-dark-700">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-bold mb-2">Secure Access</h3>
              <p className="text-sm text-gray-400">Protected by enterprise-grade authentication</p>
            </div>
            <div className="bg-dark-800 p-6 rounded-xl border border-dark-700">
              <div className="text-3xl mb-3">📹</div>
              <h3 className="font-bold mb-2">Video Hosting</h3>
              <p className="text-sm text-gray-400">Upload and manage your video library</p>
            </div>
            <div className="bg-dark-800 p-6 rounded-xl border border-dark-700">
              <div className="text-3xl mb-3">🏷️</div>
              <h3 className="font-bold mb-2">Smart Organization</h3>
              <p className="text-sm text-gray-400">Categories and tags for easy discovery</p>
            </div>
          </div>

          {/* CTA */}
          {isLocalhost ? (
            <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-xl p-6 text-yellow-200">
              <p className="font-semibold mb-2">⚠️ Development Mode</p>
              <p className="text-sm mb-4">You're accessing this on localhost. To log in:</p>
              <ul className="text-sm text-left max-w-md mx-auto space-y-2">
                <li>• Enable "Dev Mock" in Settings (if you're an admin)</li>
                <li>• Or access via your Cloudflare domain for SSO</li>
              </ul>
            </div>
          ) : (
            <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700">
              {new URLSearchParams(window.location.search).get('status') === 'logged_out' ? (
                <div className="animate-fade-in">
                  <div className="text-5xl mb-4">👋</div>
                  <h2 className="text-2xl font-bold text-white mb-2">You have been signed out</h2>
                  <p className="text-gray-400 mb-6">
                    Thank you for using MyTube. Your session has been securely closed.
                  </p>
                  <button
                    onClick={() => {
                      const cfLogoutUrl = localStorage.getItem('cf_logout_url');
                      if (cfLogoutUrl) {
                        // Create hidden iframe to logout via Cloudflare
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = cfLogoutUrl;
                        document.body.appendChild(iframe);

                        // Wait a moment for logout to process, then reload
                        setTimeout(() => {
                          login();
                          window.location.href = '/';
                        }, 1000);
                      } else {
                        login();
                        window.location.href = '/';
                      }
                    }}
                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/25"
                  >
                    Sign In Again
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 mb-4">
                    This application is protected by Cloudflare Access.
                  </p>
                  <p className="text-sm text-gray-400">
                    If you're seeing this page, authentication may have failed. Try refreshing or contact your administrator.
                  </p>
                  <button
                    onClick={login}
                    className="mt-6 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/25"
                  >
                    Retry Authentication
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 font-sans text-gray-100 selection:bg-primary-500 selection:text-white">
      {/* Header */}
      <header className="bg-dark-900/80 backdrop-blur-md border-b border-dark-700 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-300 cursor-pointer"
              onClick={() => setView('home')}
            >
              MyTube
            </h1>

            <nav className="flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'home' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
              >
                Gallery
              </button>
              <button
                onClick={() => setView('myvideos')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'myvideos' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
              >
                My Videos
              </button>
              <button
                onClick={handleUploadClick}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'upload' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
              >
                Upload
              </button>
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setView('users')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'users' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'settings' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => setView('trash')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'trash' ? 'bg-red-600/20 text-red-500 border border-red-600/50' : 'text-gray-400 hover:text-red-400 hover:bg-dark-800'}`}
                  >
                    Trash 🗑️
                  </button>
                </>
              )}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-dark-700">
                <div className="flex flex-col items-end">
                  <span className="text-gray-200 text-sm font-medium">{user.displayName || user.name || user.username}</span>
                  <span className="text-gray-500 text-xs">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-12">

        {/* Upload View */}
        {view === 'upload' && (
          <div className="animate-fade-in">
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* My Videos View */}
        {view === 'myvideos' && (
          <div className="animate-fade-in">
            <MyVideos />
          </div>
        )}

        {/* Watch View */}
        {view === 'watch' && currentVideo && (
          <div className="space-y-8 animate-fade-in">
            <button
              onClick={() => setView('home')}
              className="group flex items-center text-gray-400 hover:text-primary-500 transition-colors"
            >
              <span className="mr-2 group-hover:-translate-x-1 transition-transform">&larr;</span>
              Back to Gallery
            </button>

            <VideoPlayer src={`${currentVideo.path}`} />

            <VideoDetails
              video={currentVideo}
              onTagsUpdate={(updatedVideo) => {
                setCurrentVideo(updatedVideo);
                // Update in videos list too
                setVideos(videos.map(v => v.id === updatedVideo.id ? updatedVideo : v));
                fetchMetadata(); // Refresh global tags
              }}
              onVideoDeleted={(videoId) => {
                // Remove from videos list and navigate home
                setVideos(videos.filter(v => v.id !== videoId));
                setView('home');
                fetchMetadata(); // Refresh metadata
              }}
            />
          </div>
        )}

        {/* Gallery View */}
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-dark-800 p-6 rounded-2xl border border-dark-700 shadow-lg items-center">
              <span className="text-gray-400 font-medium mr-2">Filter by:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-w-[150px]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="p-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-w-[150px]"
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>

              {(selectedCategory || selectedTag) && (
                <button
                  onClick={() => { setSelectedCategory(''); setSelectedTag(''); }}
                  className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Video Grid */}
            {filteredVideos.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-2xl font-bold text-white mb-2">No videos found</h3>
                <p className="text-gray-400 mb-8">Upload a video to get started or try clearing your filters.</p>
                <button
                  onClick={handleUploadClick}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
                >
                  Upload Video
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filteredVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={handleVideoClick}
                    onDelete={handleVideoDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users View */}
        {view === 'users' && (
          <div className="animate-fade-in">
            <UserManagement />
          </div>
        )}

        {/* Settings View */}
        {view === 'settings' && user.role === 'admin' && (
          <div className="animate-fade-in">
            <SettingsPage />
          </div>
        )}

        {/* Trash View */}
        {view === 'trash' && (
          <div className="animate-fade-in">
            <Trash />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
