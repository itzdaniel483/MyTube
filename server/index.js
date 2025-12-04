const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { readDb, writeDb } = require('./db');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 5000;

// Cloudflare / Proxy Support
app.set('trust proxy', 1);

app.use(cors({
    origin: ['http://localhost:5173', 'https://video.techydan.uk'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Cloudflare Access Middleware
const authenticateCF = (req, res, next) => {
    // Try to get email from header first (for direct cloudflared connections)
    let cfEmail = req.headers['cf-access-authenticated-user-email'];

    // Always try to decode JWT if available (to extract name and other fields)
    if (req.cookies && req.cookies.CF_Authorization) {
        try {
            // Decode JWT without verification (Cloudflare already verified it)
            const decoded = jwt.decode(req.cookies.CF_Authorization);
            console.log('=== Decoded JWT ===');
            console.log('JWT payload:', decoded);
            console.log('==================');

            if (decoded && decoded.email) {
                // Use JWT email if we don't have it from header
                if (!cfEmail) {
                    cfEmail = decoded.email;
                }
                // Always extract name from JWT
                req.cfName = decoded.name || decoded.common_name || decoded.given_name || '';
                console.log('Extracted name from JWT:', req.cfName);
                console.log('Available name fields:', {
                    name: decoded.name,
                    common_name: decoded.common_name,
                    given_name: decoded.given_name,
                    family_name: decoded.family_name
                });
            }
        } catch (err) {
            console.error('Error decoding JWT:', err);
        }
    }

    // Debug logging
    console.log('=== Auth Debug ===');
    console.log('Header email:', req.headers['cf-access-authenticated-user-email']);
    console.log('Cookie JWT:', req.cookies.CF_Authorization ? 'Present' : 'Missing');
    console.log('Final email:', cfEmail);
    console.log('==================');

    // Development Mode Mock
    const db = readDb();
    const settings = db.settings || { enableDevMock: true };

    if (!cfEmail && process.env.NODE_ENV !== 'production' && settings.enableDevMock) {
        req.user = {
            email: 'dev@example.com',
            username: 'Dev User',
            role: 'admin'
        };
        return next();
    }

    if (!cfEmail) {
        return res.status(401).json({ error: 'Missing Cloudflare Access token' });
    }

    let user = db.users.find(u => u.email === cfEmail);

    // JIT Provisioning
    if (!user) {
        const isFirstUser = db.users.length === 0;
        user = {
            id: uuidv4(),
            email: cfEmail,
            username: cfEmail.split('@')[0],
            name: req.cfName || '',
            role: isFirstUser ? 'admin' : 'user',
            createdAt: new Date().toISOString()
        };
        db.users.push(user);
        writeDb(db);
    } else if (req.cfName && user.name !== req.cfName) {
        // Update name if it changed or wasn't set
        user.name = req.cfName;
        writeDb(db);
    }

    req.user = user;
    next();
};

// Check auth status (for frontend context)
app.get('/api/auth/me', authenticateCF, (req, res) => {
    res.json({
        username: req.user.username,
        email: req.user.email,
        name: req.user.name,
        displayName: req.user.displayName || '',
        role: req.user.role,
        id: req.user.id
    });
});

// Logout endpoint - clears CF cookie and returns logout URL
app.post('/api/auth/logout', (req, res) => {
    const db = readDb();
    const settings = db.settings || {};

    res.clearCookie('CF_Authorization');

    // Return logout URL if available (for forcing re-auth)
    const logoutUrl = settings.logoutUrl || null;

    res.json({
        message: 'Logged out',
        logoutUrl
    });
});

// Auth middleware (now just checks if authenticateCF populated req.user)
const requireAuth = (req, res, next) => {
    authenticateCF(req, res, () => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        next();
    });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    authenticateCF(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Ensure thumbnails directory exists
const thumbDir = path.join(uploadDir, 'thumbnails');
if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir);
}

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// Helper to fix UTF-8 encoding from Multer
const fixUtf8 = (str) => Buffer.from(str, 'latin1').toString('utf8');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Fix encoding for the saved filename
        const originalName = fixUtf8(file.originalname);
        cb(null, Date.now() + '-' + originalName);
    }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
    res.send('Video Hosting Server Running');
});

