import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  checkReadOnlyMode,
  formatDuration,
  formatTimestamp,
} from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const listPlaylistsSchema = z.object({});

export const getPlaylistItemsSchema = z.object({
  playlistKey: z.string().describe('The key of the playlist to get items from'),
});

export const createPlaylistSchema = z.object({
  title: z.string().describe('Name of the playlist'),
  type: z
    .enum(['video', 'audio', 'photo'])
    .describe('Type of playlist (video, audio, or photo)'),
  itemKeys: z
    .array(z.string())
    .optional()
    .describe('Optional array of media ratingKeys to add initially'),
});

export const addToPlaylistSchema = z.object({
  playlistKey: z.string().describe('The key of the playlist'),
  itemKeys: z
    .array(z.string())
    .describe('Array of media ratingKeys to add to the playlist'),
});

export const removeFromPlaylistSchema = z.object({
  playlistKey: z.string().describe('The key of the playlist'),
  playlistItemId: z
    .string()
    .describe('The ID of the item within the playlist to remove'),
});

export const deletePlaylistSchema = z.object({
  playlistKey: z.string().describe('The key of the playlist to delete'),
});

// Tool implementations
export async function listPlaylists(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const playlists = await client.getPlaylists();

    if (playlists.length === 0) {
      return createResponse({
        message: 'No playlists found',
        playlists: [],
      });
    }

    const formattedPlaylists = playlists.map((p) => ({
      ratingKey: p.ratingKey,
      key: p.key,
      title: p.title,
      type: p.playlistType,
      smart: p.smart,
      itemCount: p.leafCount,
      duration: p.duration ? formatDuration(p.duration) : null,
      summary: p.summary,
      addedAt: formatTimestamp(p.addedAt),
      updatedAt: formatTimestamp(p.updatedAt),
    }));

    return createResponse({
      message: `Found ${playlists.length} playlist(s)`,
      playlists: formattedPlaylists,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getPlaylistItems(
  args: z.infer<typeof getPlaylistItemsSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const items = await client.getPlaylistItems(args.playlistKey);

    if (items.length === 0) {
      return createResponse({
        message: 'Playlist is empty',
        items: [],
      });
    }

    const formattedItems = items.map((item, index) => ({
      index: index + 1,
      ratingKey: item.ratingKey,
      title: item.grandparentTitle
        ? `${item.grandparentTitle} - ${item.title}`
        : item.title,
      type: item.type,
      duration: item.duration ? formatDuration(item.duration) : null,
      year: item.year,
    }));

    return createResponse({
      message: `Playlist contains ${items.length} item(s)`,
      items: formattedItems,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function createPlaylist(
  args: z.infer<typeof createPlaylistSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    const playlist = await client.createPlaylist(
      args.title,
      args.type,
      args.itemKeys
    );

    return createResponse({
      message: `Playlist "${args.title}" created successfully`,
      playlist: {
        ratingKey: playlist.ratingKey,
        key: playlist.key,
        title: playlist.title,
        type: playlist.playlistType,
        itemCount: playlist.leafCount,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function addToPlaylist(
  args: z.infer<typeof addToPlaylistSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.addToPlaylist(args.playlistKey, args.itemKeys);

    return createResponse({
      message: `Added ${args.itemKeys.length} item(s) to playlist`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function removeFromPlaylist(
  args: z.infer<typeof removeFromPlaylistSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.removeFromPlaylist(args.playlistKey, args.playlistItemId);

    return createResponse({
      message: 'Item removed from playlist',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function deletePlaylist(
  args: z.infer<typeof deletePlaylistSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.deletePlaylist(args.playlistKey);

    return createResponse({
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const playlistTools = [
  {
    name: 'list_playlists',
    description: 'List all playlists on the Plex server',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: listPlaylists,
  },
  {
    name: 'get_playlist_items',
    description: 'Get all items in a specific playlist',
    inputSchema: {
      type: 'object' as const,
      properties: {
        playlistKey: {
          type: 'string',
          description: 'The key of the playlist (from list_playlists)',
        },
      },
      required: ['playlistKey'],
    },
    handler: getPlaylistItems,
  },
  {
    name: 'create_playlist',
    description: 'Create a new playlist on the Plex server',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Name of the playlist',
        },
        type: {
          type: 'string',
          enum: ['video', 'audio', 'photo'],
          description: 'Type of playlist',
        },
        itemKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of media ratingKeys to add initially',
        },
      },
      required: ['title', 'type'],
    },
    handler: createPlaylist,
  },
  {
    name: 'add_to_playlist',
    description: 'Add media items to an existing playlist',
    inputSchema: {
      type: 'object' as const,
      properties: {
        playlistKey: {
          type: 'string',
          description: 'The key of the playlist',
        },
        itemKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of media ratingKeys to add',
        },
      },
      required: ['playlistKey', 'itemKeys'],
    },
    handler: addToPlaylist,
  },
  {
    name: 'remove_from_playlist',
    description: 'Remove an item from a playlist',
    inputSchema: {
      type: 'object' as const,
      properties: {
        playlistKey: {
          type: 'string',
          description: 'The key of the playlist',
        },
        playlistItemId: {
          type: 'string',
          description: 'The ID of the item within the playlist to remove',
        },
      },
      required: ['playlistKey', 'playlistItemId'],
    },
    handler: removeFromPlaylist,
  },
  {
    name: 'delete_playlist',
    description: 'Delete a playlist from the Plex server',
    inputSchema: {
      type: 'object' as const,
      properties: {
        playlistKey: {
          type: 'string',
          description: 'The key of the playlist to delete',
        },
      },
      required: ['playlistKey'],
    },
    handler: deletePlaylist,
  },
];
