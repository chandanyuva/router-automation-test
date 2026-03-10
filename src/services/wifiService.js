const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);
const WIFI_INTERFACE = process.env.WIFI_INTERFACE || 'WiFi';
const TMP_DIR = path.join(__dirname, '..', 'tmp');

/**
 * Helper to run shell commands
 */
async function runCommand(command) {
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) logger.warn(`Command warning (${command}): ${stderr}`);
        return stdout;
    } catch (error) {
        logger.error(`Command failed (${command}): ${error.message}`);
        throw error;
    }
}

/**
 * Scans for visible Wi-Fi networks and returns detailed objects (SSID, Signal, Band, etc.).
 */
async function scanNetworks() {
    logger.info(`Scanning for detailed Wi-Fi networks on interface: ${WIFI_INTERFACE}`);
    try {
        // We add "mode=bssid" to get Signal, Band, Channel, etc.
        const stdout = await runCommand(`netsh wlan show networks mode=bssid interface="${WIFI_INTERFACE}"`);

        const lines = stdout.split('\n');
        const networks = [];
        let currentNetwork = null;

        for (let line of lines) {
            // FIX: Remove hidden Windows carriage returns
            line = line.replace(/\r/g, '');

            // Start of a new SSID block (e.g. "SSID 1 : MyNetwork")
            const ssidMatch = line.match(/^\s*SSID\s+\d+\s*:\s*(.*)$/);
            if (ssidMatch) {
                if (currentNetwork) {
                    networks.push(currentNetwork);
                }
                currentNetwork = {
                    ssid: ssidMatch[1].trim(),
                    bssid: null,
                    signal: null,
                    authentication: null,
                    radio_type: null,
                    band: null,
                    channel: null
                };
                continue;
            }

            // If we are currently parsing a network block, extract its details
            if (currentNetwork) {
                const authMatch = line.match(/^\s*Authentication\s*:\s*(.*)$/);
                if (authMatch) currentNetwork.authentication = authMatch[1].trim();

                const bssidMatch = line.match(/^\s*BSSID\s+\d+\s*:\s*(.*)$/);
                if (bssidMatch && !currentNetwork.bssid) currentNetwork.bssid = bssidMatch[1].trim(); // Take first BSSID

                const signalMatch = line.match(/^\s*Signal\s*:\s*(.*)$/);
                if (signalMatch && !currentNetwork.signal) currentNetwork.signal = signalMatch[1].trim();

                const radioMatch = line.match(/^\s*Radio type\s*:\s*(.*)$/);
                if (radioMatch && !currentNetwork.radio_type) currentNetwork.radio_type = radioMatch[1].trim();

                const bandMatch = line.match(/^\s*Band\s*:\s*(.*)$/);
                if (bandMatch && !currentNetwork.band) currentNetwork.band = bandMatch[1].trim();

                const channelMatch = line.match(/^\s*Channel\s*:\s*(.*)$/);
                if (channelMatch && !currentNetwork.channel) currentNetwork.channel = channelMatch[1].trim();
            }
        }

        // Don't forget to push the very last network in the loop!
        if (currentNetwork) {
            networks.push(currentNetwork);
        }

        // Clean up the results: remove empty SSIDs and keep only the strongest signal if an SSID appears twice
        const uniqueNetworksMap = new Map();
        for (const net of networks) {
            if (net.ssid) {
                // If we already saw this SSID, only overwrite it if the new one has a stronger signal
                if (uniqueNetworksMap.has(net.ssid)) {
                    const existing = uniqueNetworksMap.get(net.ssid);
                    const existingSignal = parseInt((existing.signal || '0').replace('%', ''));
                    const newSignal = parseInt((net.signal || '0').replace('%', ''));

                    if (newSignal > existingSignal) {
                        uniqueNetworksMap.set(net.ssid, net);
                    }
                } else {
                    uniqueNetworksMap.set(net.ssid, net);
                }
            }
        }

        return Array.from(uniqueNetworksMap.values());
    } catch (error) {
        logger.error('Failed to scan networks', error);
        throw new Error('Failed to scan for Wi-Fi networks');
    }
}

/**
 * Generates an XML profile for Windows netsh with dynamic security.
 * Defaults to WPA2/AES if security type is unknown.
 */
function generateProfileXml(ssid, password, securityType = 'WPA2') {
    const isWpa3 = securityType.toUpperCase() === 'WPA3';
    const isWpa = securityType.toUpperCase() === 'WPA';
    const isOpen = securityType.toUpperCase() === 'OPEN' || !password;

    let auth = 'WPA2PSK';
    let encrypt = 'AES';

    if (isWpa3) auth = 'WPA3SAE';
    if (isWpa) { auth = 'WPAPSK'; encrypt = 'TKIP'; } // WPA usually uses TKIP

    const hexSsid = Buffer.from(ssid).toString('hex');

    if (isOpen) {
        return `<?xml version="1.0"?>
                    <WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
                        <name>${ssid}</name>
                        <SSIDConfig>
                            <SSID>
                                <hex>${hexSsid}</hex>
                                <name>${ssid}</name>
                            </SSID>
                        </SSIDConfig>
                        <connectionType>ESS</connectionType>
                        <connectionMode>auto</connectionMode>
                        <MSM>
                            <security>
                                <authEncryption>
                                    <authentication>open</authentication>
                                    <encryption>none</encryption>
                                    <useOneX>false</useOneX>
                                </authEncryption>
                            </security>
                        </MSM>
                    </WLANProfile>`;
    }

    return `<?xml version="1.0"?>
                <WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
                    <name>${ssid}</name>
                    <SSIDConfig>
                        <SSID>
                            <hex>${hexSsid}</hex>
                            <name>${ssid}</name>
                        </SSID>
                    </SSIDConfig>
                    <connectionType>ESS</connectionType>
                    <connectionMode>auto</connectionMode>
                    <MSM>
                        <security>
                            <authEncryption>
                                <authentication>${auth}</authentication>
                                <encryption>${encrypt}</encryption>
                                <useOneX>false</useOneX>
                            </authEncryption>
                            <sharedKey>
                                <keyType>passPhrase</keyType>
                                <protected>false</protected>
                                <keyMaterial>${password}</keyMaterial>
                            </sharedKey>
                        </security>
                    </MSM>
                </WLANProfile>`;
}

