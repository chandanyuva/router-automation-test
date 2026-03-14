const axios = require('axios');
const { emitLog } = require('../utils/liveLogger');

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
    emitLog(`Sending hardware request to ${switchIp} (Relay: ${pathSegment}, Action: ${hardwareAction})`);

    // Slightly longer timeout if we are doing a bulk operation
    const timeout = position === 'all' ? 8000 : 5000;
    const response = await axios.get(url, { timeout });
    if (response.status === 200) {
      emitLog(`Hardware switch confirmed: Relay ${pathSegment} is now ${hardwareAction}`, 'info');
      return true;
    } else {
      emitLog(`Switch responded with unexpected status ${response.status}`, 'warn');
      return false;
    }
  } catch (error) {
    emitLog(`Failed to reach hardware switch at ${switchIp}: ${error.message}`, 'error');
    return false;
  }
}

module.exports = { togglePower };
