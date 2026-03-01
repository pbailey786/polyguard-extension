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

// Check if on event page
function isOnEventPage(): boolean {
  const pathname = window.location.pathname;
  return /^\/event\/[a-zA-Z0-9\-]+/.test(pathname);
}

// Get event slug from URL
function getEventSlug(): string | null {
  const match = window.location.pathname.match(/^\/event\/([a-zA-Z0-9\-]+)/);
  return match ? match[1] : null;
}

// Get event name from slug
function getEventNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Fetch related markets for event
async function fetchEventMarkets(eventSlug: string): Promise<EventMarket[]> {
  try {
    const searchTerms = eventSlug
      .split('-')
      .filter((word) => !['of', 'by', 'on', 'in', 'the', 'a', 'an'].includes(word.toLowerCase()))
      .slice(0, 3)
      .join('+');

    const response = await fetch(
      `https://clob.polymarket.com/markets?search=${searchTerms}&limit=100`
    );

    if (!response.ok) {
      console.error('Failed to fetch markets:', response.status);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((market: any) => market.active && !market.closed)
      .map((market: any) => transformMarketData(market))
      .filter((market) => market !== null) as EventMarket[];
  } catch (error) {
    console.error('Error fetching event markets:', error);
    return [];
  }
}

// Transform raw market data
function transformMarketData(market: any): EventMarket | null {
  try {
    let priceYes = 0;
    let priceNo = 0;

    if (Array.isArray(market.tokens) && market.tokens.length >= 2) {
      const yesToken = market.tokens.find((t: any) => t.outcome?.toLowerCase() === 'yes');
      const noToken = market.tokens.find((t: any) => t.outcome?.toLowerCase() === 'no');

      if (yesToken && yesToken.price !== undefined) {
        priceYes = parseFloat(yesToken.price);
      }
      if (noToken && noToken.price !== undefined) {
        priceNo = parseFloat(noToken.price);
      }
    }

    const currentPrice = priceYes > 0 ? priceYes : priceNo > 0 ? priceNo : 0;

    if (!market.question_id || !market.question || currentPrice === 0) {
      return null;
    }

    return {
      id: market.condition_id || market.question_id,
      title: market.question,
      currentPrice,
      priceYes,
      priceNo,
      volume: market.rewards?.max_size || 0,
      url: `/markets/${market.condition_id || market.question_id}`,
    };
  } catch (error) {
    console.error('Error transforming market:', error);
    return null;
  }
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
  } else if (request.action === 'getEventData') {
    handleGetEventData(sendResponse);
    return true; // Indicate async response
  }
});

// Handle event data request
async function handleGetEventData(sendResponse: (response: any) => void) {
  try {
    if (!isOnEventPage()) {
      sendResponse({ eventData: null });
      return;
    }

    const slug = getEventSlug();
    if (!slug) {
      sendResponse({ eventData: null });
      return;
    }

    const markets = await fetchEventMarkets(slug);
    const eventData: EventPageData = {
      eventName: getEventNameFromSlug(slug),
      eventSlug: slug,
      markets,
      marketCount: markets.length,
    };

    console.log('Event data:', eventData);
    sendResponse({ eventData });
  } catch (error) {
    console.error('Error getting event data:', error);
    sendResponse({ eventData: null });
  }
}

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
