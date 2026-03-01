// PolyGuard Offscreen Document - WebSocket Manager
// Runs in an offscreen context to maintain persistent WebSocket connection

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

console.log('PolyGuard offscreen document loaded');

// Initialize WebSocket connection
function initWebSocket() {
  console.log('Initializing WebSocket connection to:', WS_URL);
  
  try {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMarketUpdate(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed, attempting reconnect...');
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(initWebSocket, RECONNECT_DELAY);
      }
    };
  } catch (err) {
    console.error('Failed to create WebSocket:', err);
  }
}

// Handle market price updates
function handleMarketUpdate(data) {
  // Expected format: { market_id: "...", price: 0.25, ... }
  if (data.market_id && typeof data.price !== 'undefined') {
    // Send price update to service worker for processing
    chrome.runtime.sendMessage({
      type: 'PRICE_UPDATE',
      marketId: data.market_id,
      price: data.price
    }).catch(err => console.log('Service worker not ready yet'));
  }
}

// Listen for requests from content script or service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OFFSCREEN_CONNECT') {
    console.log('Offscreen connection requested');
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      initWebSocket();
    }
    sendResponse({ status: 'connected' });
  }
  
  if (request.type === 'SUBSCRIBE_MARKET') {
    subscribeToMarket(request.marketId);
    sendResponse({ status: 'subscribed' });
  }
  
  if (request.type === 'UNSUBSCRIBE_MARKET') {
    unsubscribeFromMarket(request.marketId);
    sendResponse({ status: 'unsubscribed' });
  }
});

// Subscribe to a market
function subscribeToMarket(marketId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = {
      type: 'subscribe',
      market: marketId
    };
    ws.send(JSON.stringify(msg));
    console.log('Subscribed to market:', marketId);
  }
}

// Unsubscribe from a market
function unsubscribeFromMarket(marketId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = {
      type: 'unsubscribe',
      market: marketId
    };
    ws.send(JSON.stringify(msg));
    console.log('Unsubscribed from market:', marketId);
  }
}

// Initialize on load
initWebSocket();
