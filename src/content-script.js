// PolyGuard Content Script
// Detects Polymarket pages and injects stop-loss UI

console.log('PolyGuard content script loaded on:', window.location.href);

// Only run on Polymarket pages
if (window.location.hostname.includes('polymarket.com')) {
  injectUI();
  connectToOffscreenDocument();
}

// Inject stop-loss UI via Shadow DOM
function injectUI() {
  // Create container for shadow DOM
  const container = document.createElement('div');
  container.id = 'polyguard-root';
  
  // Wait for body to exist
  if (document.body) {
    document.body.appendChild(container);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
    });
  }
  
  // Attach shadow DOM
  const shadow = container.attachShadow({ mode: 'open' });
  
  // Create panel HTML
  const panelHTML = `
    <style>
      :host {
        --primary: #3b82f6;
        --danger: #ef4444;
        --bg: #1f2937;
        --text: #f3f4f6;
      }
      
      .polyguard-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background: var(--bg);
        border: 1px solid var(--primary);
        border-radius: 8px;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: var(--text);
        z-index: 10000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      
      .polyguard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        border-bottom: 1px solid var(--primary);
        padding-bottom: 8px;
      }
      
      .polyguard-title {
        font-weight: 600;
        font-size: 14px;
      }
      
      .polyguard-toggle {
        cursor: pointer;
        font-size: 12px;
        color: var(--primary);
      }
      
      .polyguard-content {
        display: none;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .polyguard-content.open {
        display: block;
      }
      
      .polyguard-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .polyguard-input {
        padding: 8px;
        border: 1px solid var(--primary);
        background: rgba(59, 130, 246, 0.1);
        color: var(--text);
        border-radius: 4px;
        font-size: 12px;
      }
      
      .polyguard-button {
        padding: 8px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }
      
      .polyguard-button:hover {
        opacity: 0.9;
      }
      
      .polyguard-orders {
        border-top: 1px solid var(--primary);
        padding-top: 8px;
      }
      
      .polyguard-order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px;
        background: rgba(59, 130, 246, 0.05);
        border-radius: 4px;
        margin-bottom: 4px;
        font-size: 11px;
      }
      
      .polyguard-order-info {
        flex: 1;
      }
      
      .polyguard-order-market {
        font-weight: 500;
      }
      
      .polyguard-order-price {
        font-size: 10px;
        color: #9ca3af;
      }
      
      .polyguard-order-remove {
        background: var(--danger);
        color: white;
        border: none;
        border-radius: 2px;
        padding: 2px 6px;
        cursor: pointer;
        font-size: 10px;
      }
    </style>
    
    <div class="polyguard-panel">
      <div class="polyguard-header">
        <span class="polyguard-title">⚠️ PolyGuard</span>
        <span class="polyguard-toggle" data-toggle="true">▼</span>
      </div>
      
      <div class="polyguard-content">
        <div class="polyguard-form">
          <input class="polyguard-input" type="text" placeholder="Market ID" data-input="marketId" />
          <input class="polyguard-input" type="text" placeholder="Market Name" data-input="marketName" />
          <input class="polyguard-input" type="number" placeholder="Stop Price ($)" step="0.01" data-input="stopPrice" />
          <button class="polyguard-button" data-action="addOrder">Add Stop-Loss</button>
        </div>
        
        <div class="polyguard-orders" data-orders-container>
          <div style="font-size: 11px; color: #9ca3af; padding: 4px;">No active orders</div>
        </div>
      </div>
    </div>
  `;
  
  shadow.innerHTML = panelHTML;
  
  // Bind events
  const toggle = shadow.querySelector('[data-toggle]');
  const content = shadow.querySelector('.polyguard-content');
  const addButton = shadow.querySelector('[data-action="addOrder"]');
  const ordersContainer = shadow.querySelector('[data-orders-container]');
  
  toggle.addEventListener('click', () => {
    content.classList.toggle('open');
    toggle.textContent = content.classList.contains('open') ? '▲' : '▼';
  });
  
  addButton.addEventListener('click', () => {
    const marketId = shadow.querySelector('[data-input="marketId"]').value;
    const marketName = shadow.querySelector('[data-input="marketName"]').value;
    const stopPrice = parseFloat(shadow.querySelector('[data-input="stopPrice"]').value);
    
    if (marketId && marketName && stopPrice) {
      chrome.runtime.sendMessage({
        type: 'ADD_ORDER',
        order: { marketId, marketName, stopPrice }
      }, (order) => {
        console.log('Order added:', order);
        loadOrders(shadow, ordersContainer);
      });
    }
  });
  
  // Load orders on init
  loadOrders(shadow, ordersContainer);
}

// Load and display orders
function loadOrders(shadow, container) {
  chrome.runtime.sendMessage({ type: 'GET_ORDERS' }, (orders) => {
    if (orders.length === 0) {
      container.innerHTML = '<div style="font-size: 11px; color: #9ca3af; padding: 4px;">No active orders</div>';
    } else {
      container.innerHTML = orders.map(order => `
        <div class="polyguard-order-item">
          <div class="polyguard-order-info">
            <div class="polyguard-order-market">${order.marketName}</div>
            <div class="polyguard-order-price">Stop: $${order.stopPrice.toFixed(4)}</div>
          </div>
          <button class="polyguard-order-remove" data-remove-order="${order.id}">Remove</button>
        </div>
      `).join('');
      
      // Bind remove buttons
      shadow.querySelectorAll('[data-remove-order]').forEach(btn => {
        btn.addEventListener('click', () => {
          const orderId = btn.getAttribute('data-remove-order');
          chrome.runtime.sendMessage({ type: 'REMOVE_ORDER', orderId }, () => {
            loadOrders(shadow, container);
          });
        });
      });
    }
  });
}

// Connect to offscreen document for WebSocket
function connectToOffscreenDocument() {
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_CONNECT' }, (response) => {
    console.log('Connected to offscreen document');
  });
}
