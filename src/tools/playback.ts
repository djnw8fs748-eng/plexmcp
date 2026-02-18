import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  checkReadOnlyMode,
  formatDuration,
} from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const playMediaSchema = z.object({
  clientId: z
    .string()
    .describe('The machine identifier of the client to play on'),
  mediaKey: z
    .string()
    .describe('The key/ratingKey of the media item to play'),
  offset: z
    .number()
    .optional()
    .describe('Optional offset in milliseconds to start from'),
});

export const clientControlSchema = z.object({
  clientId: z
    .string()
    .describe('The machine identifier of the client to control'),
});

export const seekSchema = z.object({
  clientId: z.string().describe('The machine identifier of the client'),
  offset: z.number().describe('Position to seek to in milliseconds'),
});

export const setVolumeSchema = z.object({
  clientId: z.string().describe('The machine identifier of the client'),
  level: z.number().min(0).max(100).describe('Volume level (0-100)'),
});

export const getPlaybackStatusSchema = z.object({});

// Tool implementations
export async function playMedia(
  args: z.infer<typeof playMediaSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();

    // Get media info for display
    const mediaInfo = await client.getMediaItem(args.mediaKey);
    await client.playMedia(args.clientId, `/library/metadata/${args.mediaKey}`, args.offset);

    let message = `Now playing: ${mediaInfo.title}`;
    if (mediaInfo.grandparentTitle) {
      message = `Now playing: ${mediaInfo.grandparentTitle} - ${mediaInfo.title}`;
    }
    if (args.offset) {
      message += ` (starting at ${formatDuration(args.offset)})`;
    }

    return createResponse({ message, media: mediaInfo.title });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function pause(
  args: z.infer<typeof clientControlSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.pausePlayback(args.clientId);
    return createResponse({ message: 'Playback paused' });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function resume(
  args: z.infer<typeof clientControlSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.resumePlayback(args.clientId);
    return createResponse({ message: 'Playback resumed' });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function stop(
  args: z.infer<typeof clientControlSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.stopPlayback(args.clientId);
    return createResponse({ message: 'Playback stopped' });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function seek(
  args: z.infer<typeof seekSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.seekTo(args.clientId, args.offset);
    return createResponse({
      message: `Seeked to ${formatDuration(args.offset)}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function setVolume(
  args: z.infer<typeof setVolumeSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.setVolume(args.clientId, args.level);
    return createResponse({ message: `Volume set to ${args.level}%` });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getPlaybackStatus(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const sessions = await client.getActiveSessions();

    if (sessions.length === 0) {
      return createResponse({
        message: 'No active playback sessions',
        sessions: [],
      });
    }

    const formattedSessions = sessions.map((session) => {
      const progress = Math.round(
        (session.viewOffset / session.duration) * 100
      );
      return {
        sessionKey: session.sessionKey,
        title: session.grandparentTitle
          ? `${session.grandparentTitle} - ${session.title}`
          : session.title,
        type: session.type,
        state: session.Player.state,
        progress: `${progress}%`,
        position: formatDuration(session.viewOffset),
        duration: formatDuration(session.duration),
        user: session.User.title,
        player: {
          name: session.Player.title,
          device: session.Player.device,
          platform: session.Player.platform,
          clientId: session.Player.machineIdentifier,
        },
      };
    });

    return createResponse({
      message: `${sessions.length} active session(s)`,
      sessions: formattedSessions,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const playbackTools = [
  {
    name: 'play_media',
    description:
      'Start playing a media item on a specific Plex client. Requires the client machine identifier and media rating key.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client to play on',
        },
        mediaKey: {
          type: 'string',
          description:
            'The ratingKey of the media item to play (from search results)',
        },
        offset: {
          type: 'number',
          description: 'Optional offset in milliseconds to start from',
        },
      },
      required: ['clientId', 'mediaKey'],
    },
    handler: playMedia,
  },
  {
    name: 'pause',
    description: 'Pause playback on a specific Plex client',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client to pause',
        },
      },
      required: ['clientId'],
    },
    handler: pause,
  },
  {
    name: 'resume',
    description: 'Resume playback on a specific Plex client',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client to resume',
        },
      },
      required: ['clientId'],
    },
    handler: resume,
  },
  {
    name: 'stop',
    description: 'Stop playback on a specific Plex client',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client to stop',
        },
      },
      required: ['clientId'],
    },
    handler: stop,
  },
  {
    name: 'seek',
    description: 'Seek to a specific position in the currently playing media',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client',
        },
        offset: {
          type: 'number',
          description: 'Position to seek to in milliseconds',
        },
      },
      required: ['clientId', 'offset'],
    },
    handler: seek,
  },
  {
    name: 'set_volume',
    description: 'Set the volume level on a specific Plex client',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'string',
          description: 'The machine identifier of the client',
        },
        level: {
          type: 'number',
          description: 'Volume level (0-100)',
        },
      },
      required: ['clientId', 'level'],
    },
    handler: setVolume,
  },
  {
    name: 'get_playback_status',
    description:
      'Get the current playback status of all active sessions on the Plex server',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getPlaybackStatus,
  },
];
