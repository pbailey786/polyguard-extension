# PolyGuard Phase 1 - Local Testing Guide

This guide walks through testing the PolyGuard Chrome extension locally.

## Prerequisites

- Chrome or Chromium browser (version 116+)
- `/root/.openclaw/workspace/polyguard-phase1/dist/` built and ready

## Installation Steps

### 1. Build the Extension

```bash
cd /root/.openclaw/workspace/polyguard-phase1
npm run build
```

You should see output like:
```
> polyguard-phase1@0.1.0 build
> mkdir -p dist && cp -r src public manifest.json dist/
```

### 2. Open Chrome Extensions Page

In Chrome/Chromium:
1. Press `Ctrl+Shift+M` to open a new window (or use existing)
2. Go to `chrome://extensions/` in the address bar
3. Or: Menu (⋮) → More tools → Extensions

### 3. Enable Developer Mode

In the top-right corner of `chrome://extensions/`:
- Toggle **"Developer mode"** ON (should turn blue/enabled)

### 4. Load the Extension

Click **"Load unpacked"** button that appears after enabling Developer Mode:
1. A file picker opens
2. Navigate to: `/root/.openclaw/workspace/polyguard-phase1/dist/`
3. Click **"Select Folder"**
4. Extension should load immediately

**Success indicators:**
- ✅ Blue PolyGuard card appears in the extensions list
- ✅ Extension ID assigned (e.g., `ajknfhapodepkjij...`)
- ✅ Status shows "Loaded from: /root/.openclaw/workspace/polyguard-phase1/dist"

## Testing the Extension

### Test 1: Content Script Detection

1. Visit https://polymarket.com in a new tab
2. **Expected:** Blue **⚠️ PolyGuard** panel appears in **bottom-right corner**
3. **If missing:** 
   - Check extension is enabled in `chrome://extensions/`
   - Open DevTools (F12) → Console tab
   - Look for: `"PolyGuard content script loaded on: https://polymarket.com..."`
   - If error appears, check manifest paths

### Test 2: Injected Panel

1. On polymarket.com with PolyGuard panel visible
2. Click the **⚠️ PolyGuard** header
3. **Expected:** Panel expands, shows form:
   - Market ID input
   - Market Name input
   - Stop Price input
   - "Add Stop-Loss" button
4. **Styling check:** Text should be readable, colors blue/white (not broken by Polymarket CSS)

### Test 3: Add Order via Panel

1. In the expanded PolyGuard panel on polymarket.com:
   - **Market ID:** `0xabcd1234`
   - **Market Name:** `Trump 2024`
   - **Stop Price:** `0.35`
2. Click **"Add Stop-Loss"**
3. **Expected:** 
   - Form clears
   - Order appears below in panel (showing market name + stop price)
   - No console errors

### Test 4: Popup Dashboard

1. Click the **PolyGuard icon** in Chrome toolbar (top-right, near address bar)
   - If not visible: Click **Extension icon puzzle piece** → Find PolyGuard → Pin it
2. **Expected:** Popup opens showing:
   - "⚠️ PolyGuard" title
   - "Connected Wallet" section (shows "No wallet connected" or address)
   - "Add Stop-Loss Order" form
   - "Active Orders" list showing your orders from step 3

### Test 5: Order Persistence

1. Close the popup
2. Refresh the polymarket.com page (F5)
3. **Expected:**
   - PolyGuard panel still shows your orders
   - Click popup icon again → orders still there
   - Orders persisted in Chrome storage ✅

### Test 6: Remove Order

1. In popup, find your order
2. Click **"Remove"** button (red button on right of order)
3. **Expected:** Order disappears from list immediately
4. Refresh page → order still gone (persisted removal) ✅

### Test 7: Wallet Connection

1. In popup, click **"Connect Wallet (EIP-6963)"** button
2. **Expected Options:**
   - If you have a Web3 wallet installed (MetaMask, etc.): popup appears to confirm
   - If no wallet: Button may do nothing (framework-only in Phase 1)
