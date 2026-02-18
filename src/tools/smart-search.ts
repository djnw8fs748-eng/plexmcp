import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import { createResponse, createErrorResponse, formatDuration } from '../utils.js';
import type { ToolResponse, PlexMediaItem } from '../types.js';

// Schemas
export const smartSearchSchema = z.object({
  query: z
    .string()
    .describe(
      'Natural language search query (e.g., "unwatched sci-fi movies from the 90s rated above 7")'
    ),
  limit: z
    .number()
    .optional()
    .default(25)
    .describe('Maximum number of results to return'),
});

export const advancedSearchSchema = z.object({
  type: z
    .enum(['movie', 'show', 'episode', 'artist', 'album', 'track'])
    .describe('Type of media to search for'),
  sectionId: z.string().optional().describe('Library section ID to search in'),
  title: z.string().optional().describe('Title contains'),
  year: z.number().optional().describe('Exact year'),
  minYear: z.number().optional().describe('Minimum year'),
  maxYear: z.number().optional().describe('Maximum year'),
  decade: z.number().optional().describe('Decade (e.g., 1990 for 90s)'),
  genre: z.string().optional().describe('Genre name'),
  contentRating: z.string().optional().describe('Content rating (e.g., PG-13, R)'),
  minRating: z.number().optional().describe('Minimum rating (0-10)'),
  maxRating: z.number().optional().describe('Maximum rating (0-10)'),
  director: z.string().optional().describe('Director name'),
  actor: z.string().optional().describe('Actor name'),
  studio: z.string().optional().describe('Studio name'),
  unwatched: z.boolean().optional().describe('Only show unwatched items'),
  watched: z.boolean().optional().describe('Only show watched items'),
  inProgress: z.boolean().optional().describe('Only show in-progress items'),
  minDuration: z.number().optional().describe('Minimum duration in minutes'),
  maxDuration: z.number().optional().describe('Maximum duration in minutes'),
  addedWithin: z
    .number()
    .optional()
    .describe('Added within N days'),
  resolution: z
    .enum(['sd', 'hd', '4k'])
    .optional()
    .describe('Video resolution filter'),
  limit: z.number().optional().default(25).describe('Maximum results'),
  sort: z
    .enum([
      'titleSort',
      'year',
      'rating',
      'addedAt',
      'lastViewedAt',
      'duration',
      'random',
    ])
    .optional()
    .describe('Sort field'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort order'),
});

// Helper to format results
function formatSearchResult(item: PlexMediaItem): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ratingKey: item.ratingKey,
    title: item.title,
    type: item.type,
    year: item.year,
  };

  if (item.rating) result.rating = item.rating;
  if (item.duration) result.duration = formatDuration(item.duration);
  if (item.summary) {
    result.summary = item.summary.length > 150
      ? item.summary.substring(0, 150) + '...'
      : item.summary;
  }
  if (item.grandparentTitle) result.show = item.grandparentTitle;
  if (item.parentTitle) result.season = item.parentTitle;
  if (item.index !== undefined) result.episode = item.index;
  if (item.viewCount) result.viewCount = item.viewCount;
  if (item.viewOffset && item.duration) {
    result.progress = `${Math.round((item.viewOffset / item.duration) * 100)}%`;
  }
  if (item.contentRating) result.contentRating = item.contentRating;
  if (item.studio) result.studio = item.studio;
  if (item.Genre && item.Genre.length > 0) {
    result.genres = item.Genre.map((g) => g.tag).join(', ');
  }
  if (item.Director && item.Director.length > 0) {
    result.directors = item.Director.map((d) => d.tag).join(', ');
  }
  if (item.Role && item.Role.length > 0) {
    result.starring = item.Role.slice(0, 3).map((r) => r.tag).join(', ');
  }

  return result;
}

