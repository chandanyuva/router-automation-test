const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    // Record start time
    const start = process.hrtime();

    // Hook into the response 'finish' event to log when the request is complete
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

        // Extract user email if they are authenticated (from auth middleware)
        const userEmail = req.user ? req.user.email : 'Unauthenticated';

        // Log the event with structured metadata
        logger.info(`HTTP ${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTimeMs: Number(timeInMs),
            user: userEmail,
            ip: req.ip
        });
    });

    next();
};

module.exports = requestLogger;