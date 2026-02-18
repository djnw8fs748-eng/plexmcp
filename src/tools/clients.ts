import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import { createResponse, createErrorResponse, formatDuration } from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const listClientsSchema = z.object({});

export const getActiveSessionsSchema = z.object({});

// Tool implementations
export async function listClients(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const clients = await client.getClients();

    if (clients.length === 0) {
      return createResponse({
        message: 'No connected clients found',
        clients: [],
      });
    }

    const formattedClients = clients.map((c) => ({
      name: c.name,
      machineIdentifier: c.machineIdentifier,
      product: c.product,
      device: c.deviceClass,
      version: c.version,
      address: c.address,
      port: c.port,
      protocol: c.protocol,
    }));

    return createResponse({
      message: `Found ${clients.length} connected client(s)`,
      clients: formattedClients,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getActiveSessions(): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const sessions = await client.getActiveSessions();

    if (sessions.length === 0) {
      return createResponse({
        message: 'No active sessions',
        sessions: [],
      });
    }

    const formattedSessions = sessions.map((session) => {
      const progress = Math.round(
        (session.viewOffset / session.duration) * 100
      );

      return {
        sessionKey: session.sessionKey,
        media: {
          title: session.title,
          type: session.type,
          show: session.grandparentTitle,
          season: session.parentTitle,
        },
        playback: {
          state: session.Player.state,
          progress: `${progress}%`,
          position: formatDuration(session.viewOffset),
          duration: formatDuration(session.duration),
        },
        user: {
          name: session.User.title,
          id: session.User.id,
        },
        player: {
          name: session.Player.title,
          machineIdentifier: session.Player.machineIdentifier,
          device: session.Player.device,
          platform: session.Player.platform,
          product: session.Player.product,
          local: session.Player.local,
        },
        session: session.Session
          ? {
              id: session.Session.id,
              bandwidth: session.Session.bandwidth,
              location: session.Session.location,
            }
          : null,
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
export const clientTools = [
  {
    name: 'list_clients',
    description:
      'List all connected Plex clients/devices that can be used for playback control',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: listClients,
  },
  {
    name: 'get_active_sessions',
    description:
      'Get all active playback sessions on the Plex server, including what is playing, who is watching, and on what device',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: getActiveSessions,
  },
];
