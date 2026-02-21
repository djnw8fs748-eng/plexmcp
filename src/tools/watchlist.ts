import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import { createResponse, createErrorResponse } from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const getWatchlistSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of items to return'),
});

export const addToWatchlistSchema = z
  .object({
    ratingKey: z
      .string()
      .optional()
      .describe(
        'Local library ratingKey of the item to add (from search_library or advanced_search). ' +
        'Use this for items already in your Plex library.'
      ),
    guid: z
      .string()
      .optional()
      .describe(
        'Plex catalog GUID of the item to add (from search_plex_catalog). ' +
        'Use this for items not in your local library (e.g. plex://movie/...).'
      ),
  })
  .refine((data) => data.ratingKey || data.guid, {
    message: 'Either ratingKey (local library item) or guid (Plex catalog item) must be provided',
  });

export const removeFromWatchlistSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the watchlist item to remove (from get_watchlist)'),
});

export const searchPlexCatalogSchema = z.object({
  query: z.string().describe('Title or keyword to search for in the Plex catalog'),
  type: z
    .enum(['movie', 'show'])
    .optional()
    .describe('Limit results to a specific media type'),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of results to return'),
});

// Tool implementations
export async function getWatchlist(
  args: z.infer<typeof getWatchlistSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const items = await client.getWatchlist(args.limit);

    if (items.length === 0) {
      return createResponse({
        message: 'Your Plex watchlist is empty',
        items: [],
      });
    }

    const formatted = items.map((item) => ({
      ratingKey: item.ratingKey,
      title: item.title,
      type: item.type,
      year: item.year,
      summary: item.summary
        ? item.summary.length > 150
          ? item.summary.substring(0, 150) + '...'
          : item.summary
        : undefined,
    }));

    return createResponse({
      message: `Found ${items.length} item(s) in your watchlist`,
      items: formatted,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function addToWatchlist(
  args: z.infer<typeof addToWatchlistSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();

    if (args.guid) {
      // Non-library item: use the catalog GUID directly
      await client.addToWatchlist(args.guid);
      return createResponse({
        message: `Item added to your Plex watchlist`,
        guid: args.guid,
      });
    }

    // Local library item: resolve the GUID from the library
    const item = await client.getMediaItem(args.ratingKey!);
    if (!item.guid) {
      throw new Error(
        `Media item ${args.ratingKey} has no Plex GUID — it may not be linked to Plex.tv metadata`
      );
    }

    await client.addToWatchlist(item.guid);

    return createResponse({
      message: `"${item.title}" added to your Plex watchlist`,
      item: {
        title: item.title,
        type: item.type,
        year: item.year,
        guid: item.guid,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function removeFromWatchlist(
  args: z.infer<typeof removeFromWatchlistSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    await client.removeFromWatchlist(args.ratingKey);

    return createResponse({
      message: 'Item removed from your Plex watchlist',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function searchPlexCatalog(
  args: z.infer<typeof searchPlexCatalogSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const results = await client.searchCatalog(args.query, args.type, args.limit);

    if (results.length === 0) {
      return createResponse({
        message: `No results found in the Plex catalog for "${args.query}"`,
        results: [],
      });
    }

    const formatted = results.map((item) => ({
      guid: item.ratingKey, // catalog ratingKey IS the GUID (e.g. plex://movie/...)
      title: item.title,
      type: item.type,
      year: item.year,
      summary: item.summary
        ? item.summary.length > 150
          ? item.summary.substring(0, 150) + '...'
          : item.summary
        : undefined,
    }));

    return createResponse({
      message: `Found ${results.length} result(s) in the Plex catalog for "${args.query}"`,
      hint: 'Use the guid value with add_to_watchlist to add an item to your watchlist',
      results: formatted,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const watchlistTools = [
  {
    name: 'get_watchlist',
    description: 'Get all items in your Plex watchlist (want-to-watch list)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 50)',
        },
      },
      required: [],
    },
    handler: getWatchlist,
  },
  {
    name: 'search_plex_catalog',
    description:
      'Search the global Plex catalog for movies and TV shows, including items not in your local library. ' +
      'Returns a guid for each result that can be passed to add_to_watchlist.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Title or keyword to search for',
        },
        type: {
          type: 'string',
          enum: ['movie', 'show'],
          description: 'Limit results to a specific media type',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
      required: ['query'],
    },
    handler: searchPlexCatalog,
  },
  {
    name: 'add_to_watchlist',
    description:
      'Add a media item to your Plex watchlist. ' +
      'For items in your library, provide ratingKey (from search_library). ' +
      'For items not in your library, provide guid (from search_plex_catalog).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description:
            'Local library ratingKey (from search_library or advanced_search). Use for items already in your library.',
        },
        guid: {
          type: 'string',
          description:
            'Plex catalog GUID (from search_plex_catalog). Use for items not in your local library.',
        },
      },
      required: [],
    },
    handler: addToWatchlist,
  },
  {
    name: 'remove_from_watchlist',
    description: 'Remove an item from your Plex watchlist',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description:
            'The ratingKey of the item to remove (from get_watchlist results)',
        },
      },
      required: ['ratingKey'],
    },
    handler: removeFromWatchlist,
  },
];
