import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  formatDuration,
  formatTimestamp,
} from '../utils.js';
import type { ToolResponse, PlexMediaItem } from '../types.js';

// Schemas
export const searchLibrarySchema = z.object({
  query: z.string().describe('Search query string'),
  sectionId: z
    .string()
    .optional()
    .describe('Optional library section ID to search within'),
});

export const getLibrarySectionsSchema = z.object({});

export const getRecentlyAddedSchema = z.object({
  sectionId: z
    .string()
    .optional()
    .describe('Optional library section ID to filter by'),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of items to return'),
});

export const getOnDeckSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of items to return'),
});

// Helper function to format media items
function formatMediaItem(item: PlexMediaItem): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ratingKey: item.ratingKey,
    title: item.title,
    type: item.type,
    year: item.year,
  };

  if (item.summary) {
    base.summary =
      item.summary.length > 200
        ? item.summary.substring(0, 200) + '...'
        : item.summary;
  }

  if (item.duration) {
    base.duration = formatDuration(item.duration);
  }

  if (item.rating) {
    base.rating = item.rating;
  }

  // TV Show specific
  if (item.grandparentTitle) {
    base.show = item.grandparentTitle;
  }
  if (item.parentTitle) {
    base.season = item.parentTitle;
  }
  if (item.index !== undefined) {
    base.episode = item.index;
  }

  // View progress
  if (item.viewOffset && item.duration) {
    const progress = Math.round((item.viewOffset / item.duration) * 100);
    base.progress = `${progress}%`;
  }

  if (item.lastViewedAt) {
    base.lastWatched = formatTimestamp(item.lastViewedAt);
  }

  if (item.addedAt) {
    base.addedAt = formatTimestamp(item.addedAt);
  }

  return base;
}

// Tool implementations
export async function searchLibrary(
  args: z.infer<typeof searchLibrarySchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const results = await client.searchLibrary(args.query, args.sectionId);

    if (results.length === 0) {
      return createResponse({
        message: `No results found for "${args.query}"`,
        results: [],
      });
    }

    return createResponse({
      message: `Found ${results.length} result(s) for "${args.query}"`,
      results: results.map(formatMediaItem),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getLibrarySections(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const sections = await client.getLibrarySections();

    return createResponse({
      message: `Found ${sections.length} library section(s)`,
      sections: sections.map((s) => ({
        id: s.key,
        title: s.title,
        type: s.type,
        language: s.language,
        refreshing: s.refreshing,
        scannedAt: formatTimestamp(s.scannedAt),
      })),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getRecentlyAdded(
  args: z.infer<typeof getRecentlyAddedSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const items = await client.getRecentlyAdded(args.sectionId, args.limit);

    return createResponse({
      message: `Found ${items.length} recently added item(s)`,
      items: items.map(formatMediaItem),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getOnDeck(
  args: z.infer<typeof getOnDeckSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const items = await client.getOnDeck(args.limit);

    return createResponse({
      message: `Found ${items.length} item(s) on deck`,
      items: items.map(formatMediaItem),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const libraryTools = [
  {
    name: 'search_library',
    description:
      'Search the Plex library for movies, TV shows, or other media by title or keyword',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        sectionId: {
          type: 'string',
          description: 'Optional library section ID to search within',
        },
      },
      required: ['query'],
    },
    handler: searchLibrary,
  },
  {
    name: 'get_library_sections',
    description:
      'Get all library sections (Movies, TV Shows, Music, etc.) configured in Plex',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getLibrarySections,
  },
  {
    name: 'get_recently_added',
    description: 'Get recently added media items from the Plex library',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sectionId: {
          type: 'string',
          description: 'Optional library section ID to filter by',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 20)',
        },
      },
      required: [],
    },
    handler: getRecentlyAdded,
  },
  {
    name: 'get_on_deck',
    description:
      'Get items that are "On Deck" - in-progress media ready to continue watching',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 20)',
        },
      },
      required: [],
    },
    handler: getOnDeck,
  },
];
