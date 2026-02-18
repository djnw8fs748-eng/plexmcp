import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  checkReadOnlyMode,
} from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const scanLibrarySchema = z.object({
  sectionId: z.string().describe('The library section ID to scan'),
});

export const refreshMetadataSchema = z.object({
  ratingKey: z.string().describe('The ratingKey of the media item to refresh'),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force download of all metadata, even if it already exists'),
});

export const analyzeMediaSchema = z.object({
  ratingKey: z.string().describe('The ratingKey of the media item to analyze'),
});

export const emptyTrashSchema = z.object({
  sectionId: z
    .string()
    .optional()
    .describe('Optional section ID to empty trash for, or all sections if omitted'),
});

export const cleanBundlesSchema = z.object({});

export const optimizeDatabaseSchema = z.object({});

// Tool implementations
export async function scanLibrary(
  args: z.infer<typeof scanLibrarySchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.scanLibrary(args.sectionId);

    return createResponse({
      message: `Library scan started for section ${args.sectionId}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function refreshMetadata(
  args: z.infer<typeof refreshMetadataSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.refreshMetadata(args.ratingKey, args.force);

    return createResponse({
      message: `Metadata refresh started for item ${args.ratingKey}`,
      force: args.force,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function analyzeMedia(
  args: z.infer<typeof analyzeMediaSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.analyzeMedia(args.ratingKey);

    return createResponse({
      message: `Media analysis started for item ${args.ratingKey}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function emptyTrash(
  args: z.infer<typeof emptyTrashSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.emptyTrash(args.sectionId);

    return createResponse({
      message: args.sectionId
        ? `Trash emptied for section ${args.sectionId}`
        : 'Trash emptied for all sections',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function cleanBundles(): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.cleanBundles();

    return createResponse({
      message: 'Bundle cleaning started',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function optimizeDatabase(): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.optimizeDatabase();

    return createResponse({
      message: 'Database optimization started',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const libraryManagementTools = [
  {
    name: 'scan_library',
    description:
      'Trigger a library scan to detect new, updated, or removed media files',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sectionId: {
          type: 'string',
          description: 'The library section ID to scan (use get_library_sections to find IDs)',
        },
      },
      required: ['sectionId'],
    },
    handler: scanLibrary,
  },
  {
    name: 'refresh_metadata',
    description:
      'Refresh metadata for a specific media item from online sources',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description: 'The ratingKey of the media item',
        },
        force: {
          type: 'boolean',
          description: 'Force re-download all metadata even if it exists',
        },
      },
      required: ['ratingKey'],
    },
    handler: refreshMetadata,
  },
  {
    name: 'analyze_media',
    description:
      'Analyze a media item to detect intro/credits markers, chapters, and loudness levels',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description: 'The ratingKey of the media item',
        },
      },
      required: ['ratingKey'],
    },
    handler: analyzeMedia,
  },
  {
    name: 'empty_trash',
    description:
      'Empty the trash for a library section or all sections to permanently delete removed media',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sectionId: {
          type: 'string',
          description: 'Optional section ID, or omit to empty all trash',
        },
      },
      required: [],
    },
    handler: emptyTrash,
  },
  {
    name: 'clean_bundles',
    description:
      'Clean up old metadata bundles to free up disk space',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: cleanBundles,
  },
  {
    name: 'optimize_database',
    description:
      'Optimize the Plex database for better performance',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: optimizeDatabase,
  },
];
