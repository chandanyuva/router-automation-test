const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const fileTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '30d'
});

const logger = winston.createLogger({
  level: 'info',
  // Use structured JSON for the physical log files
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    fileTransport,
    // Keep console output pretty and readable for humans
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message} ${Object.keys(info).length > 2 ? JSON.stringify(info, (k, v) => (k === 'level' || k === 'message' || k === 'timestamp' ? undefined : v)) : ''}`)
      )
    })
  ]
});

module.exports = logger;