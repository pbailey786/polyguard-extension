// PolyGuard Service Worker
// Manages price monitoring and alert triggers

const STORAGE_KEY = 'polyguard_stoploss_orders';

// Monitor active stop-loss orders
chrome.runtime.onInstalled.addListener(() => {
  console.log('PolyGuard service worker installed');
  initializeStorage();
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_ORDERS') {
    getOrders(sendResponse);
    return true; // Async response
  }
  
  if (request.type === 'ADD_ORDER') {
    addOrder(request.order, sendResponse);
    return true;
  }
  
  if (request.type === 'REMOVE_ORDER') {
    removeOrder(request.orderId, sendResponse);
    return true;
  }
  
  if (request.type === 'PRICE_UPDATE') {
    handlePriceUpdate(request.marketId, request.price);
    sendResponse({ status: 'ok' });
  }
});

// Initialize storage with empty orders if not present
function initializeStorage() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.local.set({ [STORAGE_KEY]: [] });
    }
  });
}

// Get all active orders
function getOrders(callback) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    callback(result[STORAGE_KEY] || []);
  });
}

// Add a new stop-loss order
function addOrder(order, callback) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const orders = result[STORAGE_KEY] || [];
    const newOrder = {
      id: Date.now().toString(),
      ...order,
      createdAt: new Date().toISOString(),
      active: true
    };
    orders.push(newOrder);
    chrome.storage.local.set({ [STORAGE_KEY]: orders }, () => {
      callback(newOrder);
    });
  });
}

// Remove an order
function removeOrder(orderId, callback) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const orders = result[STORAGE_KEY] || [];
    const filtered = orders.filter(o => o.id !== orderId);
    chrome.storage.local.set({ [STORAGE_KEY]: filtered }, () => {
      callback({ status: 'removed', orderId });
    });
  });
}

// Handle price updates from WebSocket
function handlePriceUpdate(marketId, currentPrice) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const orders = result[STORAGE_KEY] || [];
    
    orders.forEach(order => {
      if (order.marketId === marketId && order.active && currentPrice <= order.stopPrice) {
        triggerAlert(order, currentPrice);
        order.active = false; // Deactivate after trigger
      }
    });
    
    chrome.storage.local.set({ [STORAGE_KEY]: orders });
  });
}

// Trigger alert and notification
function triggerAlert(order, triggerPrice) {
  const notification = {
    type: 'basic',
    iconUrl: 'public/icon-48.png',
    title: 'PolyGuard Alert',
    message: `Stop-loss triggered: ${order.marketName} at $${triggerPrice.toFixed(4)} (target: $${order.stopPrice.toFixed(4)})`
  };
  
  chrome.notifications.create(notification, (notificationId) => {
    console.log('Alert triggered:', order.id, 'price:', triggerPrice);
  });
}
