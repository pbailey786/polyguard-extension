# PolyGuard - Phase 1 MVP

A Chrome extension for managing stop-loss orders on Polymarket.

## Phase 1 Deliverables

- [x] Manifest V3 config (minimum_chrome_version: "116")
- [x] Content script: detect Polymarket pages
- [x] Content script: inject stop-loss UI via Shadow DOM
- [x] Offscreen document: WebSocket connection to Polymarket
- [x] Service worker: monitor prices, trigger alerts
- [x] Popup: dashboard showing active stop-losses
- [x] Chrome storage: persist stop-loss configs
- [x] Wallet connection framework (EIP-6963)
- [x] Extension icons

## Project Structure

```
polyguard-phase1/
├── manifest.json          # Manifest V3 config
├── dist/                  # Built extension (load this in Chrome)
│   ├── manifest.json
│   ├── src/
│   │   ├── service-worker.js      # Price monitoring & alerts
│   │   ├── content-script.js      # Injects UI into Polymarket
│   │   ├── popup.html             # Dashboard
│   │   ├── popup.js               # Dashboard logic
│   │   ├── offscreen.html         # WebSocket manager
│   │   └── offscreen.js           # WebSocket handler
│   └── public/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/                   # Source files
├── public/                # Assets
└── package.json
```

## Quick Start

### 1. Build the Extension

```bash
cd /root/.openclaw/workspace/polyguard-phase1
npm run build
```

Output: `dist/` folder contains the ready-to-load extension.

### 2. Load in Chrome (Dev Mode)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select `/root/.openclaw/workspace/polyguard-phase1/dist`
6. Extension should load with blue PolyGuard icon

### 3. Test on Polymarket

1. Visit https://polymarket.com
2. You should see a small **⚠️ PolyGuard** panel in the bottom-right corner
3. Click the panel to expand it
4. You can:
   - Add stop-loss orders (requires Market ID, Name, and Stop Price)
   - View active orders
   - Remove orders

### 4. Test the Popup Dashboard

1. Click the extension icon in the Chrome toolbar
2. Opens the PolyGuard dashboard
3. You can:
   - Connect a wallet (EIP-6963)
   - Add stop-loss orders
   - View and manage all active orders

## Architecture

### Service Worker (`src/service-worker.js`)
- Manages stop-loss order state (Chrome storage)
- Receives price updates from offscreen document
- Triggers alerts when price reaches stop threshold

### Content Script (`src/content-script.js`)
- Detects Polymarket pages (polymarket.com)
- Injects a Shadow DOM UI for the PolyGuard panel
- Communicates with service worker for order management
- Isolated styling to avoid conflicts with Polymarket

### Offscreen Document (`src/offscreen.html` + `src/offscreen.js`)
- Maintains persistent WebSocket connection to Polymarket
- Listens for market price updates
- Forwards price data to service worker
- Auto-reconnects on disconnect

### Popup (`src/popup.html` + `src/popup.js`)
- Dashboard UI for managing orders
- Displays all active stop-loss orders
- EIP-6963 wallet connection support
- Syncs state from service worker

## Next Steps (Phase 2)

- [ ] Real Polymarket API integration (currently mock)
- [ ] WebSocket schema validation
- [ ] User preferences (alerts, themes)
- [ ] Trade execution on stop-loss trigger
- [ ] Portfolio tracking
- [ ] Price history & analytics

## Testing Checklist

- [ ] Extension loads in `chrome://extensions`
- [ ] Content script injects on polymarket.com
- [ ] Shadow DOM panel appears (bottom-right corner)
- [ ] Can add orders via popup
- [ ] Can add orders via injected panel
- [ ] Orders persist in Chrome storage
- [ ] Popup dashboard shows orders
- [ ] Remove orders button works
- [ ] Wallet connection attempt works (EIP-6963)
- [ ] Console shows no errors

## Debugging

### View Console Logs
- **Service Worker**: chrome://extensions → Find PolyGuard → "Inspect views" service worker
- **Content Script**: Open DevTools on polymarket.com (F12) → Console
- **Popup**: Open popup → F12 to inspect

### Storage
- View stored orders: DevTools → Application → Local Storage → `polyguard_stoploss_orders`

### WebSocket
- Check offscreen document console for WebSocket connection status

## Known Limitations

- WebSocket URL is placeholder (needs real Polymarket endpoint)
- No actual price monitoring yet (needs integration)
- No trade execution (Phase 2)
- Wallet connection is framework only (needs provider integration)

## Build Commands

```bash
npm run build    # Build extension to dist/
npm run dev      # Same as build (for now)
npm run clean    # Remove dist/
```

## License

MIT
