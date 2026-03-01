// PolyGuard Event Page Popup - Bulk Stop Setting
import React, { useEffect, useState } from 'react';

interface EventMarket {
  id: string;
  title: string;
  currentPrice: number;
  priceYes: number;
  priceNo: number;
  volume: number;
  url: string;
}

interface EventPageData {
  eventName: string;
  eventSlug: string;
  markets: EventMarket[];
  marketCount: number;
}

type CoordinationMode = 'independent' | 'family';

interface SelectedMarkets {
  [marketId: string]: boolean;
}

export function EventPopup() {
  const [eventData, setEventData] = useState<EventPageData | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<SelectedMarkets>({});
  const [stopPrice, setStopPrice] = useState<string>('');
  const [coordinationMode, setCoordinationMode] = useState<CoordinationMode>('independent');
  const [loading, setLoading] = useState(true);
  const [settingStops, setSettingStops] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadEventData();
  }, []);

  const loadEventData = async () => {
    try {
      // Request event data from content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'getEventData' },
            (response) => {
              if (response?.eventData) {
                setEventData(response.eventData);
                // Pre-select all markets
                const selected: SelectedMarkets = {};
                response.eventData.markets.forEach((market: EventMarket) => {
                  selected[market.id] = true;
                });
                setSelectedMarkets(selected);
              }
              setLoading(false);
            }
          );
        }
      });
    } catch (error) {
      console.error('Error loading event data:', error);
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const allSelected: SelectedMarkets = {};
    if (eventData) {
      eventData.markets.forEach((market) => {
        allSelected[market.id] = true;
      });
    }
    setSelectedMarkets(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedMarkets({});
  };

  const handleToggleMarket = (marketId: string) => {
    setSelectedMarkets((prev) => ({
      ...prev,
      [marketId]: !prev[marketId],
    }));
  };

  const getSelectedCount = () => {
    return Object.values(selectedMarkets).filter((v) => v).length;
  };

  const handleSetStops = async () => {
    if (!stopPrice || parseFloat(stopPrice) <= 0) {
      showMessage('Please enter a valid stop price', 'error');
      return;
    }

    const selectedIds = Object.keys(selectedMarkets).filter((id) => selectedMarkets[id]);
    if (selectedIds.length === 0) {
      showMessage('Please select at least one market', 'error');
      return;
    }

    setSettingStops(true);
    showMessage(`Setting stops on ${selectedIds.length} market(s)...`, 'info');

    try {
      // Send bulk stop order request to service worker
      chrome.runtime.sendMessage(
        {
          type: 'BULK_SET_STOPS',
          stops: selectedIds.map((marketId) => {
            const market = eventData?.markets.find((m) => m.id === marketId);
            return {
              marketId,
              marketName: market?.title || 'Unknown Market',
              stopPrice: parseFloat(stopPrice),
              currentPrice: market?.currentPrice || 0,
            };
          }),
          coordinationMode,
        },
        (result) => {
          if (result) {
            showMessage(`Successfully set stops on ${selectedIds.length} market(s)!`, 'success');
            // Reset form
            setStopPrice('');
            setTimeout(() => {
              setMessage('');
            }, 3000);
          } else {
            showMessage('Failed to set stops', 'error');
          }
          setSettingStops(false);
        }
      );
    } catch (error) {
      console.error('Error setting stops:', error);
      showMessage('Error setting stops', 'error');
      setSettingStops(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  if (loading) {
    return (
      <div className="event-popup-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading event markets...</p>
        </div>
      </div>
    );
  }

  if (!eventData || eventData.markets.length === 0) {
    return (
      <div className="event-popup-container">
        <div className="not-event">
          <div className="icon">📊</div>
          <h2>No Event Found</h2>
          <p>This doesn't appear to be a Polymarket event page with multiple markets.</p>
          <p className="hint">Navigate to an event page like /event/elon-musk-of-tweets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-popup-container">
      <header className="event-header">
        <h1>🎩 PolyGuard Event</h1>
        <p className="event-title">{eventData.eventName}</p>
      </header>

      {/* Event Stats */}
      <section className="event-stats">
        <div className="stat">
          <span className="stat-label">Total Markets</span>
          <span className="stat-value">{eventData.marketCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Selected</span>
          <span className="stat-value highlight">{getSelectedCount()}</span>
        </div>
      </section>

      {/* Market Selection */}
      <section className="market-selection">
        <div className="selection-header">
          <h3>Markets ({getSelectedCount()} of {eventData.marketCount})</h3>
          <div className="selection-buttons">
            <button onClick={handleSelectAll} className="btn-small">Select All</button>
            <button onClick={handleDeselectAll} className="btn-small">Clear</button>
          </div>
        </div>

        <div className="markets-list">
          {eventData.markets.map((market) => (
            <div
              key={market.id}
              className={`market-item ${selectedMarkets[market.id] ? 'selected' : ''}`}
              onClick={() => handleToggleMarket(market.id)}
            >
              <input
                type="checkbox"
                checked={selectedMarkets[market.id] || false}
                onChange={() => handleToggleMarket(market.id)}
                className="market-checkbox"
              />
              <div className="market-details">
                <p className="market-title">{market.title.substring(0, 60)}...</p>
                <div className="market-prices">
                  <span>Yes: ${market.priceYes.toFixed(2)}</span>
                  <span>No: ${market.priceNo.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stop Price Configuration */}
      <section className="config-section">
        <h3>Set Stop Price</h3>

        <div className="form-group">
          <label>Stop Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="Enter stop price (e.g., 0.35)"
            className="price-input"
          />
          <p className="hint-text">Suggested: 10% below current market prices</p>
        </div>

        {/* Coordination Mode */}
        <div className="form-group">
          <label>Coordination Mode</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="coordination"
                value="independent"
                checked={coordinationMode === 'independent'}
                onChange={(e) => setCoordinationMode(e.target.value as CoordinationMode)}
              />
              Independent (set each separately)
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="coordination"
                value="family"
                checked={coordinationMode === 'family'}
                onChange={(e) => setCoordinationMode(e.target.value as CoordinationMode)}
              />
              Family (if one hits, close all)
            </label>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`message message-${messageType}`}>
            {messageType === 'success' && '✓ '}
            {messageType === 'error' && '✗ '}
            {messageType === 'info' && 'ℹ '}
            {message}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSetStops}
          disabled={!stopPrice || getSelectedCount() === 0 || settingStops}
          className="btn-primary"
        >
          {settingStops ? 'Setting Stops...' : `Set Stops on ${getSelectedCount()} Markets 🎯`}
        </button>
      </section>

      <footer className="event-footer">
        <p className="version">PolyGuard v1.0.0 - Event Mode</p>
      </footer>
    </div>
  );
}

// Inline styles for event popup
const styles = `
  .event-popup-container {
    width: 520px;
    max-height: 90vh;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .event-popup-container * {
    box-sizing: border-box;
  }

  .event-header {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    padding: 16px;
    border-bottom: 2px solid #1e40af;
  }

  .event-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .event-title {
    margin: 4px 0 0 0;
    font-size: 13px;
    opacity: 0.9;
  }

  .not-event {
    padding: 40px 20px;
    text-align: center;
  }

  .not-event .icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .not-event h2 {
    margin: 0 0 8px 0;
    font-size: 16px;
  }

  .not-event p {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #cbd5e1;
  }

  .not-event .hint {
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

  .event-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.05);
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
    margin-top: 4px;
  }

  .stat-value.highlight {
    color: #60a5fa;
  }

  .market-selection {
    flex: 1;
    overflow-y: auto;
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  }

  .selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .selection-header h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #60a5fa;
    text-transform: uppercase;
  }

  .selection-buttons {
    display: flex;
    gap: 8px;
  }

  .btn-small {
    padding: 4px 8px;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-small:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .markets-list {
    max-height: 280px;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .market-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .market-item:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.25);
  }

  .market-item.selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .market-checkbox {
    margin-top: 2px;
    cursor: pointer;
  }

  .market-details {
    flex: 1;
  }

  .market-title {
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 500;
    color: #e2e8f0;
  }

  .market-prices {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #94a3b8;
  }

  .config-section {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
  }

  .config-section h3 {
    margin: 0 0 12px 0;
    font-size: 12px;
    font-weight: 600;
    color: #60a5fa;
    text-transform: uppercase;
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
    margin-bottom: 4px;
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

  .hint-text {
    margin: 4px 0 0 0;
    font-size: 10px;
    color: #64748b;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    cursor: pointer;
  }

  .radio-label input {
    cursor: pointer;
  }

  .message {
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .message-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }

  .message-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fecaca;
  }

  .message-info {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #93c5fd;
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

  .event-footer {
    padding: 12px;
    text-align: center;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
    background: rgba(0, 0, 0, 0.3);
  }

  .version {
    margin: 0;
    font-size: 10px;
    color: #64748b;
  }

  /* Scrollbar styling */
  .markets-list::-webkit-scrollbar,
  .market-selection::-webkit-scrollbar {
    width: 6px;
  }

  .markets-list::-webkit-scrollbar-track,
  .market-selection::-webkit-scrollbar-track {
    background: rgba(59, 130, 246, 0.05);
  }

  .markets-list::-webkit-scrollbar-thumb,
  .market-selection::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 3px;
  }

  .markets-list::-webkit-scrollbar-thumb:hover,
  .market-selection::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.5);
  }
`;

export default EventPopup;
