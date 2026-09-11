import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  agentId: process.env.AGENT_ID || 'local-agent',
  agentSecret: process.env.AGENT_SECRET || '',
  discoveryInterval: parseInt(process.env.DISCOVERY_INTERVAL_SECONDS || '30', 10) * 1000,
  localSubnet: process.env.LOCAL_SUBNET || null
};

if (!config.agentSecret) {
  console.error('ERROR: AGENT_SECRET must be set in .env');
  process.exit(1);
}

/**
 * Get local IP address and subnet
 */
async function getLocalNetworkInfo() {
  try {
    // Windows command to get local IP
    const { stdout } = await execAsync('ipconfig');
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      const ipv4Match = line.match(/IPv4 Address[^\d]*([\d.]+)/);
      if (ipv4Match) {
        const ip = ipv4Match[1];
        const parts = ip.split('.');
        if (parts.length === 4) {
          const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
          return { ip, subnet };
        }
      }
    }
    
    throw new Error('Could not determine local IP');
  } catch (error) {
    console.error('Error getting local network info:', error.message);
    throw error;
  }
}

/**
 * Check if IP is in valid private/local range
 */
function isValidPrivateIP(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

/**
 * Parse ARP table on Windows
 */
async function getArpTable() {
  try {
    const { stdout } = await execAsync('arp -a');
    const lines = stdout.split('\n');
    const devices = [];

    for (const line of lines) {
      // Parse ARP table line format: IP  MAC  Type
      const match = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]+)\s+(\w+)/);
      if (match) {
        const ipAddress = match[1];
        const macAddress = match[2];
        const type = match[3];

        // Skip if MAC is invalid
        if (macAddress === 'ff-ff-ff-ff-ff-ff' || macAddress.length < 14) {
          continue;
        }

        // Skip multicast/broadcast IPs
        if (!isValidPrivateIP(ipAddress)) {
          continue;
        }

        devices.push({
          ipAddress,
          macAddress: macAddress.replace(/-/g, ':').toUpperCase(),
          type
        });
      }
    }

    return devices;
  } catch (error) {
    console.error('Error getting ARP table:', error.message);
    return [];
  }
}

/**
 * Try to resolve hostname for an IP
 */
