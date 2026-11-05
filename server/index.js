console.log('--- SERVER INITIALIZING ---');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { readDb, writeDb } = require('./db');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const config = require('./config');

// FFmpeg setup with error handling
let ffmpeg, ffmpegPath, ffprobePath;
try {
    ffmpeg = require('fluent-ffmpeg');
    ffmpegPath = require('ffmpeg-static');
    ffprobePath = require('ffprobe-static').path;
    console.log('FFmpeg binaries loaded successfully');
} catch (err) {
    console.error('FAILED TO LOAD FFMPEG:', err);
}

const app = express();

console.log('Starting server...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${config.port}`);
console.log(`Domain: ${config.appDomain}`);
console.log(`App URL: ${config.appUrl}`);
console.log(`CORS Origins: ${config.corsOrigins.join(', ')}`);

// Only trust X-Forwarded-* when a proxy is in front (TRUST_PROXY=1, e.g. behind Nginx Proxy Manager / Cloudflare).
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

// CORS - uses config.corsOrigins
app.use(cors({
    origin: config.corsOrigins,
    credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => { // basic security headers
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    next();
});

// Sign-in (auth.js): Cloudflare Access tokens are verified; demo mode uses a signed cookie. Nothing else is trusted.
const auth = require('./auth');
const sessionSecret = (() => {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    const f = path.join(path.dirname(path.resolve(config.dbPath)), 'session.secret');
    if (!fs.existsSync(f)) fs.writeFileSync(f, require('crypto').randomBytes(32).toString('hex'), { mode: 0o600 });
    return fs.readFileSync(f, 'utf8').trim();
})();
auth.demoRoutes(app, sessionSecret);
app.get('/api/auth/config', (req, res) => res.json({ mode: auth.MODE, signIn: auth.MODE === 'demo' ? '/demo/signin' : null }));
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,]+/).filter(Boolean);

const authenticateCF = async (req, res, next) => {
    let who;
    try { who = await auth.identify(req, sessionSecret); } catch { who = null; }
    if (!who) return res.status(401).json({ error: 'Sign in required' });
    const db = readDb();
    let user = db.users.find(u => (u.email || '').toLowerCase() === who.email);
    if (!user) {
        // New person. Admins: ADMIN_EMAILS if set, the demo admin, or (when neither is set) the very first person.
        const admin = who.demoRole ? who.demoRole === 'admin' : ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(who.email) : db.users.length === 0;
        user = { id: uuidv4(), email: who.email, username: who.email.split('@')[0], name: who.name || '', role: admin ? 'admin' : 'user', createdAt: new Date().toISOString() };
        db.users.push(user);
        writeDb(db);
    } else if (who.name && user.name !== who.name) {
        user.name = who.name;
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
    res.clearCookie(auth.DEMO_COOKIE);

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

// Ensure uploads directory exists (UPLOADS_DIR, outside the code folder)
const uploadDir = path.resolve(config.uploadsDir);
fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Ensure thumbnails directory exists
const thumbDir = path.join(uploadDir, 'thumbnails');
if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir);
}

// Set ffmpeg path if available
if (ffmpeg && ffmpegPath && ffprobePath) {
    try {
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
        console.log('FFmpeg paths set');
    } catch (err) {
        console.error('Error setting FFmpeg paths:', err);
    }
} else {
    console.warn('WARNING: FFmpeg not fully loaded. Video processing will fail.');
}

// Videos and thumbnails are only for signed-in people.
app.use('/uploads', (req, res, next) => authenticateCF(req, res, next), express.static(uploadDir, { dotfiles: 'deny', index: false }));

// Helper to fix UTF-8 encoding from Multer
const fixUtf8 = (str) => Buffer.from(str, 'latin1').toString('utf8');

// Multer setup: size limit (MAX_FILE_SIZE), video files only, and a safe generated file name.
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi']);
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(fixUtf8(file.originalname)).toLowerCase()}`)
});
const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSize, files: 1, fields: 10, fieldSize: 10_000 },
    fileFilter: (req, file, cb) => {
        const ok = VIDEO_EXT.has(path.extname(file.originalname || '').toLowerCase()) && /^video\//.test(file.mimetype || '');
        cb(ok ? null : Object.assign(new Error('Only video files can be uploaded'), { status: 400 }), ok);
    }
});
// Tags arrive as JSON text; anything odd becomes no tags instead of crashing the server.
const parseTags = (t) => { try { const a = typeof t === 'string' ? JSON.parse(t) : t; return Array.isArray(a) ? a.map((x) => String(x).trim().slice(0, 50)).filter(Boolean).slice(0, 30) : []; } catch { return []; } };


app.get('/api/videos', requireAuth, (req, res) => {
    const db = readDb();
    const activeVideos = db.videos.filter(v => !v.deleted);
    res.json(activeVideos);
});

app.post('/api/upload', requireAuth, upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const { title, category } = req.body;
    const tagList = parseTags(req.body.tags);
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
            const db = readDb(); // read now, not before the thumbnail (another upload may have finished meanwhile)
            const newVideo = {
                id: videoId,
                title: title || originalName,
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`,
                thumbnail: `/uploads/thumbnails/${thumbnailFilename}`,
                category: category || 'Uncategorized',
                tags: tagList,
                uploadedBy: req.user ? req.user.username : 'anonymous',
                createdAt: new Date().toISOString()
            };

            db.videos.push(newVideo);

            if (category && !db.categories.includes(category)) {
                db.categories.push(category);
            }

            if (tagList.length) {
                tagList.forEach(tag => {
                    if (!db.tags.includes(tag)) {
                        db.tags.push(tag);
                    }
                });
            }

            writeDb(db);
            res.json(newVideo);
        })
        .on('error', (err) => {
            console.error('Error generating thumbnail:', err.message);
            const db = readDb();
            const newVideo = {
                id: videoId,
                title: title || req.file.originalname,
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`,
                thumbnail: null,
                category: category || 'Uncategorized',
                tags: tagList,
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
    const { title, category } = req.body;
    const tags = req.body.tags === undefined ? undefined : parseTags(req.body.tags);
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

// Serve static files from the React app (but not for /api or /uploads routes)
const publicPath = path.join(__dirname, 'public');
console.log(`Attempting to serve static files from: ${publicPath}`);

// Check if public directory exists
if (fs.existsSync(publicPath)) {
    console.log('Public directory found');
    app.use(express.static(publicPath));

    // The "catchall" handler: for any request that doesn't match API routes
    // send back React's index.html file for client-side routing
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('index.html found');
        app.get(/^(?!\/api|\/uploads).*$/, (req, res) => {
            res.sendFile(indexPath);
        });
    } else {
        console.warn('WARNING: index.html not found in public directory');
        app.get(/^(?!\/api|\/uploads).*$/, (req, res) => {
            res.status(503).send('Frontend not available - build may have failed');
        });
    }
} else {
    console.error('ERROR: Public directory not found!');
    app.get(/^(?!\/api|\/uploads).*$/, (req, res) => {
        res.status(503).send('Frontend not available - public directory missing');
    });
}

// Errors (upload too big, wrong file type, bad JSON) as a short message, never a stack trace.
app.use((err, req, res, next) => {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || err.statusCode || 500;
    if (status >= 500) console.error(req.method, req.path, err.message);
    res.status(status).json({ error: status === 413 ? 'That file is too big' : status < 500 ? err.message : 'Something went wrong' });
});

const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(config.port, HOST, () => {
    console.log(`✓ Server running on http://${HOST}:${config.port} (sign-in: ${auth.MODE})`);
    console.log(`✓ Ready to accept connections`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
