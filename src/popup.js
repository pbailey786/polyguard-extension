// PolyGuard Popup Dashboard Script

const addOrderBtn = document.getElementById('addOrderBtn');
const marketIdInput = document.getElementById('marketId');
const marketNameInput = document.getElementById('marketName');
const stopPriceInput = document.getElementById('stopPrice');
const ordersList = document.getElementById('ordersList');
const connectWalletBtn = document.getElementById('connectWallet');
const walletAddressDiv = document.getElementById('walletAddress');

// Load orders on popup open
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  checkWalletConnection();
});

// Add order
addOrderBtn.addEventListener('click', () => {
  const marketId = marketIdInput.value.trim();
  const marketName = marketNameInput.value.trim();
  const stopPrice = parseFloat(stopPriceInput.value);
  
  if (!marketId || !marketName || !stopPrice) {
    alert('Please fill in all fields');
    return;
  }
  
  chrome.runtime.sendMessage(
    {
      type: 'ADD_ORDER',
      order: { marketId, marketName, stopPrice }
    },
    (order) => {
      console.log('Order added:', order);
      marketIdInput.value = '';
      marketNameInput.value = '';
      stopPriceInput.value = '';
      loadOrders();
    }
  );
});

// Load and display orders
function loadOrders() {
  chrome.runtime.sendMessage({ type: 'GET_ORDERS' }, (orders) => {
    if (!orders || orders.length === 0) {
      ordersList.innerHTML = '<div class="empty-state">No active orders</div>';
    } else {
      ordersList.innerHTML = orders.map(order => `
        <div class="order-item">
          <div class="order-details">
            <div class="order-name">${order.marketName}</div>
            <div class="order-price">Stop: $${order.stopPrice.toFixed(4)} | ID: ${order.marketId.substring(0, 8)}...</div>
          </div>
          <button class="danger" onclick="removeOrder('${order.id}')" style="width: auto; padding: 4px 8px; font-size: 11px;">Remove</button>
        </div>
      `).join('');
    }
  });
}

// Remove order
function removeOrder(orderId) {
  chrome.runtime.sendMessage(
    { type: 'REMOVE_ORDER', orderId },
    () => {
      loadOrders();
    }
  );
}

// EIP-6963: Connect wallet
connectWalletBtn.addEventListener('click', connectWallet);

function connectWallet() {
  // EIP-6963 wallet discovery
  const event = new Event('eip6963:requestProvider');
  window.dispatchEvent(event);
  
  window.addEventListener('eip6963:announceProvider', handleWalletAnnouncement);
}

function handleWalletAnnouncement(event) {
  const { detail } = event;
  const provider = detail.provider;
  
  if (provider) {
    // Request account access
    provider.request({ method: 'eth_requestAccounts' })
      .then(accounts => {
        const address = accounts[0];
        chrome.storage.local.set({ 'polyguard_wallet': address });
        walletAddressDiv.textContent = address;
        connectWalletBtn.textContent = 'Wallet Connected ✓';
        connectWalletBtn.disabled = true;
      })
      .catch(err => console.error('Wallet connection failed:', err));
  }
}

function checkWalletConnection() {
  chrome.storage.local.get('polyguard_wallet', (result) => {
    if (result.polyguard_wallet) {
      walletAddressDiv.textContent = result.polyguard_wallet;
      connectWalletBtn.textContent = 'Wallet Connected ✓';
      connectWalletBtn.disabled = true;
    }
  });
}

// Refresh orders every 5 seconds
setInterval(loadOrders, 5000);
