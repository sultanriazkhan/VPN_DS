// Blocks WebRTC IP leaks using Chrome privacy API and webRequest

export class WebRTCBlocker {
  constructor() {
    this.isEnabled = false;
    this.blockedHosts = [
      'stun.l.google.com',
      'stun1.l.google.com',
      'stun2.l.google.com',
      'stun3.l.google.com',
      'stun4.l.google.com'
    ];
  }
  
  async enable() {
    try {
      // Method 1: Use Chrome's privacy API
      await chrome.privacy.network.webRTCIPHandlingPolicy.set({
        value: 'disable_non_proxied_udp'
      });
      
      // Method 2: Block STUN/TURN requests via webRequest
      const filter = { urls: ["*://*/*"] };
      const extraInfoSpec = ['blocking'];
      
      chrome.webRequest.onBeforeRequest.addListener(
        this.blockSTUNRequest.bind(this),
        filter,
        extraInfoSpec
      );
      
      this.isEnabled = true;
      console.log('[WebRTC] WebRTC leak protection enabled');
    } catch (error) {
      console.error('[WebRTC] Failed to enable protection:', error);
    }
  }
  
  async disable() {
    await chrome.privacy.network.webRTCIPHandlingPolicy.clear({});
    chrome.webRequest.onBeforeRequest.removeListener(this.blockSTUNRequest);
    this.isEnabled = false;
    console.log('[WebRTC] WebRTC leak protection disabled');
  }
  
  blockSTUNRequest(details) {
    const url = new URL(details.url);
    
    // Check if this is a STUN/TURN request
    if (url.protocol === 'stun:' || url.protocol === 'stuns:' ||
        url.protocol === 'turn:' || url.protocol === 'turns:' ||
        this.blockedHosts.includes(url.hostname)) {
      console.log('[WebRTC] Blocked STUN/TURN request:', details.url);
      return { cancel: true };
    }
    
    return { cancel: false };
  }
}