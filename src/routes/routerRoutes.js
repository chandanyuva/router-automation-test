const express = require('express');
const router = express.Router();
const routerController = require('../controllers/routerController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminCheck');

// All routes here require authentication
router.use(isAuthenticated);

// Read operations (available to any authenticated user)
router.get('/', routerController.getAllRouters);
router.get('/:id', routerController.getRouterById);

// Write/Delete operations (require Admin privileges)
router.post('/', isAdmin, routerController.addRouter);
router.delete('/:id', isAdmin, routerController.deleteRouter);

module.exports = router;
