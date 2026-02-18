import { z } from 'zod';
import { getTautulliClient, isTautulliConfigured } from '../tautulli-client.js';
import { createResponse, createErrorResponse, formatDuration } from '../utils.js';
import type { ToolResponse } from '../types.js';

// Helper to check Tautulli is configured
function requireTautulli(): void {
  if (!isTautulliConfigured()) {
    throw new Error(
      'Tautulli is not configured. Set TAUTULLI_URL and TAUTULLI_API_KEY environment variables.'
    );
  }
}

// Schemas
export const getTautulliActivitySchema = z.object({});

export const getTautulliHistorySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID'),
  sectionId: z.string().optional().describe('Filter by library section ID'),
  mediaType: z
    .enum(['movie', 'episode', 'track'])
    .optional()
    .describe('Filter by media type'),
  startDate: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  limit: z.number().optional().default(25).describe('Number of results'),
});

export const getTautulliLibraryStatsSchema = z.object({});

export const getTautulliUserStatsSchema = z.object({});

export const getMostWatchedSchema = z.object({
  mediaType: z
    .enum(['movies', 'shows'])
    .optional()
    .default('movies')
    .describe('Type of media'),
  timeRange: z
    .number()
    .optional()
    .describe('Time range in days (default: all time)'),
  limit: z.number().optional().default(10).describe('Number of results'),
});

export const getPlaysByDateSchema = z.object({
  timeRange: z
    .number()
    .optional()
    .default(30)
    .describe('Time range in days'),
  userId: z.string().optional().describe('Filter by user ID'),
});

export const getStreamTypeStatsSchema = z.object({
  timeRange: z
    .number()
    .optional()
    .default(12)
    .describe('Time range in months'),
});

export const getMostActiveUsersSchema = z.object({
  timeRange: z
    .number()
    .optional()
    .describe('Time range in days (default: all time)'),
  limit: z.number().optional().default(10).describe('Number of results'),
});

