const db = require('../db/init');
const logger = require('../utils/logger');


// GET /api/routers - Get all routers (optionally filter by switch_node_id)
const getAllRouters = (req, res) => {
  try {
    const { switch_node_id } = req.query;
    let routers;
    if (switch_node_id) {
      routers = db.prepare('SELECT * FROM routers WHERE switch_node_id = ?').all(switch_node_id);
    } else {
      routers = db.prepare('SELECT * FROM routers').all();
    }
    res.json({ routers });
  } catch (error) {
    logger.error(`Error fetching routers: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch routers' });
  }
};

// GET /api/routers/:id - Get a specific router by ID
const getRouterById = (req, res) => {
  try {
    const { id } = req.params;
    const router = db.prepare('SELECT * FROM routers WHERE id = ?').get(id);

    if (!router) {
      return res.status(404).json({ error: 'Router not found' });
    }

    res.json({ router });
  } catch (error) {
    logger.error(`Error fetching router ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch router' });
  }
};

// POST /api/routers - Add a new router (Admin Only)
const addRouter = (req, res) => {
  try {
    const {
      manufacturer, model, country, serial_number, category,
      switch_node_id, position_in_switch,
      wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, wireless_password,
      admin_page_url, admin_page_username, admin_page_password
    } = req.body;
    // Basic validation
    if (!switch_node_id || position_in_switch === undefined) {
      return res.status(400).json({ error: 'switch_node_id and position_in_switch are required' });
    }
    // Verify the switch exists
    const switchExists = db.prepare('SELECT id FROM switch_nodes WHERE id = ?').get(switch_node_id);
    if (!switchExists) {
      return res.status(404).json({ error: 'Provided switch_node_id does not exist' });
    }
    const insert = db.prepare(`
            INSERT INTO routers (
                manufacturer, model, country, serial_number, category,
                switch_node_id, position_in_switch,
                wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, wireless_password,
                admin_page_url, admin_page_username, admin_page_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    const result = insert.run(
      manufacturer, model, country, serial_number, category,
      switch_node_id, position_in_switch,
      wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, wireless_password,
      admin_page_url, admin_page_username, admin_page_password
    );
    logger.info(`Admin ${req.user.email} added new router: ${manufacturer} ${model} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ message: 'Router added successfully', id: result.lastInsertRowid });
  } catch (error) {
    logger.error(`Error adding router: ${error.message}`);
    res.status(500).json({ error: 'Failed to add router' });
  }
};

// DELETE /api/routers/:id - Delete a router (Admin Only)
const deleteRouter = (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM routers WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Router not found' });
    }
    logger.info(`Admin ${req.user.email} deleted router ID: ${id}`);
    res.json({ message: 'Router deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting router ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete router' });
  }
};
module.exports = { getAllRouters, getRouterById, addRouter, deleteRouter };
