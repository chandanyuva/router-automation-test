const wifiService = require('../services/wifiService');
const logger = require('../utils/logger');

/**
 * GET /api/wifi/scan
 */
async function scan(req, res) {
    try {
        const ssids = await wifiService.scanNetworks();
        res.json({ success: true, count: ssids.length, ssids });
    } catch (error) {
        logger.error(`Error in wifiController.scan: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to scan for networks' });
    }
}

/**
 * POST /api/wifi/connect
 * Body: { ssid: "string", password: "string", securityType: "string" }
 */
async function connect(req, res) {
    const { ssid, password, securityType } = req.body;

    if (!ssid) {
        return res.status(400).json({ success: false, error: 'SSID is required' });
    }

    try {
        const connected = await wifiService.connectToNetwork(ssid, password, securityType);

        if (connected) {
            res.json({ success: true, message: `Successfully connected to ${ssid}` });
        } else {
            res.status(500).json({ success: false, error: `Failed or timed out connecting to ${ssid}` });
        }
    } catch (error) {
        logger.error(`Error in wifiController.connect: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal server error during connection attempt' });
    }
}

/**
 * POST /api/wifi/disconnect
 */
async function disconnect(req, res) {
    try {
        const success = await wifiService.disconnect();
        if (success) {
            res.json({ success: true, message: 'Successfully disconnected from Wi-Fi' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to disconnect from Wi-Fi' });
        }
    } catch (error) {
        logger.error(`Error in wifiController.disconnect: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal server error during disconnect' });
    }
}

/**
 * GET /api/wifi/status
 */
async function status(req, res) {
    try {
        const currentStatus = await wifiService.getStatus();
        res.json({ success: true, data: currentStatus });
    } catch (error) {
        logger.error(`Error in wifiController.status: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to get Wi-Fi status' });
    }
}

module.exports = {
    scan,
    connect,
    disconnect,
    status
};