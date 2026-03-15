const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Note: We cannot import logger here anymore, because logger will soon 
// import this file. That creates a circular dependency! 
// We will just use console.log for DB initialization steps.
const dbPath = path.join(__dirname, 'database.sqlite');
const dbExists = fs.existsSync(dbPath);

const db = new Database(dbPath, { verbose: (msg) => console.log(`[DB] ${msg}`) });

// HARDENING: Enable Write-Ahead Logging for massively improved concurrent performance
db.pragma('journal_mode = WAL');
// HARDENING: Optimize synchronous setting for WAL mode
db.pragma('synchronous = NORMAL');

function initializeDB() {
  console.log('Initializing Database Tables...');

  // 1. Create Switch Nodes Table
  db.exec(`
        CREATE TABLE IF NOT EXISTS switch_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            switch_node_ip TEXT NOT NULL,
            switch_node_mac TEXT NOT NULL UNIQUE
        )
    `);

  // 2. Create Routers Table
  db.exec(`
        CREATE TABLE IF NOT EXISTS routers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            manufacturer TEXT,
            model TEXT,
            country TEXT,
            serial_number TEXT,
            category TEXT,
            power_status TEXT DEFAULT 'off',
            switch_node_id INTEGER,
            position_in_switch INTEGER,
            wireless_ssid_24ghz TEXT,
            wireless_ssid_5ghz TEXT,
            wireless_ssid_6ghz TEXT,
            wireless_password TEXT,
            security_types TEXT,
            admin_page_url TEXT,
            admin_page_username TEXT,
            admin_page_password TEXT,
            FOREIGN KEY (switch_node_id) REFERENCES switch_nodes(id)
        )
    `);

  // 3. Create Users Table
  db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    `);

  // 4. NEW: Create Logs Table
  db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            level TEXT,
            message TEXT,
            metadata JSON
        )
    `);

  console.log('Database tables verified/created successfully.');
}

// Run table creation
initializeDB();

// Only run the seed script if the database file was just created
if (!dbExists) {
  console.log('New database detected. Triggering seed script...');
  const { runSeed } = require('./seed');
  runSeed(db);
} else {
  console.log('Existing database found. Skipping seed script.');
}

module.exports = db;