const bcrypt = require('bcrypt');

function runSeed(db) {
  console.log('Running database seed with dummy data...');

  const insertData = db.transaction(() => {
    const insertSwitch = db.prepare(`
      INSERT INTO switch_nodes (switch_node_ip, switch_node_mac) 
      VALUES (?, ?)
    `);

    const switch1 = insertSwitch.run('192.168.1.177', 'DE:AD:BE:EF:FE:ED');
    const switch2 = insertSwitch.run('192.168.1.178', '11:22:33:44:55:66');

    const insertRouter = db.prepare(`
      INSERT INTO routers (
        manufacturer, model, country, serial_number, category, 
        power_status, switch_node_id, position_in_switch, 
        wireless_ssid_24ghz, wireless_ssid_5ghz, wireless_ssid_6ghz, 
        wireless_password, security_types, admin_page_url, admin_page_username, admin_page_password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRouter.run(
      'TP-Link', 'Archer AX1500', 'US', 'SN-TPL-12345', 'CAT1',
      'off', switch1.lastInsertRowid, 0,
      'TPLINK_2.4G_TEST', 'TPLINK_5G_TEST', null,
      'secure_wifi_pass_1',
      JSON.stringify(['WPA2-PSK', 'WPA3-SAE']),
      'http://192.168.0.1', 'admin', 'admin123'
    );

    insertRouter.run(
      'Asus', 'RT-AX58U', 'UK', 'SN-ASU-98765', 'CAT2',
      'on', switch1.lastInsertRowid, 1,
      'ASUS_24_GUEST', 'ASUS_5G_FAST', 'ASUS_6G_ULTRA',
      'asus_wifi_pass_2',
      JSON.stringify(['Open', 'WPA2-Personal', 'WPA2/WPA3-Personal']),
      'http://192.168.50.1', 'admin', 'password'
    );

    insertRouter.run(
      'Netgear', 'Nighthawk RAX40', 'IN', 'SN-NET-55555', 'CAT3',
      'off', switch2.lastInsertRowid, 0,
      'NETGEAR_24', 'NETGEAR_5G', null,
      'netgear_pass_3',
      JSON.stringify(['WPA2-PSK']),
      'http://10.0.0.1', 'admin', 'password123'
    );

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
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error during seeding:', error.message);
  }
}

module.exports = { runSeed };