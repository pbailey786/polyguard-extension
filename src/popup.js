// PolyGuard Popup Dashboard Script - Enhanced with Market Detection

let marketData = null;
let orders = [];

// Initialize popup on load
document.addEventListener('DOMContentLoaded', () => {
  initPopup();
});

async function initPopup() {
  const appDiv = document.getElementById('app');
  
  try {
    // Check if we're on Polymarket
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isPolymarket = tab.url?.includes('polymarket.com');
    
    if (!isPolymarket) {
      // Show "Only works on polymarket.com" message
      renderNotPolymarket(appDiv);
      return;
    }
    
    // Try to get market data from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getMarketData' });
      marketData = response?.marketData;
      console.log('Market data received:', marketData);
    } catch (err) {
      console.log('Could not get market data from content script');
    }
    
    // Render the main UI
    renderMainUI(appDiv);
    
    // Load orders
    await loadOrders();
    updateOrdersDisplay(appDiv);
    
  } catch (err) {
    console.error('Error initializing popup:', err);
    appDiv.innerHTML = '<div class="loading"><p>Error loading popup</p></div>';
  }
}

function renderNotPolymarket(container) {
  container.innerHTML = `
    <div class="header">
      <h1>🎩 PolyGuard</h1>
      <p class="version">v1.0.0</p>
    </div>
    <div class="not-polymarket">
      <div class="icon">🎩</div>
      <h2>PolyGuard</h2>
      <p class="subtitle">Stop-Loss Orders for Polymarket</p>
      <p class="message">Only works on polymarket.com</p>
      <p class="hint">Navigate to a Polymarket page to use this extension</p>
    </div>
  `;
}

function renderMainUI(container) {
  let marketSection = '';
  let manualWarning = '';
  
  if (marketData && marketData.detected) {
    marketSection = `
      <section>
        <h3>Market Detected</h3>
        <div class="market-card">
          <div class="market-field">
            <label>Market Name</label>
            <p class="market-value">${escapeHtml(marketData.marketName)}</p>
          </div>
          <div class="market-field">
            <label>Market ID</label>
            <p class="market-value monospace">${marketData.marketId.substring(0, 12)}...</p>
          </div>
          <div class="market-row">
            <div class="market-field">
              <label>Current Price</label>
              <p class="market-value highlight">$${marketData.currentPrice.toFixed(2)}</p>
            </div>
            <div class="market-field">
              <label>Yes/No</label>
              <p class="market-value">$${marketData.yes.toFixed(2)} / $${marketData.no.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  } else if (marketData) {
    manualWarning = `
      <section>
        <div class="info-box">
          <p>⚠️ Could not auto-detect market. Enter details manually.</p>
        </div>
      </section>
    `;
  }
  
  const suggestedStop = marketData && marketData.currentPrice > 0 
    ? (marketData.currentPrice * 0.9).toFixed(2) 
    : '';
  
  container.innerHTML = `
    <div class="header">
      <h1>🎩 PolyGuard</h1>
      <p class="version">v1.0.0</p>
    </div>
    
    ${marketSection}
    ${manualWarning}
    
    <section>
      <h3>Set Stop-Loss</h3>
      
      <div class="form-group">
        <label>Stop Price ($)</label>
        ${suggestedStop ? `<p class="suggestion">Suggested: <strong>$${suggestedStop}</strong> (10% below current)</p>` : ''}
        <input type="number" id="stopPriceInput" step="0.01" min="0" max="1" placeholder="Enter stop price" />
      </div>
      
      <button id="addOrderBtn" class="btn-primary">Set Stop Loss 🎯</button>
    </section>
    
    <section id="ordersSection" style="display: none;">
      <h3>Active Orders</h3>
      <div id="ordersList" class="orders-list">
        <div class="empty-state">Loading orders...</div>
      </div>
    </section>
    
    <footer class="footer">
      <p class="status">✓ Ready to use</p>
    </footer>
  `;
  
  // Pre-fill suggested stop price
  if (suggestedStop) {
    document.getElementById('stopPriceInput').value = suggestedStop;
  }
  
  // Bind add order button
  document.getElementById('addOrderBtn').addEventListener('click', addOrder);
}

function updateOrdersDisplay(container) {
  const ordersSection = container.querySelector('#ordersSection');
  const ordersList = container.querySelector('#ordersList');
  
  if (!orders || orders.length === 0) {
    ordersSection.style.display = 'none';
    return;
  }
  
  ordersSection.style.display = 'block';
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-info">
        <p class="order-market">${escapeHtml(order.marketName)}</p>
        <p class="order-details">
          Stop: <strong>$${order.stopPrice.toFixed(2)}</strong>
          ${order.currentPrice ? ` | Current: <strong>$${order.currentPrice.toFixed(2)}</strong>` : ''}
        </p>
        <p class="order-id">${order.marketId.substring(0, 8)}...</p>
      </div>
      <button class="btn-remove" onclick="removeOrder('${order.id}')">✕</button>
    </div>
  `).join('');
}

async function addOrder() {
  const stopPriceInput = document.getElementById('stopPriceInput');
  const stopPrice = parseFloat(stopPriceInput.value);
  
  if (!stopPrice || stopPrice <= 0) {
    alert('Please enter a valid stop price');
    return;
  }
  
  const order = {
    marketId: marketData?.marketId || 'manual',
    marketName: marketData?.marketName || 'Manual Order',
    stopPrice: stopPrice,
    currentPrice: marketData?.currentPrice || 0,
  };
  
  chrome.runtime.sendMessage(
    {
      type: 'ADD_ORDER',
      order,
    },
    async (result) => {
      if (result) {
        stopPriceInput.value = '';
        await loadOrders();
        const appDiv = document.getElementById('app');
        updateOrdersDisplay(appDiv);
      }
    }
  );
}

async function removeOrder(orderId) {
  chrome.runtime.sendMessage(
    { type: 'REMOVE_ORDER', orderId },
    async () => {
      await loadOrders();
      const appDiv = document.getElementById('app');
      updateOrdersDisplay(appDiv);
    }
  );
}

async function loadOrders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ORDERS' }, (result) => {
      orders = result || [];
      resolve();
    });
  });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Refresh orders every 5 seconds
setInterval(async () => {
  await loadOrders();
  const appDiv = document.getElementById('app');
  if (appDiv) {
    updateOrdersDisplay(appDiv);
  }
}, 5000);