app.get('/api/videos', (req, res) => {
    const db = readDb();
    const activeVideos = db.videos.filter(v => !v.deleted);
    res.json(activeVideos);
});

app.post('/api/upload', requireAuth, upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const { title, category, tags } = req.body;
    const db = readDb();
    const videoId = uuidv4();
    const thumbnailFilename = `thumb-${videoId}.png`;

    // Fix encoding for the title/display name
    const originalName = fixUtf8(req.file.originalname);

    ffmpeg(req.file.path)
        .screenshots({
            timestamps: ['20%'],
            filename: thumbnailFilename,
            folder: thumbDir,
            size: '320x180'
        })
        .on('end', () => {
            const newVideo = {
                id: videoId,
                title: title || originalName,
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`,
                thumbnail: `/uploads/thumbnails/${thumbnailFilename}`,
                category: category || 'Uncategorized',
                tags: tags ? JSON.parse(tags) : [],
                uploadedBy: req.user ? req.user.username : 'anonymous',
                createdAt: new Date().toISOString()
            };

            db.videos.push(newVideo);

            if (category && !db.categories.includes(category)) {
                db.categories.push(category);
            }

            if (tags) {
                const parsedTags = JSON.parse(tags);
                parsedTags.forEach(tag => {
                    if (!db.tags.includes(tag)) {
                        db.tags.push(tag);
                    }
                });
            }

            writeDb(db);
            res.json(newVideo);
        })
        .on('error', (err) => {
            console.error('Error generating thumbnail:', err);
            const newVideo = {
                id: videoId,
                title: title || req.file.originalname,
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`,
                thumbnail: null,
                category: category || 'Uncategorized',
                tags: tags ? JSON.parse(tags) : [],
                uploadedBy: req.user ? req.user.username : 'anonymous',
                createdAt: new Date().toISOString()
            };
            db.videos.push(newVideo);
            writeDb(db);
            res.json(newVideo);
        });
});



// Update video details (title, category, tags)
app.patch('/api/videos/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { title, category, tags } = req.body;
    const db = readDb();
    const video = db.videos.find(v => v.id === id);

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    // Only admin or uploader can edit
    if (req.user.role !== 'admin' && video.uploadedBy !== req.user.username) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    if (title) video.title = title;
    if (category) {
        video.category = category;
        // Add to categories if not exists
        if (db.categories && !db.categories.includes(category)) {
            db.categories.push(category);
        }
    }
    if (tags) {
        video.tags = tags;
        // Add new tags to global list
        tags.forEach(tag => {
            if (!db.tags.includes(tag)) {
                db.tags.push(tag);
            }
        });
    }

    writeDb(db);
    res.json(video);
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const db = readDb();
    res.json(db.categories || []);
});

// Add category (admin only)
app.post('/api/categories', requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const db = readDb();
    if (!db.categories) db.categories = [];

    if (db.categories.includes(name)) {
        return res.status(400).json({ error: 'Category already exists' });
    }

    db.categories.push(name);
    writeDb(db);
    res.json(db.categories);
});

// Rename category (admin only)
app.put('/api/categories/:name', requireAdmin, (req, res) => {
    const { name } = req.params;
    const { newName } = req.body;

    if (!newName) return res.status(400).json({ error: 'New name is required' });

    const db = readDb();
    if (!db.categories) db.categories = [];

    const index = db.categories.indexOf(name);
    if (index === -1) {
        return res.status(404).json({ error: 'Category not found' });
    }

    if (db.categories.includes(newName)) {
        return res.status(400).json({ error: 'Category with new name already exists' });
    }

    // Update category in list
    db.categories[index] = newName;

    // Update all videos with this category
    db.videos.forEach(v => {
        if (v.category === name) {
            v.category = newName;
        }
    });

    writeDb(db);
    res.json(db.categories);
});

