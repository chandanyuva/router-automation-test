const socketManager = require('./socketManager');
const logger = require('./logger');

/**
 * Emits a log message to all connected WebSocket clients
 * AND writes it to the standard backend log file.
 * 
 * @param {string} message - The text to log
 * @param {'info'|'warn'|'error'} type - The severity of the log
 */
const emitLog = (message, type = 'info') => {
    try {
        const io = socketManager.getIO();
        io.emit('live-log', {
            id: Date.now() + Math.random(), // Unique ID for React mapping
            timestamp: new Date().toISOString(),
            type,
            message
        });
        
        // Use standard Winston logger as well
        if (logger[type]) {
            logger[type](message);
        } else {
            logger.info(message);
        }
    } catch (e) {
        // If Socket.IO isn't ready or fails, fallback safely to standard logger
        if (logger[type]) {
            logger[type](message);
        } else {
            logger.info(message);
        }
    }
};

module.exports = { emitLog };