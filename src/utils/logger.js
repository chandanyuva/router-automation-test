const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
// Configure the daily transport
const fileTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false, // Compress old logs to save space
  maxSize: '20m',      // Max size per file before rotating early
  maxFiles: '30d'      // KEEP LOGS FOR 30 DAYS, THEN DELETE
});
// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    fileTransport,
    // Also log to the console during development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
