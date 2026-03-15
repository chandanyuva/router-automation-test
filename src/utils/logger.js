const winston = require('winston');
const Transport = require('winston-transport');
const db = require('../db/init');

// Create a custom Transport class that writes to SQLite
class SQLiteTransport extends Transport {
  constructor(opts) {
    super(opts);
    // Prepare the statement once for maximum performance
    this.insertStmt = db.prepare('INSERT INTO system_logs (level, message, metadata) VALUES (?, ?, ?)');
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Destructure standard fields, keep the rest as a metadata object
    const { level, message, timestamp, ...metadata } = info;

    try {
      this.insertStmt.run(level, message, JSON.stringify(metadata));
    } catch (err) {
      console.error("Failed to write log to SQLite:", err);
    }

    // Call the callback to indicate the log was processed
    if (callback) {
      callback();
    }
  }
}

// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(), // Adds a timestamp to the 'info' object
    winston.format.json()       // Formats metadata properly
  ),
  transports: [
    // 1. Send all logs to our new SQLite transport
    new SQLiteTransport(),

    // 2. Also log to the console during development (with pretty colors)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => {
          const { level, message, timestamp, ...meta } = info;
          const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaString}`;
        })
      )
    })
  ]
});

module.exports = logger;