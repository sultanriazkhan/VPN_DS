// Empty file - paste your code here
// Main service worker - orchestrates VPN functionality

import { ProxyManager } from './proxy-manager.js';
import { WebRTCBlocker } from './webrtc-blocker.js';

let proxyManager = null;
let webrtcBlocker = null;
let connectionStatus = 'DISCONNECTED';
let currentServer = null;

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[VPN] Extension installed');
  
  // Initialize managers
  proxyManager = new ProxyManager();
  webrtcBlocker = new WebRTCBlocker();
  
  // Setup WebRTC blocking
  await webrtcBlocker.enable();
  
  // Load saved settings
  const settings = await chrome.storage.local.get(['autoConnect', 'lastServer']);
  if (settings.autoConnect && settings.lastServer) {
    await connectToServer(settings.lastServer);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'CONNECT':
      connectToServer(message.server).then(() => {
        sendResponse({ success: true, status: connectionStatus });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'DISCONNECT':
      disconnect().then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_STATUS':
      sendResponse({ 
        status: connectionStatus, 
        server: currentServer,
        traffic: proxyManager?.getTrafficStats() || null
      });
      return true;
      
    case 'GET_SERVERS':
      getServerList().then(servers => {
        sendResponse({ servers });
      });
      return true;
      
    case 'TEST_LATENCY':
      testLatency(message.server).then(latency => {
        sendResponse({ latency });
      });
      return true;
  }
});

async function connectToServer(server) {
  try {
    // Configure proxy
    await proxyManager.setProxy(server);
    
    // Update status
    connectionStatus = 'CONNECTED';
    currentServer = server;
    
    // Save last used server
    await chrome.storage.local.set({ lastServer: server });
    
    // Update icon
    chrome.action.setIcon({ path: {
      16: "icons/connected16.png",
      32: "icons/connected32.png",
      48: "icons/connected48.png",
      128: "icons/connected128.png"
    }});
    
    console.log(`[VPN] Connected to ${server.name} (${server.country})`);
  } catch (error) {
    connectionStatus = 'ERROR';
    console.error('[VPN] Connection failed:', error);
    throw error;
  }
}

async function disconnect() {
  await proxyManager.clearProxy();
  connectionStatus = 'DISCONNECTED';
  currentServer = null;
  
  chrome.action.setIcon({ path: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png"
  }});
  
  console.log('[VPN] Disconnected');
}

async function getServerList() {
  // Fetch from free proxy list API or local cache
  const response = await fetch('https://raw.githubusercontent.com/proxygenerator1/ProxyGenerator/main/MostStable/country/all/socks5.txt');
  const text = await response.text();
  
  // Parse proxy list
  const proxies = text.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [ip, port] = line.split(':');
      return { ip, port: parseInt(port) };
    });
  
  // Group by country (simplified - in production, parse properly)
  const servers = proxies.slice(0, 50).map((proxy, index) => ({
    id: index,
    name: `Proxy ${index + 1}`,
    country: assignCountryFromIp(proxy.ip),
    host: proxy.ip,
    port: proxy.port,
    protocol: 'socks5'
  }));
  
  return servers;
}

function assignCountryFromIp(ip) {
  // Simplified - in production, use IP geolocation database
  const firstOctet = parseInt(ip.split('.')[0]);
  if (firstOctet < 50) return 'US';
  if (firstOctet < 100) return 'EU';
  if (firstOctet < 150) return 'AS';
  return 'Other';
}

async function testLatency(server) {
  const start = Date.now();
  try {
    // Attempt TCP connection through proxy (simplified)
    await proxyManager.testConnection(server);
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
}