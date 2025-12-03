const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ videos: [], categories: [], tags: [], users: [] }, null, 2));
}

const readDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        return { videos: [], categories: [], tags: [], users: [] };
    }
    const data = fs.readFileSync(DB_FILE);
    const db = JSON.parse(data);

    // Ensure all arrays exist (Schema Migration)
    if (!db.users) db.users = [];
    if (!db.videos) db.videos = [];
    if (!db.categories) db.categories = [];
    if (!db.tags) db.tags = [];

    return db;
};

const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

module.exports = { readDb, writeDb };
