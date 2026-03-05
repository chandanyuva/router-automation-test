const express = require('express');
const router = express.Router();
const switchController = require('../controllers/switchController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminCheck');

// All routes here require authentication
router.use(isAuthenticated);

// Read operations (available to any authenticated user)
router.get('/', switchController.getAllSwitches);
router.get('/:id', switchController.getSwitchById);

// Write/Delete operations (require Admin privileges)
router.post('/', isAdmin, switchController.addSwitch);
router.delete('/:id', isAdmin, switchController.deleteSwitch);
module.exports = router;
