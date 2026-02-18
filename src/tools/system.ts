import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import { createResponse, createErrorResponse, state } from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const getServerInfoSchema = z.object({});

export const setReadOnlyModeSchema = z.object({
  enabled: z.boolean().describe('Whether to enable read-only mode'),
});

export const getModeSchema = z.object({});

export const getWatchHistorySchema = z.object({
  accountId: z
    .number()
    .optional()
    .describe('Optional account ID to filter history'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of items to return'),
});

export const getContinueWatchingSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of items to return'),
});

// Tool implementations
export async function getServerInfo(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const info = await client.getServerInfo();

    return createResponse({
      message: 'Connected to Plex server',
      server: {
        name: info.name,
        version: info.version,
        platform: info.platform,
        platformVersion: info.platformVersion,
        machineIdentifier: info.machineIdentifier,
        myPlex: info.myPlex,
        myPlexUsername: info.myPlexUsername,
      },
      readOnlyMode: state.readOnlyMode,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function setReadOnlyMode(
  args: z.infer<typeof setReadOnlyModeSchema>
): Promise<ToolResponse> {
  try {
    state.readOnlyMode = args.enabled;

    return createResponse({
      message: `Read-only mode ${args.enabled ? 'enabled' : 'disabled'}`,
      readOnlyMode: state.readOnlyMode,
      blockedOperations: args.enabled
        ? [
            'play_media',
            'pause',
            'resume',
            'stop',
            'seek',
            'set_volume',
            'create_playlist',
            'add_to_playlist',
            'remove_from_playlist',
            'delete_playlist',
            'set_poster',
            'delete_poster',
            'upload_poster',
          ]
        : [],
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getMode(): Promise<ToolResponse> {
  return createResponse({
    readOnlyMode: state.readOnlyMode,
    message: state.readOnlyMode
      ? 'Server is in read-only mode. Write operations are blocked.'
      : 'Server is in full control mode. All operations are available.',
  });
}

export async function getWatchHistory(
  args: z.infer<typeof getWatchHistorySchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const history = await client.getWatchHistory(args.accountId, args.limit);

    if (history.length === 0) {
      return createResponse({
        message: 'No watch history found',
        history: [],
      });
    }

    const formattedHistory = history.map((item) => ({
      title: item.grandparentTitle
        ? `${item.grandparentTitle} - ${item.title}`
        : item.title,
      type: item.type,
      ratingKey: item.ratingKey,
      episode: item.index,
      season: item.parentIndex,
      watchedAt: new Date(item.viewedAt * 1000).toLocaleString(),
    }));

    return createResponse({
      message: `Found ${history.length} item(s) in watch history`,
      history: formattedHistory,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getContinueWatching(
  args: z.infer<typeof getContinueWatchingSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const items = await client.getContinueWatching(args.limit);

    if (items.length === 0) {
      return createResponse({
        message: 'No items to continue watching',
        items: [],
      });
    }

    const formattedItems = items.map((item) => {
      const progress = item.viewOffset && item.duration
        ? Math.round((item.viewOffset / item.duration) * 100)
        : 0;

      return {
        title: item.grandparentTitle
          ? `${item.grandparentTitle} - ${item.title}`
          : item.title,
        type: item.type,
        ratingKey: item.ratingKey,
        progress: `${progress}%`,
        episode: item.index,
        season: item.parentIndex,
      };
    });

    return createResponse({
      message: `Found ${items.length} item(s) to continue watching`,
      items: formattedItems,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const systemTools = [
  {
    name: 'get_server_info',
    description:
      'Get information about the connected Plex server including version, platform, and connection status',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getServerInfo,
  },
  {
    name: 'set_read_only_mode',
    description:
      'Enable or disable read-only mode. When enabled, all write/control operations (playback, playlists, posters) are blocked.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether to enable read-only mode',
        },
      },
      required: ['enabled'],
    },
    handler: setReadOnlyMode,
  },
  {
    name: 'get_mode',
    description: 'Get the current server mode (read-only or full control)',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getMode,
  },
  {
    name: 'get_watch_history',
    description: 'Get the watch history from the Plex server',
    inputSchema: {
      type: 'object' as const,
      properties: {
        accountId: {
          type: 'number',
          description: 'Optional account ID to filter history',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 50)',
        },
      },
      required: [],
    },
    handler: getWatchHistory,
  },
  {
    name: 'get_continue_watching',
    description:
      'Get items that are in-progress and can be continued watching',
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
    handler: getContinueWatching,
  },
];