// Delete category (admin only)
app.delete('/api/categories/:name', requireAdmin, (req, res) => {
    const { name } = req.params;
    const db = readDb();
    if (!db.categories) db.categories = [];

    const index = db.categories.indexOf(name);
    if (index === -1) {
        return res.status(404).json({ error: 'Category not found' });
    }

    db.categories.splice(index, 1);

    // Move videos in this category to 'Uncategorized'
    db.videos.forEach(v => {
        if (v.category === name) {
            v.category = 'Uncategorized';
        }
    });

    writeDb(db);
    res.json(db.categories);
});

// Soft delete video - moves to trash
app.delete('/api/videos/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const video = db.videos.find(v => v.id === id);

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    video.deleted = true;
    video.deletedAt = new Date().toISOString();
    writeDb(db);

    res.json({ message: 'Video moved to trash' });
});

// Get trash
app.get('/api/videos/trash', requireAdmin, (req, res) => {
    const db = readDb();
    const trashedVideos = db.videos.filter(v => v.deleted);
    res.json(trashedVideos);
});

// Restore video
app.patch('/api/videos/:id/restore', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const video = db.videos.find(v => v.id === id);

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    if (!video.deleted) {
        return res.status(400).json({ error: 'Video is not in trash' });
    }

    delete video.deleted;
    delete video.deletedAt;
    writeDb(db);

    res.json({ message: 'Video restored', video });
});

// Permanently delete video
app.delete('/api/videos/:id/permanent', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const videoIndex = db.videos.findIndex(v => v.id === id);

    if (videoIndex === -1) {
        return res.status(404).json({ error: 'Video not found' });
    }

    const video = db.videos[videoIndex];

    const videoPath = path.join(__dirname, 'uploads', path.basename(video.path));
    if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
    }

    if (video.thumbnail) {
        const thumbnailPath = path.join(__dirname, 'uploads', 'thumbnails', path.basename(video.thumbnail));
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }
    }

    db.videos.splice(videoIndex, 1);
    writeDb(db);

    res.json({ message: 'Video permanently deleted' });
});

app.get('/api/categories', (req, res) => {
    const db = readDb();
    res.json(db.categories);
});

app.get('/api/tags', (req, res) => {
    const db = readDb();
    res.json(db.tags);
});

// Get all users (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
    const db = readDb();
    const settings = db.settings || {};

    // Filter out test user if SSO is enabled (dev mock disabled)
    let users = db.users;
    if (!settings.enableDevMock) {
        users = users.filter(u => u.username !== 'testuser');
    }

    const userList = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName || '',
        role: u.role || 'user'
    }));
    res.json(userList);
});

// Update user role (admin only)
app.patch('/api/users/:id/role', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    writeDb(db);

    res.json({
        id: user.id,
        username: user.username,
        role: user.role
    });
});

// Delete user (admin only)
app.delete('/api/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = readDb();

    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const user = db.users[userIndex];

    // Prevent deleting yourself
    if (user.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Remove user from database
    db.users.splice(userIndex, 1);
    writeDb(db);

    res.json({ message: 'User deleted successfully', id });
});

// Update user profile (any authenticated user can update their own profile)
app.patch('/api/users/:id/profile', requireAuth, (req, res) => {
    const { id } = req.params;
    const { displayName } = req.body;

    // Users can only update their own profile (unless admin)
    if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (displayName !== undefined) {
        user.displayName = displayName;
    }

    writeDb(db);

    res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role
    });
});

// Get settings (admin only)
app.get('/api/settings', requireAdmin, (req, res) => {
    const db = readDb();
    res.json(db.settings || {
        enableDevMock: true,
        logoutUrl: ''
    });
});

// Update settings (admin only)
app.patch('/api/settings', requireAdmin, (req, res) => {
    const { enableDevMock, logoutUrl } = req.body;
    const db = readDb();

    db.settings = {
        ...db.settings,
        enableDevMock: enableDevMock !== undefined ? enableDevMock : db.settings.enableDevMock,
        logoutUrl: logoutUrl !== undefined ? logoutUrl : db.settings.logoutUrl
    };

    writeDb(db);
    res.json(db.settings);
});

writeDb(db);
res.json(db.settings);
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
