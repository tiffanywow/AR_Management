import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  type: 'campaign' | 'broadcast' | 'member' | 'community' | 'poll' | 'advert';
  title: string;
  description: string;
  image?: string;
  metadata?: Record<string, any>;
  relevanceScore: number;
  createdAt: string;
}

interface IndexedItem {
  id: string;
  type: string;
  searchableText: string;
  metadata: Record<string, any>;
  createdAt: string;
}

class SearchService {
  private index: Map<string, IndexedItem> = new Map();
  private lastCrawlTime: Date = new Date(0);
  
  /**
   * Step 1: CRAWLING - Extract content from database tables
   */
  async crawlContent(): Promise<IndexedItem[]> {
    try {
      const items: IndexedItem[] = [];

      // Crawl campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, description, status, created_at')
        .gte('created_at', this.lastCrawlTime.toISOString());

      if (campaigns) {
        campaigns.forEach(campaign => {
          items.push({
            id: campaign.id,
            type: 'campaign',
            searchableText: `${campaign.title} ${campaign.description || ''}`.toLowerCase(),
            metadata: { title: campaign.title, description: campaign.description, status: campaign.status },
            createdAt: campaign.created_at,
          });
        });
      }

      // Crawl broadcasts
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select('id, title, content, status, published_at')
        .eq('status', 'published')
        .gte('published_at', this.lastCrawlTime.toISOString());

      if (broadcasts) {
        broadcasts.forEach(broadcast => {
          items.push({
            id: broadcast.id,
            type: 'broadcast',
            searchableText: `${broadcast.title} ${broadcast.content || ''}`.toLowerCase(),
            metadata: { title: broadcast.title, content: broadcast.content },
            createdAt: broadcast.published_at || new Date().toISOString(),
          });
        });
      }

      // Crawl members
      const { data: members } = await supabase
        .from('memberships')
        .select('id, full_name, phone, created_at');

      if (members) {
        members.forEach(member => {
          items.push({
            id: member.id,
            type: 'member',
            searchableText: `${member.full_name || ''} ${member.phone || ''}`.toLowerCase(),
            metadata: { name: member.full_name, phone: member.phone },
            createdAt: member.created_at,
          });
        });
      }

      // Crawl communities
      const { data: communities } = await supabase
        .from('communities')
        .select('id, name, description, created_at');

      if (communities) {
        communities.forEach(community => {
          items.push({
            id: community.id,
            type: 'community',
            searchableText: `${community.name} ${community.description || ''}`.toLowerCase(),
            metadata: { name: community.name, description: community.description },
            createdAt: community.created_at,
          });
        });
      }

      // Crawl polls
      const { data: polls } = await supabase
        .from('polls')
        .select('id, title, question, created_at');

      if (polls) {
        polls.forEach(poll => {
          items.push({
            id: poll.id,
            type: 'poll',
            searchableText: `${poll.title} ${poll.question || ''}`.toLowerCase(),
            metadata: { title: poll.title, question: poll.question },
            createdAt: poll.created_at,
          });
        });
      }

      // Crawl adverts
      const { data: adverts } = await supabase
        .from('adverts')
        .select('id, title, description, created_at');

      if (adverts) {
        adverts.forEach(advert => {
          items.push({
            id: advert.id,
            type: 'advert',
            searchableText: `${advert.title} ${advert.description || ''}`.toLowerCase(),
            metadata: { title: advert.title, description: advert.description },
            createdAt: advert.created_at,
          });
        });
      }

      this.lastCrawlTime = new Date();
      return items;
    } catch (error) {
      console.error('Error crawling content:', error);
      return [];
    }
  }

  /**
   * Step 2: INDEXING - Build searchable index from crawled content
   */
  async buildIndex(items: IndexedItem[]): Promise<void> {
    // Clear existing index
    this.index.clear();

    // Add all items to the index
    items.forEach(item => {
      this.index.set(item.id, item);
    });

    console.log(`Search index built with ${this.index.size} items`);
  }

  /**
   * Tokenize search query into words for matching
   */
  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevance(searchableText: string, queryTokens: string[]): number {
    let score = 0;
    const words = searchableText.split(/\s+/);

    queryTokens.forEach(token => {
      // Exact word match: +5 points
      if (words.includes(token)) {
        score += 5;
      }

      // Partial word match: +2 points per character match
      if (searchableText.includes(token)) {
        score += 2;
      }

      // Prefix match: +3 points
      words.forEach(word => {
        if (word.startsWith(token)) {
          score += 3;
        }
      });
    });

    return score;
  }

  /**
   * Step 3: RANKING - Rank results by relevance, recency, and type
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const queryTokens = this.tokenizeQuery(query);
    const results: SearchResult[] = [];

    // Search through indexed items
    this.index.forEach(item => {
      const relevanceScore = this.calculateRelevance(item.searchableText, queryTokens);

      // Only include results with relevance score > 0
      if (relevanceScore > 0) {
        // Boost score for recent items
        const daysSinceCreation = (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 10 - daysSinceCreation * 0.1); // Decrease boost over time

        results.push({
          id: item.id,
          type: item.type as any,
          title: item.metadata.title || item.metadata.name || 'Untitled',
          description: item.metadata.description || item.metadata.content || item.metadata.phone || '',
          metadata: item.metadata,
          relevanceScore: relevanceScore + recencyBoost,
          createdAt: item.createdAt,
        });
      }
    });

    // Sort by relevance score (descending), then by date (recent first)
    results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return results;
  }

  /**
   * Initialize search service with initial crawl and index
   */
  async initialize(): Promise<void> {
    try {
      const items = await this.crawlContent();
      await this.buildIndex(items);
    } catch (error) {
      console.error('Error initializing search service:', error);
    }
  }

  /**
   * Refresh the search index (run periodically)
   */
  async refreshIndex(): Promise<void> {
    await this.initialize();
  }
}

// Export singleton instance
export const searchService = new SearchService();
