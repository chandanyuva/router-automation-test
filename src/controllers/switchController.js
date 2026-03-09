const db = require('../db/init');

const logger = require('../utils/logger');

const switchService = require('../services/switchService');

// GET /api/switches - Get all switches
const getAllSwitches = (req, res) => {
  try {
    const switches = db.prepare('SELECT * FROM switch_nodes').all();
    res.json({ switches });
  } catch (error) {
    logger.error(`Error fetching switches: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch switches' });
  }
};

// GET /api/switches/:id - Get a specific switch by ID
const getSwitchById = (req, res) => {
  try {
    const { id } = req.params;
    const switchNode = db.prepare('SELECT * FROM switch_nodes WHERE id = ?').get(id);

    if (!switchNode) {
      return res.status(404).json({ error: 'Switch not found' });
    }

    res.json({ switchNode });
  } catch (error) {
    logger.error(`Error fetching switch ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch switch' });
  }
};

// POST /api/switches - Add a new switch (Admin Only)
const addSwitch = (req, res) => {
  try {
    const { switch_node_ip, switch_node_mac } = req.body;
    if (!switch_node_ip || !switch_node_mac) {
      return res.status(400).json({ error: 'IP and MAC address are required' });
    }
    const insert = db.prepare('INSERT INTO switch_nodes (switch_node_ip, switch_node_mac) VALUES (?, ?)');
    const result = insert.run(switch_node_ip, switch_node_mac);
    logger.info(`Admin ${req.user.email} added new switch: ${switch_node_ip} (${switch_node_mac})`);
    res.status(201).json({ message: 'Switch added successfully', id: result.lastInsertRowid });
  } catch (error) {
    // Handle SQLite unique constraint error (e.g., MAC address already exists)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A switch with this MAC address already exists' });
    }
    logger.error(`Error adding switch: ${error.message}`);
    res.status(500).json({ error: 'Failed to add switch' });
  }
};

// POST /api/switches/:id/power-all - Turn all routers on a switch on/off
const toggleAllPower = async (req, res) => {
  try {
    const { id } = req.params;

    // Grab action and immediately convert to lowercase
    const actionInput = req.body.action || '';
    const normalizedAction = actionInput.toLowerCase(); // "ON", "On", "on" all become "on"
    if (normalizedAction !== 'on' && normalizedAction !== 'off') {
      return res.status(400).json({ error: 'Action must be "on" or "off"' });
    }
    const switchNode = db.prepare('SELECT * FROM switch_nodes WHERE id = ?').get(id);
    if (!switchNode) {
      return res.status(404).json({ error: 'Switch not found' });
    }
    // Use the existing togglePower service, passing "all" and the normalized action
    const success = await switchService.togglePower(
      switchNode.switch_node_ip,
      switchNode.switch_node_mac,
      'all',
      normalizedAction
    );
    if (success) {
      // Update all routers on this switch in the database using normalizedAction
      db.prepare('UPDATE routers SET power_status = ? WHERE switch_node_id = ?').run(normalizedAction, id);
      logger.info(`User ${req.user.email} turned ${normalizedAction} ALL routers on switch ${id}`);
      return res.json({ message: `All routers on switch powered ${normalizedAction} successfully` });
    } else {
      return res.status(502).json({ error: 'Failed to communicate with the hardware switch' });
    }
  } catch (error) {
    logger.error(`Error toggling all power on switch ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/switches/:id - Delete a switch (Admin Only)
const deleteSwitch = (req, res) => {
  try {
    const { id } = req.params;
    // Optional: Check if routers are attached before deleting
    const attachedRouters = db.prepare('SELECT COUNT(*) as count FROM routers WHERE switch_node_id = ?').get(id);
    if (attachedRouters.count > 0) {
      return res.status(400).json({ error: `Cannot delete switch. ${attachedRouters.count} router(s) are attached to it.` });
    }
    const stmt = db.prepare('DELETE FROM switch_nodes WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Switch not found' });
    }
    logger.info(`Admin ${req.user.email} deleted switch ID: ${id}`);
    res.json({ message: 'Switch deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting switch ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete switch' });
  }
};

module.exports = { getAllSwitches, getSwitchById, addSwitch, deleteSwitch, toggleAllPower };
