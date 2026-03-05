const axios = require('axios');
const logger = require('../utils/logger');
/**
 * Toggles the power state of a specific relay on the NodeMCU switch.
 * 
 * @param {string} switchIp - The IP address of the switch node
 * @param {string} switchMac - The MAC address of the switch node
 * @param {number} position - The relay pin/position (0-9)
 * @param {string} action - 'on' or 'off'
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function togglePower(switchIp, switchMac, position, action) {
  // Validate action
  if (action !== 'on' && action !== 'off') {
    logger.error(`Invalid action '${action}' requested for relay ${position}`);
    return false;
  }
  // Construct the endpoint URL based on the README specification
  const url = `http://${switchIp}/D${position}/${action}?mac=${switchMac}`;
  try {
    logger.info(`Sending hardware request: ${url}`);

    // We set a short timeout so the backend doesn't hang if the switch is offline
    const response = await axios.get(url, { timeout: 5000 });
    if (response.status === 200) {
      logger.info(`Successfully turned ${action} relay D${position} on switch ${switchIp}`);
      return true;
    } else {
      logger.warn(`Switch responded with status ${response.status} for relay D${position}`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to reach switch at ${switchIp}: ${error.message}`);
    return false;
  }
}
module.exports = { togglePower };
