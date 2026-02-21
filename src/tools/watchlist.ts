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

export const addToWatchlistSchema = z.object({
  ratingKey: z
    .string()
    .describe(
      'The local library ratingKey of the media item to add (from search_library or advanced_search)'
    ),
});

export const removeFromWatchlistSchema = z.object({
  ratingKey: z
    .string()
    .describe(
      'The ratingKey of the watchlist item to remove (from get_watchlist)'
    ),
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

    // Look up the media item to get its Plex GUID
    const item = await client.getMediaItem(args.ratingKey);
    if (!item.guid) {
      throw new Error(`Media item ${args.ratingKey} has no Plex GUID — it may not be linked to Plex.tv metadata`);
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
    name: 'add_to_watchlist',
    description:
      'Add a media item to your Plex watchlist. Use search_library or advanced_search first to find the ratingKey of the item.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description:
            'The local library ratingKey of the media item (from search_library or advanced_search results)',
        },
      },
      required: ['ratingKey'],
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