// Tool implementations
export async function getTautulliActivity(): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const activity = await client.getActivity();

    const formattedSessions = activity.sessions.map((session) => ({
      title: session.grandparentTitle
        ? `${session.grandparentTitle} - ${session.title}`
        : session.title,
      user: session.friendlyName,
      player: session.player,
      platform: session.platform,
      state: session.state,
      progress: `${session.progressPercent}%`,
      transcodeDecision: session.transcodeDecision,
      videoResolution: session.videoResolution,
      bandwidth: `${(session.bandwidth / 1000).toFixed(1)} Mbps`,
      location: session.location,
      ipAddress: session.ipAddress,
    }));

    return createResponse({
      message: `${activity.streamCount} active stream(s)`,
      summary: {
        totalStreams: activity.streamCount,
        directPlay: activity.streamCountDirectPlay,
        directStream: activity.streamCountDirectStream,
        transcoding: activity.streamCountTranscode,
        totalBandwidth: `${(activity.totalBandwidth / 1000).toFixed(1)} Mbps`,
        lanBandwidth: `${(activity.lanBandwidth / 1000).toFixed(1)} Mbps`,
        wanBandwidth: `${(activity.wanBandwidth / 1000).toFixed(1)} Mbps`,
      },
      sessions: formattedSessions,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getTautulliHistory(
  args: z.infer<typeof getTautulliHistorySchema>
): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const history = await client.getHistory({
      userId: args.userId,
      sectionId: args.sectionId,
      mediaType: args.mediaType,
      startDate: args.startDate,
      length: args.limit,
    });

    const formattedHistory = history.map((item) => ({
      title: item.grandparentTitle
        ? `${item.grandparentTitle} - ${item.title}`
        : item.title,
      user: item.friendlyName,
      date: new Date(item.date * 1000).toLocaleString(),
      duration: formatDuration(item.duration * 1000),
      percentWatched: `${item.percentComplete}%`,
      platform: item.platform,
      player: item.player,
      transcodeDecision: item.transcodeDecision,
    }));

    return createResponse({
      message: `Found ${history.length} history item(s)`,
      history: formattedHistory,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getTautulliLibraryStats(): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const libraries = await client.getLibrariesTable();

    const formattedLibraries = libraries.map((lib) => ({
      name: lib.sectionName,
      type: lib.sectionType,
      items: lib.count,
      childItems: lib.childCount,
      totalPlays: lib.plays,
      lastPlayed: lib.lastPlayed,
    }));

    const totalPlays = libraries.reduce((sum, lib) => sum + lib.plays, 0);

    return createResponse({
      message: `${libraries.length} library section(s)`,
      totalPlays,
      libraries: formattedLibraries,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getTautulliUserStats(): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const users = await client.getUsersTable();

    const formattedUsers = users.map((user) => ({
      name: user.friendlyName,
      username: user.username,
      totalPlays: user.totalPlays,
      totalWatchTime: formatDuration(user.totalDuration * 1000),
      lastSeen: user.lastSeen
        ? new Date(user.lastSeen * 1000).toLocaleString()
        : 'Never',
      lastPlayed: user.lastPlayed,
      isActive: user.isActive,
    }));

    return createResponse({
      message: `${users.length} user(s)`,
      users: formattedUsers,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getMostWatched(
  args: z.infer<typeof getMostWatchedSchema>
): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();

    const results =
      args.mediaType === 'shows'
        ? await client.getMostWatchedShows(args.timeRange, args.limit)
        : await client.getMostWatchedMovies(args.timeRange, args.limit);

    const formattedResults = results.map((item, index) => ({
      rank: index + 1,
      title: item.title,
      year: item.year,
      totalPlays: item.totalPlays,
      totalWatchTime: formatDuration(item.totalDuration * 1000),
      uniqueViewers: item.usersWatched,
      lastPlayed: item.lastPlay
        ? new Date(item.lastPlay * 1000).toLocaleString()
        : 'Unknown',
    }));

    return createResponse({
      message: `Top ${results.length} most watched ${args.mediaType}`,
      timeRange: args.timeRange ? `${args.timeRange} days` : 'All time',
      results: formattedResults,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getMostActiveUsers(
  args: z.infer<typeof getMostActiveUsersSchema>
): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const users = await client.getMostActiveUsers(args.timeRange, args.limit);

    const formattedUsers = users.map((user, index) => ({
      rank: index + 1,
      name: user.friendly_name || user.user,
      totalPlays: user.total_plays,
      totalWatchTime: formatDuration((user.total_duration as number) * 1000),
    }));

    return createResponse({
      message: `Top ${users.length} most active users`,
      timeRange: args.timeRange ? `${args.timeRange} days` : 'All time',
      users: formattedUsers,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getPlaysByDate(
  args: z.infer<typeof getPlaysByDateSchema>
): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const plays = await client.getPlaysByDate(args.timeRange, args.userId);

    const totalPlays = plays.reduce((sum, day) => sum + day.plays, 0);
    const avgPlays = totalPlays / plays.length;

    return createResponse({
      message: `Play statistics for the last ${args.timeRange} days`,
      summary: {
        totalPlays,
        averagePerDay: avgPlays.toFixed(1),
        peakDay: plays.reduce(
          (max, day) => (day.plays > max.plays ? day : max),
          plays[0]
        ),
      },
      dailyPlays: plays,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getStreamTypeStats(
  args: z.infer<typeof getStreamTypeStatsSchema>
): Promise<ToolResponse> {
  try {
    requireTautulli();
    const client = getTautulliClient();
    const stats = await client.getStreamTypeByMonth(args.timeRange);

    const totals = stats.reduce(
      (acc, month) => ({
        directPlay: acc.directPlay + month.directPlay,
        directStream: acc.directStream + month.directStream,
        transcode: acc.transcode + month.transcode,
      }),
      { directPlay: 0, directStream: 0, transcode: 0 }
    );

    const total = totals.directPlay + totals.directStream + totals.transcode;

    return createResponse({
      message: `Stream type statistics for the last ${args.timeRange} months`,
      summary: {
        directPlayPercent: total > 0 ? `${((totals.directPlay / total) * 100).toFixed(1)}%` : '0%',
        directStreamPercent: total > 0 ? `${((totals.directStream / total) * 100).toFixed(1)}%` : '0%',
        transcodePercent: total > 0 ? `${((totals.transcode / total) * 100).toFixed(1)}%` : '0%',
        totals,
      },
      monthlyBreakdown: stats,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const tautulliTools = [
  {
    name: 'tautulli_activity',
    description:
      'Get real-time activity from Tautulli including all current streams, bandwidth usage, and transcoding status',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getTautulliActivity,
  },
  {
    name: 'tautulli_history',
    description:
      'Get detailed watch history from Tautulli with filtering options',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'Filter by user ID',
        },
        sectionId: {
          type: 'string',
          description: 'Filter by library section ID',
        },
        mediaType: {
          type: 'string',
          enum: ['movie', 'episode', 'track'],
          description: 'Filter by media type',
        },
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        limit: {
          type: 'number',
          description: 'Number of results (default: 25)',
        },
      },
      required: [],
    },
    handler: getTautulliHistory,
  },
  {
    name: 'tautulli_library_stats',
    description:
      'Get statistics for all libraries including item counts and total plays',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getTautulliLibraryStats,
  },
  {
    name: 'tautulli_user_stats',
    description:
      'Get statistics for all users including total plays, watch time, and last activity',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getTautulliUserStats,
  },
  {
    name: 'tautulli_most_watched',
    description:
      'Get the most watched movies or TV shows with play counts and unique viewers',
    inputSchema: {
      type: 'object' as const,
      properties: {
        mediaType: {
          type: 'string',
          enum: ['movies', 'shows'],
          description: 'Type of media (default: movies)',
        },
        timeRange: {
          type: 'number',
          description: 'Time range in days (omit for all time)',
        },
        limit: {
          type: 'number',
          description: 'Number of results (default: 10)',
        },
      },
      required: [],
    },
    handler: getMostWatched,
  },
  {
    name: 'tautulli_most_active_users',
    description:
      'Get the most active users ranked by total plays and watch time',
    inputSchema: {
      type: 'object' as const,
      properties: {
        timeRange: {
          type: 'number',
          description: 'Time range in days (omit for all time)',
        },
        limit: {
          type: 'number',
          description: 'Number of results (default: 10)',
        },
      },
      required: [],
    },
    handler: getMostActiveUsers,
  },
  {
    name: 'tautulli_plays_by_date',
    description:
      'Get play counts by date for trend analysis',
    inputSchema: {
      type: 'object' as const,
      properties: {
        timeRange: {
          type: 'number',
          description: 'Time range in days (default: 30)',
        },
        userId: {
          type: 'string',
          description: 'Filter by user ID',
        },
      },
      required: [],
    },
    handler: getPlaysByDate,
  },
  {
    name: 'tautulli_stream_type_stats',
    description:
      'Get statistics on stream types (direct play vs transcode) over time',
    inputSchema: {
      type: 'object' as const,
      properties: {
        timeRange: {
          type: 'number',
          description: 'Time range in months (default: 12)',
        },
      },
      required: [],
    },
    handler: getStreamTypeStats,
  },
];
