// PolyGuard Popup - Enhanced with Market Detection and Smart Stop Suggestions
import React, { useEffect, useState } from 'react';

interface MarketData {
  marketId: string;
  marketName: string;
  currentPrice: number;
  yes: number;
  no: number;
  detected: boolean;
}

interface Order {
  id: string;
  marketId: string;
  marketName: string;
  stopPrice: number;
  currentPrice?: number;
}

export function Popup() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [stopPrice, setStopPrice] = useState('');
  const [suggestedStop, setSuggestedStop] = useState('');
  const [isPolymarket, setIsPolymarket] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    // Check if on Polymarket
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url?.includes('polymarket.com')) {
        setIsPolymarket(true);
        setManualMode(false);

        // Request market data from content script
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'getMarketData' },
            (response) => {
              if (response?.marketData) {
                const data = response.marketData;
                setMarketData(data);

                if (data.detected && data.currentPrice > 0) {
                  // Suggest stop price: 10% below current price
                  const suggested = (data.currentPrice * 0.9).toFixed(2);
                  setSuggestedStop(suggested);
                  setStopPrice(suggested);
                } else {
                  setManualMode(true);
                }
              } else {
                setManualMode(true);
              }
              setLoading(false);
            }
          );
        }
      } else {
        setIsPolymarket(false);
        setLoading(false);
      }
    });

    // Load existing orders
    loadOrders();

    // Check wallet connection
    checkWalletConnection();
  }, []);

  const loadOrders = () => {
    chrome.runtime.sendMessage({ type: 'GET_ORDERS' }, (orders) => {
      setOrders(orders || []);
    });
  };

  const checkWalletConnection = () => {
    chrome.storage.local.get('polyguard_wallet', (result) => {
      setWalletConnected(!!result.polyguard_wallet);
    });
  };

  const handleAddOrder = () => {
    if (!stopPrice) {
      alert('Please enter a stop price');
      return;
    }

    const order = {
      marketId: marketData?.marketId || '',
      marketName: marketData?.marketName || 'Manual Order',
      stopPrice: parseFloat(stopPrice),
      currentPrice: marketData?.currentPrice || 0,
    };

    if (!order.marketId && !manualMode) {
      alert('Could not detect market. Please enter manually.');
      setManualMode(true);
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: 'ADD_ORDER',
        order,
      },
      (result) => {
        if (result) {
          // Reset form
          setStopPrice('');
          setSuggestedStop('');
          loadOrders();
        }
      }
    );
  };

  const handleRemoveOrder = (orderId: string) => {
    chrome.runtime.sendMessage(
      { type: 'REMOVE_ORDER', orderId },
      () => {
        loadOrders();
      }
    );
  };

  if (!isPolymarket) {
    return (
      <div className="popup-container">
        <div className="not-polymarket">
          <div className="icon">🎩</div>
          <h2>PolyGuard</h2>
          <p className="subtitle">Stop-Loss Orders for Polymarket</p>
          <p className="message">Only works on polymarket.com</p>
          <p className="hint">Navigate to a Polymarket page to use this extension</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="header">
        <h1>🎩 PolyGuard</h1>
        <p className="version">v1.0.0</p>
      </header>

      {/* Market Detection Section */}
      {marketData && marketData.detected && (
        <section className="market-section">
          <h3>Market Detected</h3>
          <div className="market-card">
            <div className="market-field">
              <label>Market Name</label>
              <p className="market-value">{marketData.marketName}</p>
            </div>
            <div className="market-field">
              <label>Market ID</label>
              <p className="market-value monospace">{marketData.marketId.substring(0, 12)}...</p>
            </div>
            <div className="market-row">
              <div className="market-field">
                <label>Current Price</label>
                <p className="market-value highlight">${marketData.currentPrice.toFixed(2)}</p>
              </div>
              <div className="market-field">
                <label>Yes/No</label>
                <p className="market-value">
                  ${marketData.yes.toFixed(2)} / ${marketData.no.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Manual Mode Warning */}
      {manualMode && (
        <section className="manual-section">
          <div className="info-box">
            <p>⚠️ Could not auto-detect market. Enter details manually.</p>
          </div>
        </section>
      )}

      {/* Stop Loss Configuration */}
      <section className="config-section">
        <h3>Set Stop-Loss</h3>
        
        <div className="form-group">
          <label>Stop Price ($)</label>
          {suggestedStop && (
            <p className="suggestion">
              Suggested: <strong>${suggestedStop}</strong> (10% below current)
            </p>
          )}
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="Enter stop price"
            className="price-input"
          />
        </div>

        <button
          onClick={handleAddOrder}
          className="btn-primary"
          disabled={!stopPrice}
        >
          Set Stop Loss 🎯
        </button>
      </section>

      {/* Active Orders */}
      {orders.length > 0 && (
        <section className="orders-section">
          <h3>Active Orders ({orders.length})</h3>
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-info">
                  <p className="order-market">{order.marketName}</p>
                  <p className="order-details">
                    Stop: <strong>${order.stopPrice.toFixed(2)}</strong>
                    {order.currentPrice && (
                      <>
                        {' | Current: '}<strong>${order.currentPrice.toFixed(2)}</strong>
                      </>
                    )}
                  </p>
                  <p className="order-id">{order.marketId.substring(0, 8)}...</p>
                </div>
                <button
                  onClick={() => handleRemoveOrder(order.id)}
                  className="btn-remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status */}
      <footer className="footer">
        <p className="status">
          {walletConnected ? '✓ Wallet Connected' : '○ No Wallet'}
        </p>
      </footer>
    </div>
  );
}

// Inline styles
const styles = `
  .popup-container {
    width: 480px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
  }

  .popup-container * {
    box-sizing: border-box;
  }

  .header {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    padding: 16px;
    border-bottom: 2px solid #1e40af;
    text-align: center;
  }

  .header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .version {
    margin: 4px 0 0 0;
    font-size: 11px;
    opacity: 0.8;
  }

  .not-polymarket {
    padding: 40px 20px;
    text-align: center;
  }

  .not-polymarket .icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .not-polymarket h2 {
    margin: 0 0 4px 0;
    font-size: 16px;
  }

  .subtitle {
    margin: 0 0 16px 0;
    font-size: 12px;
    color: #94a3b8;
  }

  .message {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 500;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: #64748b;
  }

  .loading {
    padding: 40px 20px;
    text-align: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    margin: 0 auto 12px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    margin: 0;
    color: #94a3b8;
  }

  section {
    padding: 16px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  }

  section h3 {
    margin: 0 0 12px 0;
    font-size: 12px;
    font-weight: 600;
    color: #60a5fa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .market-card {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 6px;
    padding: 12px;
  }

  .market-field {
    margin-bottom: 8px;
  }

  .market-field:last-child {
    margin-bottom: 0;
  }

  .market-field label {
    display: block;
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }

  .market-value {
    margin: 0;
    font-size: 13px;
    color: #e2e8f0;
    font-weight: 500;
  }

  .market-value.highlight {
    color: #60a5fa;
    font-weight: 600;
  }

  .market-value.monospace {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 11px;
  }

  .market-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
  }

  .info-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    padding: 8px;
    margin: 0;
  }

  .info-box p {
    margin: 0;
    font-size: 12px;
    color: #fecaca;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 4px;
  }

  .suggestion {
    margin: 4px 0 8px 0;
    font-size: 11px;
    color: #94a3b8;
  }

  .suggestion strong {
    color: #60a5fa;
    font-weight: 600;
  }

  .price-input {
    width: 100%;
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 4px;
    color: #e2e8f0;
    font-size: 13px;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .price-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .btn-primary {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .order-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 4px;
    padding: 10px;
    gap: 8px;
  }

  .order-info {
    flex: 1;
  }

  .order-market {
    margin: 0 0 2px 0;
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .order-details {
    margin: 0 0 2px 0;
    font-size: 11px;
    color: #94a3b8;
  }

  .order-details strong {
    color: #60a5fa;
    font-weight: 600;
  }

  .order-id {
    margin: 0;
    font-size: 10px;
    color: #64748b;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .btn-remove {
    padding: 6px 8px;
    background: rgba(239, 68, 68, 0.8);
    color: white;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-remove:hover {
    background: #dc2626;
  }

  .footer {
    padding: 12px;
    text-align: center;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .status {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
  }
`;

// Export component with styles
export default Popup;
