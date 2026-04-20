import { MediaItem } from "../types";

export interface ScoredMediaItem extends MediaItem {
  score: number;
  category?: string;
}

/**
 * Normalizes text by converting to lowercase and removing spaces/special characters.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Assigns a score to a media item based on search query relevance and metadata.
 */
export function calculateScore(item: MediaItem, query: string): number {
  let score = 0;
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(item.title);
  const lowerTitle = item.title.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Match logic
  if (normalizedTitle === normalizedQuery) {
    score += 200; // Exact match
  } else if (lowerTitle.startsWith(lowerQuery) || lowerQuery.startsWith(lowerTitle)) {
    score += 150; // Starts with (either way)
  } else if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
    // Check if it's a whole word match
    const wordRegex = new RegExp(`\\b${lowerQuery}\\b`, 'i');
    const wordRegexReverse = new RegExp(`\\b${lowerTitle}\\b`, 'i');
    if (wordRegex.test(lowerTitle) || wordRegexReverse.test(lowerQuery)) {
      score += 100; // Whole word match
    } else {
      score += 50; // Partial match
    }
  }

  // Metadata scoring
  const itemAny = item as any;
  
  // hasResource = true → +30 (increased from 20)
  if (itemAny.hasResource === true || itemAny.hasResource === "true" || itemAny.hasResource === 1) {
    score += 30;
  }

  // imdbRating > 6 → +20 (increased from 10)
  const ratingStr = item.rating || itemAny.imdbRating || itemAny.rate || "0";
  const rating = parseFloat(ratingStr);
  if (rating > 7.5) {
    score += 30; // High quality boost
  } else if (rating > 6) {
    score += 15;
  }

  // Year boost (prefer newer content)
  const year = parseInt(item.year || itemAny.releaseDate || "0");
  if (year > 2020) {
    score += 10;
  }

  // Popularity boost (if item was found in trending/hot lists)
  if (itemAny.isPopular) {
    score += 50;
  }

  return score;
}

/**
 * Detects the category of a media item based on genre and subjectType.
 */
export function detectCategory(item: MediaItem): string {
  const itemAny = item as any;
  const genre = (itemAny.genre || "").toLowerCase();
  const subjectType = parseInt(String(itemAny.subjectType || item.type || "0"));
  const title = (item.title || "").toLowerCase();

  // If genre includes: "anime" OR title suggests anime → Anime category
  if (genre.includes("anime") || title.includes(" (anime)") || title.startsWith("anime:")) {
    return "Anime";
  }

  // If subjectType: 1 → Movies, 2 → Series
  if (subjectType === 1 || item.type === "1" || (typeof item.type === 'string' && item.type.toLowerCase().includes("movie"))) {
    return "Movies";
  }

  if (subjectType === 2 || item.type === "2" || (typeof item.type === 'string' && item.type.toLowerCase().includes("series"))) {
    return "Series";
  }

  // Fallback checks for Series
  if (
    title.includes("season") || 
    title.includes(" s1") || 
    title.includes(" s2") || 
    title.includes(" s3") || 
    title.includes(" s4") || 
    title.includes(" s5") ||
    genre.includes("tv series") ||
    genre.includes("series")
  ) {
    return "Series";
  }

  // Fallback checks for Movies
  if (genre.includes("movie") || genre.includes("cinema") || genre.includes("feature")) {
    return "Movies";
  }

  // If genre includes: "drama", "action" → Default to Movies/Series mixed
  if (genre.includes("drama") || genre.includes("action") || genre.includes("comedy")) {
    return "Movies/Series";
  }

  return "Other";
}

/**
 * Filters, ranks, and categorizes search results.
 */
export function processSearchResults(items: MediaItem[], query: string): ScoredMediaItem[] {
  const normalizedQuery = normalizeText(query);
  
  // 1. Filter bad results & scored items
  const filtered = items.filter(item => {
    if (!item.title || !item.title.trim()) return false;
    // Keep items even if poster is missing if it's a popular item (we might find poster later or it's a high quality match)
    if (!item.poster && !(item as any).cover && !(item as any).isPopular) return false;
    
    const normalizedTitle = normalizeText(item.title);
    // Remove unrelated items
    // Allow if title contains query OR query contains title (e.g. searching "The Boys S4" should find "The Boys")
    if (!normalizedTitle.includes(normalizedQuery) && !normalizedQuery.includes(normalizedTitle)) {
      // Split query into words and check if some meaningful words are present
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const titleWords = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      if (queryWords.length > 0 && titleWords.length > 0) {
        // If any long word from query is in title, or vice versa
        const hasOverlap = queryWords.some(qw => normalizedTitle.includes(qw)) || 
                           titleWords.some(tw => normalizedQuery.includes(tw));
        if (!hasOverlap) return false;
      } else {
        return false;
      }
    }
    
    return true;
  });

  // 2. Score and categorize
  const scoredItems: ScoredMediaItem[] = filtered.map(item => ({
    ...item,
    score: calculateScore(item, query),
    category: detectCategory(item)
  }));

  // 3. Smart Deduplication
  // Group by a combination of normalized title and category to allow "Movie" and "Series" with same name
  // but deduplicate multiple entries for the exact same thing.
  const bestItems = new Map<string, ScoredMediaItem>();
  for (const item of scoredItems) {
    const typeKey = item.category === "Movies" ? "movie" : (item.category === "Anime" ? "anime" : "series");
    const key = `${normalizeText(item.title)}_${typeKey}`;
    const existing = bestItems.get(key);
    
    if (!existing) {
      bestItems.set(key, item);
    } else {
      // Pick the better one, but MERGE score and popularity so we don't lose that info
      const itemAny = item as any;
      const existingAny = existing as any;
      
      const newScore = Math.max(item.score, existing.score);
      const isPopular = itemAny.isPopular || existingAny.isPopular;
      const hasResource = itemAny.hasResource || existingAny.hasResource;
      
      // Select the base item representation (the one with more complete data like posters)
      let baseItem = existing;
      if (itemAny.hasResource && !existingAny.hasResource) {
        baseItem = item;
      } else if (!itemAny.hasResource && existingAny.hasResource) {
        baseItem = existing;
      } else if (item.poster && !existing.poster) {
        baseItem = item;
      } else if (item.score > existing.score) {
        baseItem = item;
      }
      
      // Update with the merged best properties
      bestItems.set(key, {
        ...baseItem,
        score: newScore,
        isPopular,
        hasResource
      } as any);
    }
  }

  const uniqueItems = Array.from(bestItems.values());

  // 4. Sort by score DESC
  const sorted = uniqueItems.sort((a, b) => b.score - a.score);

  // 5. Dynamic Trash Filtering
  // If we have high-relevance results, we can filter out the noise.
  // But we must be careful not to hide what the user might be looking for.
  const hasExactMatch = sorted.some(item => item.score >= 200);
  const hasHighRelevance = sorted.some(item => item.score >= 150);

  if (hasExactMatch) {
    // If exact match found, keep anything >= 100 OR anything where title/query are subsets of each other
    return sorted.filter(item => {
      if (item.score >= 100) return true;
      const normalizedQuery = normalizeText(query);
      const normalizedTitle = normalizeText(item.title);
      return normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle);
    });
  } else if (hasHighRelevance) {
    // If startsWith matches found, be moderately aggressive
    return sorted.filter(item => {
      if (item.score >= 50) return true;
      const normalizedQuery = normalizeText(query);
      const normalizedTitle = normalizeText(item.title);
      return normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle);
    });
  }

  return sorted;
}
