// Popup UI Controller

let currentStatus = 'DISCONNECTED';
let selectedServer = null;
let serverList = [];

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const statusIndicator = document.getElementById('connectionStatus');
const serverListDiv = document.getElementById('serverList');
const pingValue = document.getElementById('pingValue');
const dataValue = document.getElementById('dataValue');
const currentIpSpan = document.getElementById('currentIp');
const settingsBtn = document.getElementById('settingsBtn');
const refreshServersBtn = document.getElementById('refreshServersBtn');
const openSettingsLink = document.getElementById('openSettingsLink');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadServers();
  startPolling();
});

// Load current connection status
async function loadStatus() {
  const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
  currentStatus = response.status;
  selectedServer = response.server;
  updateUI();
  
  // Fetch current IP
  await updateCurrentIP();
}

// Update UI based on status
function updateUI() {
  // Update status indicator
  statusIndicator.className = `status-indicator ${currentStatus.toLowerCase()}`;
  const statusText = statusIndicator.querySelector('.status-text');
  
  switch(currentStatus) {
    case 'CONNECTED':
      statusText.textContent = 'Connected • Protected';
      connectBtn.innerHTML = '<span class="btn-icon">🔓</span><span class="btn-text">Disconnect</span>';
      connectBtn.className = 'connect-btn disconnect';
      break;
    case 'CONNECTING':
      statusText.textContent = 'Connecting...';
      connectBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Connecting</span>';
      connectBtn.className = 'connect-btn connect';
      connectBtn.disabled = true;
      break;
    default:
      statusText.textContent = 'Disconnected • Not Protected';
      connectBtn.innerHTML = '<span class="btn-icon">🔒</span><span class="btn-text">Connect</span>';
      connectBtn.className = 'connect-btn connect';
      connectBtn.disabled = false;
  }
  
  // Update selected server in list
  if (serverListDiv) {
    document.querySelectorAll('.server-item').forEach(item => {
      const serverId = parseInt(item.dataset.id);
      if (selectedServer && serverId === selectedServer.id) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
}

// Load server list
async function loadServers() {
  serverListDiv.innerHTML = '<div class="loading-spinner">Fetching servers...</div>';
  
  const response = await chrome.runtime.sendMessage({ action: 'GET_SERVERS' });
  serverList = response.servers;
  
  renderServerList();
}

// Render server list
function renderServerList() {
  if (!serverList || serverList.length === 0) {
    serverListDiv.innerHTML = '<div class="loading-spinner">No servers available</div>';
    return;
  }
  
  serverListDiv.innerHTML = serverList.map(server => `
    <div class="server-item" data-id="${server.id}" data-host="${server.host}" data-port="${server.port}" data-protocol="${server.protocol}">
      <div class="server-info">
        <div class="server-name">${server.name}</div>
        <div class="server-country">📍 ${server.country}</div>
      </div>
      <div class="server-latency" id="latency-${server.id}">Testing...</div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.server-item').forEach(item => {
    item.addEventListener('click', () => selectServer(item));
    
    // Test latency for each server
    const serverId = parseInt(item.dataset.id);
    const server = serverList.find(s => s.id === serverId);
    if (server) {
      testLatency(server);
    }
  });
}

// Select a server
async function selectServer(element) {
  const serverId = parseInt(element.dataset.id);
  selectedServer = serverList.find(s => s.id === serverId);
  
  // Update UI
  document.querySelectorAll('.server-item').forEach(item => {
    item.classList.remove('selected');
  });
  element.classList.add('selected');
  
  // Save selection
  await chrome.storage.local.set({ lastSelectedServer: selectedServer });
}

// Test server latency
async function testLatency(server) {
  const latencyElement = document.getElementById(`latency-${server.id}`);
  if (!latencyElement) return;
  
  const response = await chrome.runtime.sendMessage({ 
    action: 'TEST_LATENCY', 
    server: server 
  });
  
  if (response.latency && response.latency > 0) {
    latencyElement.textContent = `${response.latency}ms`;
    latencyElement.style.color = response.latency < 200 ? '#4caf50' : '#ff9800';
  } else {
    latencyElement.textContent = 'Timeout';
    latencyElement.style.color = '#f44336';
  }
}

// Update current IP address
async function updateCurrentIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    currentIpSpan.textContent = data.ip;
  } catch (error) {
    currentIpSpan.textContent = 'Unable to fetch';
  }
}

// Handle connect/disconnect button
connectBtn.addEventListener('click', async () => {
  if (currentStatus === 'CONNECTED') {
    // Disconnect
    await chrome.runtime.sendMessage({ action: 'DISCONNECT' });
    currentStatus = 'DISCONNECTED';
    updateUI();
    await updateCurrentIP();
  } else {
    // Connect - need selected server
    let serverToUse = selectedServer;
    
    if (!serverToUse && serverList.length > 0) {
      serverToUse = serverList[0];
      selectedServer = serverToUse;
    }
    
    if (serverToUse) {
      currentStatus = 'CONNECTING';
      updateUI();
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'CONNECT', 
        server: serverToUse 
      });
      
      if (response.success) {
        currentStatus = 'CONNECTED';
        updateUI();
        await updateCurrentIP();
      } else {
        currentStatus = 'DISCONNECTED';
        updateUI();
        alert(`Connection failed: ${response.error}`);
      }
    } else {
      alert('Please select a server first');
    }
  }
});

// Refresh server list
refreshServersBtn.addEventListener('click', async () => {
  await loadServers();
});

// Open settings page
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

openSettingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Polling for updates
function startPolling() {
  setInterval(async () => {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    if (response.status !== currentStatus) {
      currentStatus = response.status;
      updateUI();
    }
    
    if (response.traffic && response.traffic.startTime) {
      const runtime = Math.floor((Date.now() - response.traffic.startTime) / 1000);
      const minutes = Math.floor(runtime / 60);
      dataValue.textContent = `${minutes}m`;
    }
    
    if (currentStatus === 'CONNECTED') {
      await updateCurrentIP();
    }
  }, 3000);
}