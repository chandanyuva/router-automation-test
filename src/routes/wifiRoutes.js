const express = require('express');
const router = express.Router();
const wifiController = require('../controllers/wifiController');
const { isAuthenticated } = require('../middleware/auth');

// Protect all Wi-Fi routes with authentication and admin privileges
router.use(isAuthenticated);

// Routes
router.get('/scan', wifiController.scan);
router.get('/status', wifiController.status);
router.post('/connect', wifiController.connect);
router.post('/disconnect', wifiController.disconnect);

module.exports = router;