// Parse natural language query into filter parameters
function parseNaturalLanguageQuery(query: string): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const lowerQuery = query.toLowerCase();

  // Detect media type
  if (lowerQuery.includes('movie') || lowerQuery.includes('film')) {
    filters.type = 'movie';
  } else if (lowerQuery.includes('show') || lowerQuery.includes('series') || lowerQuery.includes('tv')) {
    filters.type = 'show';
  } else if (lowerQuery.includes('episode')) {
    filters.type = 'episode';
  }

  // Watch status
  if (lowerQuery.includes('unwatched') || lowerQuery.includes('not watched') || lowerQuery.includes("haven't watched")) {
    filters.unwatched = true;
  } else if (lowerQuery.includes('watched') && !lowerQuery.includes('unwatched')) {
    filters.watched = true;
  }
  if (lowerQuery.includes('in progress') || lowerQuery.includes('continue') || lowerQuery.includes('started')) {
    filters.inProgress = true;
  }

  // Decades and years
  const decadeMatch = lowerQuery.match(/(\d{2})s(?:\s|$)/);
  if (decadeMatch) {
    const decade = parseInt(decadeMatch[1]);
    filters.decade = decade < 30 ? 2000 + decade * 10 : 1900 + decade * 10;
  }
  const yearMatch = lowerQuery.match(/from\s+(\d{4})/);
  if (yearMatch) {
    filters.minYear = parseInt(yearMatch[1]);
  }
  const exactYearMatch = lowerQuery.match(/\b(19\d{2}|20[0-2]\d)\b/);
  if (exactYearMatch && !decadeMatch && !yearMatch) {
    filters.year = parseInt(exactYearMatch[1]);
  }
  const beforeMatch = lowerQuery.match(/before\s+(\d{4})/);
  if (beforeMatch) {
    filters.maxYear = parseInt(beforeMatch[1]) - 1;
  }
  const afterMatch = lowerQuery.match(/after\s+(\d{4})/);
  if (afterMatch) {
    filters.minYear = parseInt(afterMatch[1]) + 1;
  }

  // Ratings
  const ratingAboveMatch = lowerQuery.match(/(?:rated?|rating)\s*(?:above|over|>|greater than)\s*(\d+(?:\.\d+)?)/);
  if (ratingAboveMatch) {
    filters.minRating = parseFloat(ratingAboveMatch[1]);
  }
  const ratingBelowMatch = lowerQuery.match(/(?:rated?|rating)\s*(?:below|under|<|less than)\s*(\d+(?:\.\d+)?)/);
  if (ratingBelowMatch) {
    filters.maxRating = parseFloat(ratingBelowMatch[1]);
  }

  // Genres (common ones)
  const genres = [
    'action', 'adventure', 'animation', 'anime', 'biography', 'comedy', 'crime',
    'documentary', 'drama', 'family', 'fantasy', 'film-noir', 'history', 'horror',
    'musical', 'mystery', 'romance', 'sci-fi', 'science fiction', 'sport', 'thriller',
    'war', 'western',
  ];
  for (const genre of genres) {
    if (lowerQuery.includes(genre)) {
      filters.genre = genre === 'science fiction' ? 'sci-fi' : genre;
      break;
    }
  }

  // Duration
  const shortMatch = lowerQuery.match(/short|under\s+(\d+)\s*(?:min|hour)/);
  if (shortMatch) {
    filters.maxDuration = shortMatch[1] ? parseInt(shortMatch[1]) : 90;
  }
  const longMatch = lowerQuery.match(/long|over\s+(\d+)\s*(?:min|hour)/);
  if (longMatch) {
    filters.minDuration = longMatch[1] ? parseInt(longMatch[1]) : 120;
  }

  // Resolution
  if (lowerQuery.includes('4k') || lowerQuery.includes('uhd')) {
    filters.resolution = '4k';
  } else if (lowerQuery.includes('hd') && !lowerQuery.includes('uhd')) {
    filters.resolution = 'hd';
  }

  // Recently added
  const recentMatch = lowerQuery.match(/(?:added|new)\s*(?:in\s*)?(?:the\s*)?(?:last|past)?\s*(\d+)?\s*(day|week|month)/);
  if (recentMatch || lowerQuery.includes('recently added') || lowerQuery.includes('new')) {
    const num = recentMatch?.[1] ? parseInt(recentMatch[1]) : 1;
    const unit = recentMatch?.[2] || 'week';
    if (unit === 'day') filters.addedWithin = num;
    else if (unit === 'week') filters.addedWithin = num * 7;
    else if (unit === 'month') filters.addedWithin = num * 30;
  }

  // Content ratings
  const contentRatings = ['g', 'pg', 'pg-13', 'r', 'nc-17', 'tv-y', 'tv-y7', 'tv-g', 'tv-pg', 'tv-14', 'tv-ma'];
  for (const cr of contentRatings) {
    if (lowerQuery.includes(cr) || lowerQuery.includes(cr.replace('-', ' '))) {
      filters.contentRating = cr.toUpperCase();
      break;
    }
  }

  // Sorting
  if (lowerQuery.includes('best') || lowerQuery.includes('top rated') || lowerQuery.includes('highest rated')) {
    filters.sort = 'rating';
    filters.sortOrder = 'desc';
  } else if (lowerQuery.includes('newest') || lowerQuery.includes('latest') || lowerQuery.includes('recent')) {
    filters.sort = 'addedAt';
    filters.sortOrder = 'desc';
  } else if (lowerQuery.includes('oldest')) {
    filters.sort = 'year';
    filters.sortOrder = 'asc';
  } else if (lowerQuery.includes('random') || lowerQuery.includes('surprise')) {
    filters.sort = 'random';
  }

  return filters;
}

