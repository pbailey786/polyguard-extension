// PolyGuard Content Script - Market Detection
// Extracts market data from Polymarket pages and sends to popup

interface MarketData {
  marketId: string;
  marketName: string;
  currentPrice: number;
  yes: number;
  no: number;
  detected: boolean;
}

// Detect market data from page
function detectMarketData(): MarketData {
  const defaultData: MarketData = {
    marketId: '',
    marketName: '',
    currentPrice: 0,
    yes: 0,
    no: 0,
    detected: false,
  };

  // Extract market ID from URL
  const url = window.location.pathname;
  const marketIdMatch = url.match(/\/markets?\/([a-zA-Z0-9]+)/);
  
  if (!marketIdMatch) {
    return defaultData;
  }

  const marketId = marketIdMatch[1];

  // Extract market name from page
  // Try multiple selectors since Polymarket's DOM can vary
  let marketName = '';
  
  // Try h1 first
  const h1 = document.querySelector('h1');
  if (h1?.textContent) {
    marketName = h1.textContent.trim();
  }
  
  // Try h2 if h1 failed
  if (!marketName) {
    const h2 = document.querySelector('h2');
    if (h2?.textContent) {
      marketName = h2.textContent.trim();
    }
  }
  
  // Try meta description
  if (!marketName) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta?.getAttribute('content')) {
      marketName = meta.getAttribute('content')!.split('|')[0].trim();
    }
  }
  
  // Try page title
  if (!marketName) {
    const title = document.title;
    if (title) {
      marketName = title.split('|')[0].trim();
    }
  }

  // Extract prices (yes/no)
  let yes = 0;
  let no = 0;

  // Look for price display elements
  // Polymarket uses various selectors for prices
  const priceElements = document.querySelectorAll(
    '[data-testid*="price"], [class*="price"], [class*="Price"]'
  );

  // Try to find yes/no prices from the page
  // This is heuristic-based since Polymarket's structure varies
  const pageText = document.body.innerText;
  
  // Look for "Yes" and "No" with associated prices
  const yesMatch = pageText.match(/Yes[\s\n]+(\$?[\d.]+)/i);
  const noMatch = pageText.match(/No[\s\n]+(\$?[\d.]+)/i);

  if (yesMatch) {
    yes = parseFloat(yesMatch[1]);
  }
  if (noMatch) {
    no = parseFloat(noMatch[1]);
  }

  // Fallback: try to extract from visible text
  if (yes === 0 || no === 0) {
    // Look for prices in the format like "0.42" near "Yes" or "No"
    const pricePattern = /(\d+\.\d{2})/g;
    const prices = pageText.match(pricePattern);
    if (prices && prices.length >= 2) {
      // Assume first two prices are yes/no
      yes = parseFloat(prices[0]);
      no = parseFloat(prices[1]);
    }
  }

  const currentPrice = yes > 0 ? yes : no > 0 ? no : 0;

  return {
    marketId,
    marketName,
    currentPrice,
    yes,
    no,
    detected: !!marketId && !!marketName && currentPrice > 0,
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMarketData') {
    const marketData = detectMarketData();
    console.log('Market data detected:', marketData);
    sendResponse({ marketData });
  }
});

// Optional: Watch for page changes and notify background
const observer = new MutationObserver(() => {
  const marketData = detectMarketData();
  if (marketData.detected) {
    chrome.runtime.sendMessage({
      action: 'pageChanged',
      marketData,
    }).catch(() => {
      // Background script might not be ready yet
    });
  }
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });
  });
} else {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
  });
}

console.log('PolyGuard market detection script loaded');
