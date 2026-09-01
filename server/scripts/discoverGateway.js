import net from 'net';
import https from 'https';
import http from 'http';
import os from 'os';

const GATEWAY_IP = '192.168.1.1';
const PORTS = [80, 443, 8080, 8443, 8728, 8729, 1812, 1813];

/**
 * Check if a port is open
 */
function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({ port, status: 'open' });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, status: 'closed' });
    });
    
    socket.on('error', () => {
      resolve({ port, status: 'closed' });
    });
    
    socket.connect(port, host);
  });
}

/**
 * Get HTTP headers
 */
function getHttpHeaders(host, port, protocol = 'http') {
  return new Promise((resolve) => {
    const client = protocol === 'https' ? https : http;
    
    const options = {
      host,
      port,
      path: '/',
      method: 'HEAD',
      rejectUnauthorized: false,
      timeout: 5000
    };
    
    const req = client.request(options, (res) => {
      resolve({
        protocol,
        port,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      resolve({
        protocol,
        port,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        protocol,
        port,
        error: 'timeout'
      });
    });
    
    req.end();
  });
}

/**
 * Get local network info
 */
function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const result = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        result.push({
          interface: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac
        });
      }
    }
  }
  
  return result;
}

/**
 * Main discovery function
 */
async function discoverGateway() {
  console.log('=== Airtel Router Discovery ===\n');
  
  // Local network info
  console.log('Local Network Information:');
  const localInfo = getLocalNetworkInfo();
  localInfo.forEach(info => {
    console.log(`  Interface: ${info.interface}`);
    console.log(`  IP Address: ${info.address}`);
    console.log(`  Netmask: ${info.netmask}`);
    console.log(`  MAC Address: ${info.mac}`);
    console.log('');
  });
  
  // Port scanning
  console.log(`Scanning ports on ${GATEWAY_IP}:`);
  const portResults = [];
  for (const port of PORTS) {
    const result = await checkPort(GATEWAY_IP, port);
    portResults.push(result);
    console.log(`  Port ${port}: ${result.status}`);
  }
  console.log('');
  
  // HTTP/HTTPS headers
  console.log('HTTP/HTTPS Headers:');
  const httpPorts = portResults.filter(r => r.status === 'open').map(r => r.port);
  
  for (const port of httpPorts) {
    if (port === 443 || port === 8443) {
      const httpsResult = await getHttpHeaders(GATEWAY_IP, port, 'https');
      console.log(`  HTTPS Port ${port}:`);
      console.log(`    Status: ${httpsResult.statusCode || 'ERROR'}`);
      console.log(`    Message: ${httpsResult.statusMessage || httpsResult.error}`);
      if (httpsResult.headers) {
        console.log(`    Server: ${httpsResult.headers.server || 'N/A'}`);
        console.log(`    Content-Type: ${httpsResult.headers['content-type'] || 'N/A'}`);
      }
      console.log('');
    }
    if (port === 80 || port === 8080) {
      const httpResult = await getHttpHeaders(GATEWAY_IP, port, 'http');
      console.log(`  HTTP Port ${port}:`);
      console.log(`    Status: ${httpResult.statusCode || 'ERROR'}`);
      console.log(`    Message: ${httpResult.statusMessage || httpResult.error}`);
      if (httpResult.headers) {
        console.log(`    Server: ${httpResult.headers.server || 'N/A'}`);
        console.log(`    Content-Type: ${httpResult.headers['content-type'] || 'N/A'}`);
      }
      console.log('');
    }
  }
  
  // Summary
  console.log('=== Discovery Summary ===');
  console.log(`Gateway IP: ${GATEWAY_IP}`);
  console.log(`Open Ports: ${portResults.filter(r => r.status === 'open').map(r => r.port).join(', ') || 'None'}`);
  console.log(`Vendor: Airtel (known from user)`);
  console.log(`Model: UNKNOWN (cannot be determined from network discovery alone)`);
  console.log(`Firmware: UNKNOWN (cannot be determined from network discovery alone)`);
}

// Run discovery
discoverGateway().catch(console.error);
