// Configuration file for multi-instance deployment
// All settings can be overridden via environment variables

module.exports = {
    // Server configuration
    port: process.env.PORT || 5000,

    // Domain configuration
    // Set APP_DOMAIN in environment (e.g., "video.techydan.uk" or "test.techydan.uk")
    appDomain: process.env.APP_DOMAIN || 'localhost',

    // Automatically construct the full URL
    get appUrl() {
        const protocol = this.appDomain === 'localhost' ? 'http' : 'https';
        return `${protocol}://${this.appDomain}`;
    },

    // CORS origins - automatically includes the app domain
    get corsOrigins() {
        return [
            'http://localhost:5173', // Development
            this.appUrl,              // Current instance domain
            process.env.ADDITIONAL_CORS_ORIGINS || '' // Optional additional origins
        ].filter(Boolean);
    },

    // JWT Secret for authentication
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

    // Upload configuration
    uploadsDir: process.env.UPLOADS_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000'), // 500MB default

    // Database configuration
    dbPath: process.env.DB_PATH || './db.json'
};
