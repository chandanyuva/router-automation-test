const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
function runSeed(db) {
  logger.info('Running database seed with dummy data...');
  // We use a transaction so if anything fails, none of it gets saved
  const insertData = db.transaction(() => {
    // 1. Seed Switch Nodes
    const insertSwitch = db.prepare(`
            INSERT INTO switch_nodes (switch_node_ip, switch_node_mac) 
            VALUES (?, ?)
        `);

    const switch1 = insertSwitch.run('192.168.1.177', 'DE:AD:BE:EF:FE:ED');
    const switch2 = insertSwitch.run('192.168.1.178', '11:22:33:44:55:66');
    // 2. Seed Routers (Connecting them to the switches)
    const insertRouter = db.prepare(`
            INSERT INTO routers (
                manufacturer, model, country, serial_number, category, 
                power_status, switch_node_id, position_in_switch, 
                wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, 
                wireless_password, admin_page_url, admin_page_username, admin_page_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    // Router 1: Connected to Switch 1, Position 0
    insertRouter.run(
      'TP-Link', 'Archer AX1500', 'US', 'SN-TPL-12345', 'CAT1',
      'off', switch1.lastInsertRowid, 0,
      'TPLINK_2.4G_TEST', 'TPLINK_5G_TEST', null,
      'secure_wifi_pass_1', 'http://192.168.0.1', 'admin', 'admin123'
    );
    // Router 2: Connected to Switch 1, Position 1
    insertRouter.run(
      'Asus', 'RT-AX58U', 'UK', 'SN-ASU-98765', 'CAT2',
      'on', switch1.lastInsertRowid, 1,
      'ASUS_24_GUEST', 'ASUS_5G_FAST', 'ASUS_6G_ULTRA',
      'asus_wifi_pass_2', 'http://192.168.50.1', 'admin', 'password'
    );
    // Router 3: Connected to Switch 2, Position 0
    insertRouter.run(
      'Netgear', 'Nighthawk RAX40', 'IN', 'SN-NET-55555', 'CAT3',
      'off', switch2.lastInsertRowid, 0,
      'NETGEAR_24', 'NETGEAR_5G', null,
      'netgear_pass_3', 'http://10.0.0.1', 'admin', 'password123'
    );
    // 3. Seed Users (Admin and a standard user)
    const insertUser = db.prepare(`
            INSERT INTO users (email, password_hash, role) 
            VALUES (?, ?, ?)
        `);
    const defaultPassword = 'admin';
    const hash = bcrypt.hashSync(defaultPassword, 10);

    insertUser.run('admin@local.host', hash, 'admin');
    insertUser.run('user@local.host', hash, 'user');
  });
  try {
    insertData();
    logger.info('Database seeded successfully.');
  } catch (error) {
    logger.error(`Error during seeding: ${error.message}`);
  }
}
module.exports = { runSeed };
