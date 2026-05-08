// Manages Chrome proxy configuration

export class ProxyManager {
  constructor() {
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      startTime: null
    };
  }
  
  async setProxy(server) {
    const proxyConfig = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: server.protocol || "socks5",
          host: server.host,
          port: server.port
        },
        bypassList: ["localhost", "127.0.0.1", "*.local"]
      }
    };
    
    // Set proxy
    await chrome.proxy.settings.set({
      value: proxyConfig,
      scope: 'regular'
    });
    
    // Track traffic (requires webRequest listeners - simplified)
    this.trafficStats.startTime = Date.now();
    
    return true;
  }
  
  async clearProxy() {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      startTime: null
    };
    return true;
  }
  
  async testConnection(server) {
    return new Promise((resolve, reject) => {
      // Test via XMLHttpRequest through proxy
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', 'https://httpbin.org/ip');
      xhr.timeout = 5000;
      
      xhr.onload = () => resolve();
      xhr.onerror = () => reject(new Error('Connection failed'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      
      xhr.send();
    });
  }
  
  getTrafficStats() {
    return this.trafficStats;
  }
}