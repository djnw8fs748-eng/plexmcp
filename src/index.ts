#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';

import { libraryTools } from './tools/library.js';
import { playbackTools } from './tools/playback.js';
import { clientTools } from './tools/clients.js';
import { playlistTools } from './tools/playlists.js';
import { posterTools } from './tools/posters.js';
import { systemTools } from './tools/system.js';
import { libraryManagementTools } from './tools/library-management.js';
import { sharingTools } from './tools/sharing.js';
import { smartSearchTools } from './tools/smart-search.js';
import { tautulliTools } from './tools/tautulli.js';
import { watchlistTools } from './tools/watchlist.js';
import { createErrorResponse } from './utils.js';
import type { ToolResponse } from './types.js';

// Combine all tools
const allTools = [
  ...libraryTools,
  ...playbackTools,
  ...clientTools,
  ...playlistTools,
  ...posterTools,
  ...systemTools,
  ...libraryManagementTools,
  ...sharingTools,
  ...smartSearchTools,
  ...tautulliTools,
  ...watchlistTools,
];

// Create tool handler map
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;
const toolHandlers = new Map<string, ToolHandler>();
for (const tool of allTools) {
  toolHandlers.set(tool.name, tool.handler as ToolHandler);
}

// Create MCP server
const server = new Server(
  {
    name: 'plex-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<ToolResponse> => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers.get(name);
  if (!handler) {
    return createErrorResponse(new Error(`Unknown tool: ${name}`));
  }

  try {
    const result = await handler((args || {}) as Record<string, unknown>);
    return result;
  } catch (error) {
    return createErrorResponse(error);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Plex MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
