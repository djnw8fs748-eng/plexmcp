import type { ToolResponse, ServerState } from './types.js';

// Global state
export const state: ServerState = {
  readOnlyMode: process.env.READ_ONLY_MODE === 'true',
};

export function createResponse(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function createErrorResponse(error: unknown): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

export function checkReadOnlyMode(): void {
  if (state.readOnlyMode) {
    throw new Error(
      'Operation blocked: Server is in read-only mode. Use set_read_only_mode to disable.'
    );
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
