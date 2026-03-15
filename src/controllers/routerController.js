const db = require('../db/init');
const logger = require('../utils/logger');
const switchService = require('../services/switchService');
const { emitLog } = require('../utils/liveLogger');


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
    // Parse security_types back to JSON array
    routers = routers.map(router => {
      if (router.security_types) {
        try {
          router.security_types = JSON.parse(router.security_types);
        } catch (e) { /* ignore parse errors */ }
      }
      return router;
    });
    res.json({ routers });
  } catch (error) {
    logger.error('Error fetching routers', { error: error.message, stack: error.stack });
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
    // Parse security_types back to JSON array
    if (router.security_types) {
      try {
        router.security_types = JSON.parse(router.security_types);
      } catch (e) { /* ignore parse errors */ }
    }
    res.json({ router });
  } catch (error) {
    logger.error('Error fetching router', { routerId: req.params.id, error: error.message, stack: error.stack });
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
      security_types, // <--- ADD THIS
      admin_page_url, admin_page_username, admin_page_password
    } = req.body;
    if (!switch_node_id || position_in_switch === undefined) {
      return res.status(400).json({ error: 'switch_node_id and position_in_switch are required' });
    }
    const switchExists = db.prepare('SELECT id FROM switch_nodes WHERE id = ?').get(switch_node_id);
    if (!switchExists) {
      return res.status(404).json({ error: 'Provided switch_node_id does not exist' });
    }
    // Convert the array to a JSON string, or default to null if not provided
    const securityTypesStr = security_types ? JSON.stringify(security_types) : null;
    const insert = db.prepare(`
            INSERT INTO routers (
                manufacturer, model, country, serial_number, category,
                switch_node_id, position_in_switch,
                wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, wireless_password,
                security_types, admin_page_url, admin_page_username, admin_page_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    const result = insert.run(
      manufacturer, model, country, serial_number, category,
      switch_node_id, position_in_switch,
      wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, wireless_password,
      securityTypesStr, // <--- ADD THIS
      admin_page_url, admin_page_username, admin_page_password
    );
    logger.info('Router created', { routerId: result.lastInsertRowid, manufacturer, model });
    res.status(201).json({ message: 'Router added successfully', id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Error adding router', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to add router' });
  }
};

// PUT /api/routers/:id - Update a router (Admin Only)
const updateRouter = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // If security_types is provided as an array, stringify it
    if (updates.security_types && Array.isArray(updates.security_types)) {
      updates.security_types = JSON.stringify(updates.security_types);
    }
    // SECURITY FIX: Define the EXACT columns that are allowed to be updated
    const allowedColumns = [
      'manufacturer', 'model', 'country', 'serial_number', 'category',
      'power_status', 'switch_node_id', 'position_in_switch',
      'wireless_ssid_24ghz', 'wireless_ssid_5ghz', 'wireless_ssid_6ghz',
      'wireless_password', 'security_types', 'admin_page_url',
      'admin_page_username', 'admin_page_password'
    ];
    // Filter the incoming request body to ONLY include allowed columns
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }
    // Build the dynamic SQL update string securely
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields provided to update' });
    const setString = keys.map(k => `${k} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    values.push(id); // for the WHERE id = ?
    const stmt = db.prepare(`UPDATE routers SET ${setString} WHERE id = ?`);
    const result = stmt.run(...values);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Router not found' });
    }
    logger.info('Router updated', { routerId: id });
    res.json({ message: 'Router updated successfully' });
  } catch (error) {
    logger.error('Error updating router', { routerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update router' });
  }
};
// POST /api/routers/:id/power - Turn a router on or off
const toggleRouterPower = async (req, res) => {
  try {
    const { id } = req.params;
    // Grab action and immediately convert to lowercase
    const actionInput = req.body.action || '';
    const normalizedAction = actionInput.toLowerCase(); // "ON", "On", "on" all become "on"
    if (normalizedAction !== 'on' && normalizedAction !== 'off') {
      return res.status(400).json({ error: 'Action must be "on" or "off"' });
    }
    // 1. Get the router and its associated switch data in one query using a JOIN
    const query = `
                SELECT 
                    r.position_in_switch, 
                    s.switch_node_ip, 
                    s.switch_node_mac 
                FROM routers r
                JOIN switch_nodes s ON r.switch_node_id = s.id
                WHERE r.id = ?
            `;
    const routerData = db.prepare(query).get(id);
    if (!routerData) {
      return res.status(404).json({ error: 'Router or associated switch not found' });
    }
    // 2. Call the hardware service
    const success = await switchService.togglePower(
      routerData.switch_node_ip,
      routerData.switch_node_mac,
      routerData.position_in_switch,
      normalizedAction
    );
    if (success) {
      // Store the normalized lowercase string in the DB for consistency
      db.prepare('UPDATE routers SET power_status = ? WHERE id = ?').run(normalizedAction, id);
      emitLog('Database updated: Router power status is now ' + normalizedAction, 'info');
      return res.json({ message: `Router powered ${actionInput} successfully` });
    } else {
      return res.status(502).json({ error: 'Failed to communicate with the hardware switch' });
    }
  } catch (error) {
    logger.error('Error toggling router power', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
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
    logger.info('Router deleted', { routerId: id });
    res.json({ message: 'Router deleted successfully' });
  } catch (error) {
    logger.error('Error deleting router', { routerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete router' });
  }
};
module.exports = { getAllRouters, getRouterById, addRouter, updateRouter, deleteRouter, toggleRouterPower };