async function resolveHostname(ipAddress) {
  try {
    const { stdout } = await execAsync(`nslookup ${ipAddress}`);
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      const nameMatch = line.match(/name\s*=\s*(.+)/i);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Try to resolve hostname using NetBIOS (nbtstat)
 * This is useful for Windows devices on the local network
 */
async function resolveNetBIOSName(ipAddress) {
  try {
    const { stdout } = await execAsync(`nbtstat -A ${ipAddress}`);
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      const nameMatch = line.match(/(\S+)\s+<00>\s+UNIQUE/);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Check if device is reachable via ping
 * Returns true if device responds to ping
 */
async function isDeviceReachable(ipAddress) {
  try {
    // Windows ping with 1 second timeout, 1 attempt
    const { stdout } = await execAsync(`ping -n 1 -w 1000 ${ipAddress}`);
    
    // Check if ping was successful (contains "TTL=" in output)
    return stdout.includes('TTL=');
  } catch (error) {
    return false;
  }
}

/**
 * Get manufacturer from MAC address (OUI lookup)
 * This is a simplified version - in production you'd use a full OUI database
 */
function getManufacturerFromMac(macAddress) {
  if (!macAddress || macAddress.length < 8) return '';
  
  const oui = macAddress.substring(0, 8).toUpperCase();
  
  // Common OUI prefixes (simplified)
  const ouiMap = {
    '00:1A:11': 'Apple',
    '00:1B:63': 'Apple',
    'AC:87:A3': 'Apple',
    'F4:5C:89': 'Apple',
    'BC:D1:D3': 'Apple',
    '34:C7:31': 'Apple',
    '40:65:A3': 'Apple',
    '3C:22:FB': 'Apple',
    'E8:50:8B': 'Apple',
    'A4:83:E7': 'Apple',
    'F8:FF:C2': 'Apple',
    'DC:A9:04': 'Apple',
    '88:E9:FE': 'Apple',
    '00:15:5D': 'Microsoft',
    '00:50:56': 'VMware',
    '00:0C:29': 'VMware',
    '00:05:69': 'VMware',
    '00:1E:C9': 'Dell',
    '00:1E:67': 'Dell',
    '00:23:AE': 'Dell',
    '00:26:B9': 'Dell',
    'BC:5F:F4': 'Dell',
    '3C:D9:2B': 'Dell',
    '70:5E:B6': 'Dell',
    '00:E0:4C': 'Realtek',
    '00:04:75': 'D-Link',
    '00:0B:DB': 'D-Link',
    '00:13:46': 'D-Link',
    '00:1D:0F': 'D-Link',
    '00:22:B0': 'TP-Link',
    '78:44:FD': 'TP-Link',
    'F8:1A:67': 'TP-Link',
    'E0:DB:55': 'TP-Link',
    '54:83:3A': 'TP-Link',
    'F4:8E:38': 'Xiaomi',
    '34:CE:00': 'Xiaomi',
    '78:11:DC': 'Xiaomi',
    'F8:4D:03': 'Xiaomi',
    'AC:23:3F': 'Xiaomi',
    'C8:91:20': 'Samsung',
    'E4:70:1B': 'Samsung',
    '6C:72:E7': 'Samsung',
    'F4:60:B2': 'Samsung',
    'CC:3A:61': 'Samsung',
    '8C:F5:A3': 'Samsung',
    '40:B0:FA': 'Samsung',
    '00:16:32': 'Samsung',
    '08:00:27': 'VirtualBox',
    '52:54:00': 'QEMU/KVM',
    '00:16:3E': 'Xen'
  };

  for (const [prefix, manufacturer] of Object.entries(ouiMap)) {
    if (oui.startsWith(prefix)) {
      return manufacturer;
    }
  }

  return '';
}

/**
 * Generate a random nonce for replay protection
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate authentication header with nonce for replay protection
 */
function generateAuthHeader() {
  const timestamp = Date.now().toString();
  const nonce = generateNonce();
  const signature = crypto
    .createHmac('sha256', config.agentSecret)
    .update(`${config.agentId}:${timestamp}:${nonce}`)
    .digest('hex');

  return `${config.agentId}:${timestamp}:${nonce}:${signature}`;
}

/**
 * Send discovered devices to backend
 */
async function sendDevicesToBackend(devices) {
  try {
    const authHeader = generateAuthHeader();
    const timestamp = new Date().toISOString();

    const response = await axios.post(
      `${config.backendUrl}/api/v1/network/agent/devices`,
      {
        agentId: config.agentId,
        timestamp,
        devices
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Auth': authHeader
        },
        timeout: 10000
      }
    );

    console.log(`✓ Sent ${devices.length} devices to backend:`, response.data);
    return true;
  } catch (error) {
    console.error('✗ Error sending devices to backend:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main discovery loop
 */
async function discoverAndSend() {
  try {
    console.log(`\n[${new Date().toISOString()}] Starting network discovery...`);

    // Get ARP table
    const arpDevices = await getArpTable();
    console.log(`Found ${arpDevices.length} devices in ARP table`);

    // Enrich device information
    const enrichedDevices = [];
    let reachableCount = 0;
    let unreachableCount = 0;

    for (const device of arpDevices) {
      try {
        // Check reachability via ping (with timeout)
        const reachablePromise = isDeviceReachable(device.ipAddress);
        const pingTimeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 2000));
        const isReachable = await Promise.race([reachablePromise, pingTimeoutPromise]);

        if (isReachable) {
          reachableCount++;
        } else {
          unreachableCount++;
        }

        // Try to resolve hostname via DNS (async, don't block too long)
        const hostnamePromise = resolveHostname(device.ipAddress);
        const dnsTimeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 1500));
        const hostname = await Promise.race([hostnamePromise, dnsTimeoutPromise]);

        // Try NetBIOS resolution as fallback (only if DNS failed)
        let finalHostname = hostname;
        if (!hostname && isReachable) {
          const netbiosPromise = resolveNetBIOSName(device.ipAddress);
          const netbiosTimeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 1500));
          finalHostname = await Promise.race([netbiosPromise, netbiosTimeoutPromise]);
        }

        const manufacturer = getManufacturerFromMac(device.macAddress);

        // Use resolved hostname or fallback to "Unknown Device"
        const deviceName = finalHostname || 'Unknown Device';

        enrichedDevices.push({
          deviceName: deviceName,
          hostname: finalHostname || '',
          ipAddress: device.ipAddress,
          macAddress: device.macAddress,
          manufacturer: manufacturer || '',
          source: 'arp_scan',
          status: isReachable ? 'online' : 'recently_seen',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        unreachableCount++;
        // Continue with basic device info if enrichment fails
        enrichedDevices.push({
          deviceName: 'Unknown Device',
          hostname: '',
          ipAddress: device.ipAddress,
          macAddress: device.macAddress,
          manufacturer: '',
          source: 'arp_scan',
          status: 'unreachable',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      }
    }

    console.log(`Reachable: ${reachableCount}, Unreachable: ${unreachableCount}`);

    // Send to backend
    const success = await sendDevicesToBackend(enrichedDevices);

    if (success) {
      console.log(`✓ Discovery cycle completed successfully`);
    } else {
      console.log(`✗ Discovery cycle completed with errors`);
    }
  } catch (error) {
    console.error('✗ Discovery error:', error.message);
  }
}

/**
 * Start the agent
 */
async function startAgent() {
  try {
    console.log('='.repeat(60));
    console.log('Durga Digital Library - Network Discovery Agent');
    console.log('='.repeat(60));
    console.log(`Backend URL: ${config.backendUrl}`);
    console.log(`Agent ID: ${config.agentId}`);
    console.log(`Discovery Interval: ${config.discoveryInterval / 1000}s`);

    // Get local network info
    const networkInfo = await getLocalNetworkInfo();
    console.log(`Local IP: ${networkInfo.ip}`);
    console.log(`Local Subnet: ${networkInfo.subnet}`);

    console.log('='.repeat(60));
    console.log('Starting discovery loop...\n');

    // Initial discovery
    await discoverAndSend();

    // Set up interval
    setInterval(discoverAndSend, config.discoveryInterval);

  } catch (error) {
    console.error('Failed to start agent:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start
startAgent();
