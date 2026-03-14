const wifiService = require('./wifiService');
const socketManager = require('../utils/socketManager');
const logger = require('../utils/logger');

let pollingInterval = null;

const startPolling = () => {
    if (pollingInterval) return; // Already running

    logger.info('Starting background Wi-Fi status polling (5s interval)');
    
    pollingInterval = setInterval(async () => {
        try {
            // Get the current status from netsh
            const status = await wifiService.getStatus();
            
            // Broadcast it to all connected WebSocket clients
            const io = socketManager.getIO();
            io.emit('wifi-status', status);
            
        } catch (error) {
            logger.error(`Wi-Fi Polling Error: ${error.message}`);
        }
    }, 5000);
};

const stopPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        logger.info('Stopped background Wi-Fi status polling');
    }
};

module.exports = { startPolling, stopPolling };