/**
 * Connects to a target SSID.
 * Timeout increased to 20 seconds.
 */
async function connectToNetwork(ssid, password, securityType = 'WPA2') {
    logger.info(`Attempting to connect to SSID: ${ssid} (${securityType})`);
    const xmlPath = path.join(TMP_DIR, `${ssid}.xml`);

    try {
        // 1. Generate and save the XML profile
        const xmlContent = generateProfileXml(ssid, password, securityType);
        await fs.writeFile(xmlPath, xmlContent, 'utf-8');

        // 2. Add the profile to Windows
        await runCommand(`netsh wlan add profile filename="${xmlPath}" interface="${WIFI_INTERFACE}"`);

        // 3. Command Windows to connect
        await runCommand(`netsh wlan connect name="${ssid}" ssid="${ssid}" interface="${WIFI_INTERFACE}"`);

        // 4. Poll for connection state (up to 20 seconds)
        const MAX_RETRIES = 20;
        for (let i = 0; i < MAX_RETRIES; i++) {
            await new Promise(res => setTimeout(res, 1000)); // Wait 1 second

            try {
                const statusOutput = await runCommand(`netsh wlan show interfaces`);

                // Check if state is connected AND the SSID matches
                const stateMatch = /State\s+:\s+connected/i.test(statusOutput);
                // Allow for leading spaces in the SSID output
                const ssidRegex = new RegExp(`SSID\\s+:\\s+${ssid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                const ssidMatch = ssidRegex.test(statusOutput);

                if (stateMatch && ssidMatch) {
                    logger.info(`Successfully connected to ${ssid} after ${i + 1} seconds.`);
                    return true;
                }
            } catch (e) {
                logger.warn(`Polling error on attempt ${i + 1}: ${e.message}`);
                // Continue polling even if a single check fails
            }
        }

        logger.error(`Timeout (${MAX_RETRIES}s): Failed to connect to ${ssid}`);
        return false;

    } catch (error) {
        logger.error(`Error connecting to ${ssid}:`, error);
        return false;
    } finally {
        // 5. Cleanup the XML file no matter what happened
        try {
            await fs.unlink(xmlPath);
            logger.info(`Deleted temporary XML profile for ${ssid}`);
        } catch (e) {
            if (e.code !== 'ENOENT') {
                logger.error(`Failed to delete temporary XML profile for ${ssid}:`, e);
            }
        }
    }
}

/**
 * Disconnects from the current Wi-Fi network.
 */
async function disconnect() {
    logger.info(`Disconnecting from Wi-Fi interface: ${WIFI_INTERFACE}`);
    try {
        await runCommand(`netsh wlan disconnect interface="${WIFI_INTERFACE}"`);
        return true;
    } catch (error) {
        logger.error('Failed to disconnect Wi-Fi', error);
        return false;
    }
}

/**
 * Gets the current connection status and detailed metrics of the Wi-Fi interface.
 */
async function getStatus() {
    logger.info(`Getting Wi-Fi status for interface: ${WIFI_INTERFACE}`);
    try {
        const stdout = await runCommand(`netsh wlan show interfaces`);

        // Split output by lines
        const lines = stdout.split('\n');
        const details = {};
        let isConnected = false;

        for (const line of lines) {
            // FIX: Remove hidden Windows carriage returns (\r)
            const cleanLine = line.replace(/\r/g, '');

            // Match standard "Key : Value" format
            const match = cleanLine.match(/^\s*([^:]+?)\s*:\s*(.*)$/);

            if (match) {
                // Clean up the key to be JSON-friendly (lowercase, replace spaces with underscores)
                let key = match[1].trim().toLowerCase().replace(/ /g, '_');
                // Remove parentheses from keys like "receive rate (mbps)"
                key = key.replace(/\(|\)/g, '');

                const value = match[2].trim();

                // Ignore the "There is 1 interface on the system" line
                if (key !== 'there_is_1_interface_on_the_system') {
                    details[key] = value;
                }

                if (key === 'state' && value.toLowerCase() === 'connected') {
                    isConnected = true;
                }
            }
        }

        return {
            connected: isConnected,
            details: Object.keys(details).length > 0 ? details : null
        };
    } catch (error) {
        logger.error('Failed to get Wi-Fi status', error);
        return { connected: false, details: null, error: error.message };
    }
}

module.exports = {
    scanNetworks,
    connectToNetwork,
    disconnect,
    getStatus
};