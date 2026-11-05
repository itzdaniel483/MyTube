// JSON database (lowdb-style file). 2026-11-05 claude: path from config (DB_PATH, outside the code folder),
// and writes go to a temp file first then rename, so a crash mid-write can't leave a broken database.
const fs = require('fs');
const path = require('path');
const config = require('./config');

const DB_FILE = path.resolve(config.dbPath);
const EMPTY = () => ({ videos: [], categories: [], tags: [], users: [] });

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY(), null, 2), { mode: 0o600 });

const readDb = () => {
    if (!fs.existsSync(DB_FILE)) return EMPTY();
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of ['users', 'videos', 'categories', 'tags']) if (!Array.isArray(db[k])) db[k] = [];
    return db;
};

const writeDb = (data) => {
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
};

module.exports = { readDb, writeDb, DB_FILE };
