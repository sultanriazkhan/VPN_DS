// Settings page controller

// DOM Elements
const autoConnectCheckbox = document.getElementById('autoConnect');
const enableWebRTCBlocking = document.getElementById('enableWebRTCBlocking');
const enableDNSProtection = document.getElementById('enableDNSProtection');
const themeSelect = document.getElementById('theme');
const killSwitch = document.getElementById('killSwitch');
const filterMalicious = document.getElementById('filterMalicious');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
});

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'autoConnect',
    'enableWebRTCBlocking',
    'enableDNSProtection',
    'theme',
    'killSwitch',
    'filterMalicious'
  ]);
  
  autoConnectCheckbox.checked = settings.autoConnect || false;
  enableWebRTCBlocking.checked = settings.enableWebRTCBlocking !== false;
  enableDNSProtection.checked = settings.enableDNSProtection !== false;
  themeSelect.value = settings.theme || 'dark';
  killSwitch.checked = settings.killSwitch || false;
  filterMalicious.checked = settings.filterMalicious || false;
  
  // Apply theme
  applyTheme(themeSelect.value);
}

// Save settings
async function saveSettings() {
  const settings = {
    autoConnect: autoConnectCheckbox.checked,
    enableWebRTCBlocking: enableWebRTCBlocking.checked,
    enableDNSProtection: enableDNSProtection.checked,
    theme: themeSelect.value,
    killSwitch: killSwitch.checked,
    filterMalicious: filterMalicious.checked
  };
  
  await chrome.storage.local.set(settings);
  
  // Notify background script about settings change
  chrome.runtime.sendMessage({ 
    action: 'SETTINGS_UPDATED', 
    settings: settings 
  });
  
  // Show feedback
  showNotification('Settings saved successfully!');
}

// Reset to default settings
async function resetSettings() {
  const defaultSettings = {
    autoConnect: false,
    enableWebRTCBlocking: true,
    enableDNSProtection: true,
    theme: 'dark',
    killSwitch: false,
    filterMalicious: false
  };
  
  await chrome.storage.local.set(defaultSettings);
  
  // Update UI
  autoConnectCheckbox.checked = defaultSettings.autoConnect;
  enableWebRTCBlocking.checked = defaultSettings.enableWebRTCBlocking;
  enableDNSProtection.checked = defaultSettings.enableDNSProtection;
  themeSelect.value = defaultSettings.theme;
  killSwitch.checked = defaultSettings.killSwitch;
  filterMalicious.checked = defaultSettings.filterMalicious;
  
  // Apply theme
  applyTheme(defaultSettings.theme);
  
  showNotification('Settings reset to default');
}

// Apply theme to page
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  } else if (theme === 'dark') {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  } else {
    // Auto - detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }
}

// Show temporary notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .light-mode {
    background: #f5f5f5;
    color: #333;
  }
  
  .light-mode .container {
    background: white;
  }
  
  .light-mode .setting-item {
    background: #f0f0f0;
  }
  
  .light-mode .setting-desc {
    color: #666;
  }
`;
document.head.appendChild(style);

// Event listeners
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);
themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));