3. **If wallet connects:** Button text changes to "Wallet Connected ✓"

### Test 8: Multiple Orders

1. Add several orders via popup:
   - Order 1: BTC Rally 2024, stop 0.40
   - Order 2: AI Bubble, stop 0.20
   - Order 3: Politics 2024, stop 0.25
2. **Expected:**
   - All appear in popup list
   - All appear in panel on polymarket.com
   - All persist after refresh

### Test 9: Console Health Check

1. Open DevTools on polymarket.com (F12)
2. Go to **Console** tab
3. **Expected messages:**
   ```
   PolyGuard content script loaded on: https://polymarket.com/...
   Connected to offscreen document
   ```
4. **Should NOT see:**
   - Red error messages
   - "Uncaught" exceptions
   - Manifest errors

### Test 10: Service Worker Status

1. Go back to `chrome://extensions/`
2. Find PolyGuard extension
3. Click **"Inspect views"** → **"service worker"**
4. Opens DevTools for the service worker
5. **Expected:** Console shows activity as you add/remove orders

## Troubleshooting

### Extension doesn't load

**Problem:** Error like `"Manifest file missing"` or `"Failed to load"`

**Solution:**
- Verify `/root/.openclaw/workspace/polyguard-phase1/dist/manifest.json` exists
- Run `npm run build` again
- Reload the extension (refresh icon on extension card)

### Content script doesn't inject on polymarket.com

**Problem:** No **⚠️ PolyGuard** panel appears

**Solution:**
1. Check manifest: `"matches": ["https://polymarket.com/*"]`
2. Check you're on actual polymarket.com (not a different domain)
3. Open DevTools (F12) → Console → look for errors
4. Try `hard refresh` (Ctrl+Shift+R) on the page
5. Disable/re-enable extension on `chrome://extensions/`

### Orders don't persist

**Problem:** Orders gone after page refresh

**Solution:**
1. Check Chrome storage: DevTools → Application → Storage → Local Storage
2. Should see key: `polyguard_stoploss_orders` with array of orders
3. If missing, service worker isn't saving
4. Inspect service worker (see Test 10) for errors

### Popup won't open

**Problem:** Clicking extension icon does nothing

**Solution:**
1. Right-click extension icon → "Manage extension"
2. Reload the extension (refresh icon)
3. Check `dist/src/popup.html` exists
4. Try unpacking and repacking (Load unpacked again)

### Pop-up text overlaps or looks broken

**Problem:** PolyGuard UI looks malformed

**Solution:**
- This is likely Polymarket CSS breaking the Shadow DOM
- Check that your browser zoom is 100% (Ctrl+0)
- Try on a different Polymarket page
- Shadow DOM should be isolated, but Polymarket CSS might be aggressive

## Expected Behavior Summary

| Action | Expected Result | Status |
|--------|-----------------|--------|
| Load extension | Appears in `chrome://extensions/` | ✅ |
| Visit polymarket.com | ⚠️ Panel appears bottom-right | ✅ |
| Add order via panel | Order appears in list | ✅ |
| Add order via popup | Order appears everywhere | ✅ |
| Refresh page | Orders still there | ✅ |
| Remove order | Disappears from all views | ✅ |
| Connect wallet | Button changes or wallet UI appears | 🟡 Framework only |
| WebSocket connects | No errors in console | ✅ (Framework) |

## Success Criteria

✅ **Phase 1 is SUCCESSFUL if:**
1. Extension loads without errors
2. Content script injects on polymarket.com
3. Can add/remove orders
4. Orders persist
5. Popup dashboard works
6. No console errors

## Next Steps

Once testing passes:
1. Verify all tests in checklist ✅
2. Push to GitHub (`feature/phase-1-extension-mvp`)
3. Begin Phase 2: Real Polymarket API integration

## Questions?

- Check `README.md` for architecture details
- Check service worker console for price monitoring logs
- Check offscreen console for WebSocket status

---

**Built:** 2026-03-01  
**Status:** Ready for Testing  
**Version:** 0.1.0 (Phase 1 MVP)
