const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Toggles the power state of a specific relay, or all relays, on the NodeMCU switch.
 * 
 * @param {string} switchIp - The IP address of the switch node
 * @param {string} switchMac - The MAC address of the switch node
 * @param {number|string} position - The relay pin/position (0-9) or the string "all"
 * @param {string} action - 'on' or 'off'
 * @returns {Promise<boolean>} True if successful, false otherwise
 */

async function togglePower(switchIp, switchMac, position, action) {
  // 1. Normalize the action to uppercase for the hardware
  const hardwareAction = String(action).toUpperCase(); // "on" or "ON" becomes "ON"
  if (hardwareAction !== 'ON' && hardwareAction !== 'OFF') {
    logger.error(`Invalid action '${action}' requested for relay ${position}`);
    return false;
  }
  // 2. Determine the path segment, ensuring "all" becomes "ALL"
  const isAll = String(position).toUpperCase() === 'ALL';
  const pathSegment = isAll ? 'ALL' : `D${position}`;

  // Resulting URL example: http://192.168.1.177/ALL/ON?mac=...
  const url = `http://${switchIp}/${pathSegment}/${hardwareAction}?mac=${switchMac}`;
  try {
    logger.info(`Sending hardware request: ${url}`);

    // Slightly longer timeout if we are doing a bulk operation
    const timeout = position === 'all' ? 8000 : 5000;
    const response = await axios.get(url, { timeout });
    if (response.status === 200) {
      logger.info(`Successfully turned ${hardwareAction} relay(s) '${pathSegment}' on switch ${switchIp}`);
      return true;
    } else {
      logger.warn(`Switch responded with status ${response.status} for relay(s) '${pathSegment}'`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to reach switch at ${switchIp}: ${error.message}`);
    return false;
  }
}

module.exports = { togglePower };
