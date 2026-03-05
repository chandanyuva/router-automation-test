const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
// This will create a file named 'database.sqlite' in the db folder
const dbPath = path.join(__dirname, 'database.sqlite');
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
  // 4. Seed an initial Admin user if the table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const defaultPassword = 'admin'; // You should change this after first login
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`).run('admin@local.host', hash, 'admin');
    logger.info('Created default admin user: admin@local.host / admin');
  }
  logger.info('Database initialized successfully.');
}
// Run the initialization
initializeDB();
// Export the db instance for use in our controllers/services
module.exports = db;