// Tool implementations
export async function smartSearch(
  args: z.infer<typeof smartSearchSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const filters = parseNaturalLanguageQuery(args.query);

    // If no type detected, search movies by default
    if (!filters.type) {
      filters.type = 'movie';
    }

    const results = await client.advancedSearch({
      ...filters,
      limit: args.limit,
    } as Record<string, unknown>);

    if (results.length === 0) {
      return createResponse({
        message: `No results found for: "${args.query}"`,
        parsedFilters: filters,
        results: [],
      });
    }

    return createResponse({
      message: `Found ${results.length} result(s) for: "${args.query}"`,
      parsedFilters: filters,
      results: results.map(formatSearchResult),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function advancedSearch(
  args: z.infer<typeof advancedSearchSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const results = await client.advancedSearch(args as Record<string, unknown>);

    if (results.length === 0) {
      return createResponse({
        message: 'No results found matching your criteria',
        filters: args,
        results: [],
      });
    }

    return createResponse({
      message: `Found ${results.length} result(s)`,
      results: results.map(formatSearchResult),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const smartSearchTools = [
  {
    name: 'smart_search',
    description:
      'Search your Plex library using natural language. Examples: "unwatched sci-fi movies from the 90s", "comedy shows rated above 8", "recently added action movies", "4k films I haven\'t watched"',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 25)',
        },
      },
      required: ['query'],
    },
    handler: smartSearch,
  },
  {
    name: 'advanced_search',
    description:
      'Search with precise filters for media type, year range, rating, genre, watch status, duration, resolution, and more',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['movie', 'show', 'episode', 'artist', 'album', 'track'],
          description: 'Type of media to search for',
        },
        sectionId: {
          type: 'string',
          description: 'Library section ID to search in',
        },
        title: {
          type: 'string',
          description: 'Title contains',
        },
        year: {
          type: 'number',
          description: 'Exact year',
        },
        minYear: {
          type: 'number',
          description: 'Minimum year',
        },
        maxYear: {
          type: 'number',
          description: 'Maximum year',
        },
        decade: {
          type: 'number',
          description: 'Decade (e.g., 1990 for 90s)',
        },
        genre: {
          type: 'string',
          description: 'Genre name',
        },
        contentRating: {
          type: 'string',
          description: 'Content rating (e.g., PG-13, R, TV-MA)',
        },
        minRating: {
          type: 'number',
          description: 'Minimum rating (0-10)',
        },
        maxRating: {
          type: 'number',
          description: 'Maximum rating (0-10)',
        },
        director: {
          type: 'string',
          description: 'Director name',
        },
        actor: {
          type: 'string',
          description: 'Actor name',
        },
        studio: {
          type: 'string',
          description: 'Studio name',
        },
        unwatched: {
          type: 'boolean',
          description: 'Only show unwatched items',
        },
        watched: {
          type: 'boolean',
          description: 'Only show watched items',
        },
        inProgress: {
          type: 'boolean',
          description: 'Only show in-progress items',
        },
        minDuration: {
          type: 'number',
          description: 'Minimum duration in minutes',
        },
        maxDuration: {
          type: 'number',
          description: 'Maximum duration in minutes',
        },
        addedWithin: {
          type: 'number',
          description: 'Added within N days',
        },
        resolution: {
          type: 'string',
          enum: ['sd', 'hd', '4k'],
          description: 'Video resolution filter',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 25)',
        },
        sort: {
          type: 'string',
          enum: ['titleSort', 'year', 'rating', 'addedAt', 'lastViewedAt', 'duration', 'random'],
          description: 'Sort field',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
      },
      required: ['type'],
    },
    handler: advancedSearch,
  },
];
