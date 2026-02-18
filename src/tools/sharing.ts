import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  checkReadOnlyMode,
} from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const listFriendsSchema = z.object({});

export const getFriendSchema = z.object({
  friendId: z.string().describe('The ID of the friend to get details for'),
});

export const getSharedServersSchema = z.object({});

export const shareLibrarySchema = z.object({
  friendId: z.string().describe('The ID of the friend to share with'),
  sectionIds: z
    .array(z.string())
    .describe('Array of library section IDs to share'),
  allowSync: z
    .boolean()
    .optional()
    .default(false)
    .describe('Allow friend to sync/download content'),
  allowCameraUpload: z
    .boolean()
    .optional()
    .default(false)
    .describe('Allow friend to upload camera photos'),
  allowChannels: z
    .boolean()
    .optional()
    .default(false)
    .describe('Allow access to channels'),
  filterMovies: z
    .string()
    .optional()
    .describe('Content rating filter for movies (e.g., "G,PG,PG-13")'),
  filterTelevision: z
    .string()
    .optional()
    .describe('Content rating filter for TV (e.g., "TV-Y,TV-G,TV-PG")'),
  filterMusic: z
    .string()
    .optional()
    .describe('Content rating filter for music'),
});

export const updateShareSchema = z.object({
  friendId: z.string().describe('The ID of the friend'),
  sectionIds: z
    .array(z.string())
    .optional()
    .describe('Updated array of library section IDs to share'),
  allowSync: z.boolean().optional().describe('Allow sync/download'),
  allowCameraUpload: z.boolean().optional().describe('Allow camera upload'),
  allowChannels: z.boolean().optional().describe('Allow channels'),
});

export const unshareLibrarySchema = z.object({
  friendId: z.string().describe('The ID of the friend to unshare from'),
});

export const inviteFriendSchema = z.object({
  email: z.string().email().describe('Email address of the person to invite'),
  sectionIds: z
    .array(z.string())
    .describe('Array of library section IDs to share with them'),
});

// Tool implementations
export async function listFriends(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const friends = await client.getFriends();

    if (friends.length === 0) {
      return createResponse({
        message: 'No friends found',
        friends: [],
      });
    }

    const formattedFriends = friends.map((f) => ({
      id: f.id,
      username: f.username,
      email: f.email,
      thumb: f.thumb,
      status: f.status,
      sharedServers: f.sharedServers,
      sharedSections: f.sharedSections,
    }));

    return createResponse({
      message: `Found ${friends.length} friend(s)`,
      friends: formattedFriends,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getFriend(
  args: z.infer<typeof getFriendSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const friend = await client.getFriend(args.friendId);

    return createResponse({
      message: `Friend details for ${friend.username}`,
      friend: {
        id: friend.id,
        username: friend.username,
        email: friend.email,
        thumb: friend.thumb,
        status: friend.status,
        sharedServers: friend.sharedServers,
        sharedSections: friend.sharedSections,
        allowSync: friend.allowSync,
        allowCameraUpload: friend.allowCameraUpload,
        allowChannels: friend.allowChannels,
        filterMovies: friend.filterMovies,
        filterTelevision: friend.filterTelevision,
        filterMusic: friend.filterMusic,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getSharedServers(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const servers = await client.getSharedServers();

    return createResponse({
      message: `Found ${servers.length} shared server configuration(s)`,
      servers: servers,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function shareLibrary(
  args: z.infer<typeof shareLibrarySchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.shareLibrary(
      args.friendId,
      args.sectionIds,
      {
        allowSync: args.allowSync,
        allowCameraUpload: args.allowCameraUpload,
        allowChannels: args.allowChannels,
        filterMovies: args.filterMovies,
        filterTelevision: args.filterTelevision,
        filterMusic: args.filterMusic,
      }
    );

    return createResponse({
      message: `Shared ${args.sectionIds.length} library section(s) with friend ${args.friendId}`,
      sections: args.sectionIds,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function updateShare(
  args: z.infer<typeof updateShareSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.updateShare(args.friendId, {
      sectionIds: args.sectionIds,
      allowSync: args.allowSync,
      allowCameraUpload: args.allowCameraUpload,
      allowChannels: args.allowChannels,
    });

    return createResponse({
      message: `Updated sharing settings for friend ${args.friendId}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function unshareLibrary(
  args: z.infer<typeof unshareLibrarySchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.unshareLibrary(args.friendId);

    return createResponse({
      message: `Removed all library sharing with friend ${args.friendId}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function inviteFriend(
  args: z.infer<typeof inviteFriendSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.inviteFriend(args.email, args.sectionIds);

    return createResponse({
      message: `Invitation sent to ${args.email}`,
      sharedSections: args.sectionIds,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const sharingTools = [
  {
    name: 'list_friends',
    description:
      'List all Plex friends/users you have shared your library with',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: listFriends,
  },
  {
    name: 'get_friend',
    description:
      'Get detailed information about a specific friend including their sharing settings',
    inputSchema: {
      type: 'object' as const,
      properties: {
        friendId: {
          type: 'string',
          description: 'The ID of the friend',
        },
      },
      required: ['friendId'],
    },
    handler: getFriend,
  },
  {
    name: 'get_shared_servers',
    description:
      'Get all shared server configurations showing who has access to what',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getSharedServers,
  },
  {
    name: 'share_library',
    description:
      'Share library sections with a friend, with optional content restrictions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        friendId: {
          type: 'string',
          description: 'The ID of the friend to share with',
        },
        sectionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of library section IDs to share',
        },
        allowSync: {
          type: 'boolean',
          description: 'Allow friend to sync/download content',
        },
        allowCameraUpload: {
          type: 'boolean',
          description: 'Allow friend to upload camera photos',
        },
        allowChannels: {
          type: 'boolean',
          description: 'Allow access to channels',
        },
        filterMovies: {
          type: 'string',
          description: 'Content rating filter for movies (e.g., "G,PG,PG-13")',
        },
        filterTelevision: {
          type: 'string',
          description: 'Content rating filter for TV shows',
        },
        filterMusic: {
          type: 'string',
          description: 'Content rating filter for music',
        },
      },
      required: ['friendId', 'sectionIds'],
    },
    handler: shareLibrary,
  },
  {
    name: 'update_share',
    description:
      'Update sharing settings for an existing friend',
    inputSchema: {
      type: 'object' as const,
      properties: {
        friendId: {
          type: 'string',
          description: 'The ID of the friend',
        },
        sectionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated array of library section IDs',
        },
        allowSync: {
          type: 'boolean',
          description: 'Allow sync/download',
        },
        allowCameraUpload: {
          type: 'boolean',
          description: 'Allow camera upload',
        },
        allowChannels: {
          type: 'boolean',
          description: 'Allow channels',
        },
      },
      required: ['friendId'],
    },
    handler: updateShare,
  },
  {
    name: 'unshare_library',
    description:
      'Remove all library sharing with a specific friend',
    inputSchema: {
      type: 'object' as const,
      properties: {
        friendId: {
          type: 'string',
          description: 'The ID of the friend to unshare from',
        },
      },
      required: ['friendId'],
    },
    handler: unshareLibrary,
  },
  {
    name: 'invite_friend',
    description:
      'Invite someone by email to access your Plex library',
    inputSchema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'Email address of the person to invite',
        },
        sectionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of library section IDs to share with them',
        },
      },
      required: ['email', 'sectionIds'],
    },
    handler: inviteFriend,
  },
];
