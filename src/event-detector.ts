// PolyGuard Event Page Detector
// Handles detection and market fetching for event pages with 40+ related markets

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
  isEventPage: boolean;
  eventName: string;
  eventSlug: string;
  eventUrl: string;
  markets: EventMarket[];
  marketCount: number;
}

class EventDetector {
  private apiBaseUrl = 'https://clob.polymarket.com';

  /**
   * Check if we're on a Polymarket event page
   */
  isOnEventPage(): boolean {
    const pathname = window.location.pathname;
    return /^\/event\/[a-zA-Z0-9\-]+/.test(pathname);
  }

  /**
   * Extract event slug from URL
   */
  getEventSlug(): string | null {
    const match = window.location.pathname.match(/^\/event\/([a-zA-Z0-9\-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract event name from URL slug (convert kebab-case to readable)
   */
  getEventNameFromSlug(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Fetch all markets related to the event
   * Uses search API to find markets with event keywords
   */
  async fetchRelatedMarkets(eventSlug: string): Promise<EventMarket[]> {
    try {
      // Convert slug to search query
      // Example: "elon-musk-of-tweets-february-24-march-3" → "elon musk tweets"
      const searchTerms = eventSlug
        .split('-')
        .filter((word) => !['of', 'by', 'on', 'in', 'the', 'a', 'an'].includes(word.toLowerCase()))
        .slice(0, 3) // Take first 3 keywords for search
        .join('+');

      const response = await fetch(
        `${this.apiBaseUrl}/markets?search=${searchTerms}&limit=100`
      );

      if (!response.ok) {
        console.error('Failed to fetch markets:', response.status);
        return [];
      }

      const data = await response.json();
      if (!data || !Array.isArray(data)) {
        console.warn('Unexpected API response format');
        return [];
      }

      // Filter and transform markets
      return data
        .filter((market: any) => {
          // Filter out inactive or closed markets
          return market.active && !market.closed;
        })
        .map((market: any) => this.transformMarket(market))
        .filter((market) => market !== null) as EventMarket[];
    } catch (error) {
      console.error('Error fetching related markets:', error);
      return [];
    }
  }

  /**
   * Transform raw market data to our format
   */
  private transformMarket(market: any): EventMarket | null {
    try {
      // Extract price from tokens array
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
      console.error('Error transforming market:', error, market);
      return null;
    }
  }

  /**
   * Get full event page data
   */
  async getEventPageData(): Promise<EventPageData> {
    const eventUrl = window.location.href;
    const slug = this.getEventSlug();
    const isEvent = this.isOnEventPage();

    if (!isEvent || !slug) {
      return {
        isEventPage: false,
        eventName: '',
        eventSlug: '',
        eventUrl: '',
        markets: [],
        marketCount: 0,
      };
    }

    const markets = await this.fetchRelatedMarkets(slug);

    return {
      isEventPage: true,
      eventName: this.getEventNameFromSlug(slug),
      eventSlug: slug,
      eventUrl,
      markets,
      marketCount: markets.length,
    };
  }
}

// Export singleton instance
export const eventDetector = new EventDetector();
export default EventDetector;
