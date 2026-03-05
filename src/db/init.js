const Database = require('better-sqlite3');

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const { runSeed } = require('./seed'); // Import our new seed script
const dbPath = path.join(__dirname, 'database.sqlite');

// Check if the file exists BEFORE we let better-sqlite3 create it
const dbExists = fs.existsSync(dbPath);

const db = new Database(dbPath, { verbose: (msg) => logger.info(`[DB] ${msg}`) });


function initializeDB() {
  logger.info('Initializing Database Tables...');
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
  logger.info('Database tables verified/created successfully.');
}

// Run table creation
initializeDB();

// Only run the seed script if the database file was just created
if (!dbExists) {
  logger.info('New database detected. Triggering seed script...');
  runSeed(db);
} else {
  logger.info('Existing database found. Skipping seed script.');
}

module.exports = db;
