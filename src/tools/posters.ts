import { z } from 'zod';
import { getPlexClient } from '../plex-client.js';
import {
  createResponse,
  createErrorResponse,
  checkReadOnlyMode,
} from '../utils.js';
import type { ToolResponse } from '../types.js';

// Schemas
export const listPostersSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the media item to list posters for'),
});

export const getCurrentPosterSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the media item to get the current poster for'),
});

export const setPosterSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the media item to set the poster for'),
  posterKey: z.string().describe('The key of the poster to set as active'),
});

export const deletePosterSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the media item'),
  posterKey: z.string().describe('The key of the poster to delete'),
});

export const uploadPosterSchema = z.object({
  ratingKey: z
    .string()
    .describe('The ratingKey of the media item to upload a poster for'),
  imageUrl: z.string().url().describe('URL of the image to use as poster'),
});

// Tool implementations
export async function listPosters(
  args: z.infer<typeof listPostersSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const posters = await client.getPosters(args.ratingKey);

    if (posters.length === 0) {
      return createResponse({
        message: 'No posters found for this media item',
        posters: [],
      });
    }

    const formattedPosters = posters.map((p, index) => ({
      index: index + 1,
      key: p.key,
      ratingKey: p.ratingKey,
      selected: p.selected,
      provider: p.provider || 'local',
      thumb: p.thumb,
    }));

    const selectedPoster = formattedPosters.find((p) => p.selected);

    return createResponse({
      message: `Found ${posters.length} poster(s)`,
      currentPoster: selectedPoster
        ? `Poster #${selectedPoster.index}`
        : 'None selected',
      posters: formattedPosters,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function getCurrentPoster(
  args: z.infer<typeof getCurrentPosterSchema>
): Promise<ToolResponse> {
  try {
    const client = getPlexClient();
    const posters = await client.getPosters(args.ratingKey);

    const currentPoster = posters.find((p) => p.selected);

    if (!currentPoster) {
      return createResponse({
        message: 'No poster is currently selected',
        poster: null,
      });
    }

    return createResponse({
      message: 'Current poster found',
      poster: {
        key: currentPoster.key,
        ratingKey: currentPoster.ratingKey,
        provider: currentPoster.provider || 'local',
        thumb: currentPoster.thumb,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function setPoster(
  args: z.infer<typeof setPosterSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.setSelectedPoster(args.ratingKey, args.posterKey);

    return createResponse({
      message: 'Poster updated successfully',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function deletePoster(
  args: z.infer<typeof deletePosterSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();

    // First check if this is the selected poster
    const posters = await client.getPosters(args.ratingKey);
    // Match by key (full path) or ratingKey (upload:// URI) — both may be
    // shown in list_posters output and users may pass either.
    const posterToDelete = posters.find(
      (p) => p.key === args.posterKey || p.ratingKey === args.posterKey
    );

    if (!posterToDelete) {
      return createErrorResponse(new Error('Poster not found'));
    }

    if (posterToDelete.selected) {
      return createErrorResponse(
        new Error(
          'Cannot delete the currently selected poster. Please select a different poster first.'
        )
      );
    }

    // Always pass the canonical key (full path) so deletePoster can pick the
    // right endpoint, regardless of which identifier the user supplied.
    await client.deletePoster(args.ratingKey, posterToDelete.key);

    return createResponse({
      message: 'Poster deleted successfully',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function uploadPoster(
  args: z.infer<typeof uploadPosterSchema>
): Promise<ToolResponse> {
  try {
    checkReadOnlyMode();
    const client = getPlexClient();
    await client.uploadPoster(args.ratingKey, args.imageUrl);

    return createResponse({
      message: 'Poster uploaded successfully. Use set_poster to select it.',
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Tool definitions for MCP
export const posterTools = [
  {
    name: 'list_posters',
    description:
      'List all available posters for a media item (movie, TV show, etc.)',
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
    handler: listPosters,
  },
  {
    name: 'get_current_poster',
    description: 'Get the currently selected poster for a media item',
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
    handler: getCurrentPoster,
  },
  {
    name: 'set_poster',
    description: 'Set a specific poster as the active poster for a media item',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description: 'The ratingKey of the media item',
        },
        posterKey: {
          type: 'string',
          description: 'The key of the poster to set as active',
        },
      },
      required: ['ratingKey', 'posterKey'],
    },
    handler: setPoster,
  },
  {
    name: 'delete_poster',
    description:
      'Delete a poster from a media item. Cannot delete the currently selected poster.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description: 'The ratingKey of the media item',
        },
        posterKey: {
          type: 'string',
          description: 'The key of the poster to delete',
        },
      },
      required: ['ratingKey', 'posterKey'],
    },
    handler: deletePoster,
  },
  {
    name: 'upload_poster',
    description:
      'Upload a new poster from a URL for a media item. After uploading, use set_poster to select it.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ratingKey: {
          type: 'string',
          description: 'The ratingKey of the media item',
        },
        imageUrl: {
          type: 'string',
          description: 'URL of the image to use as poster',
        },
      },
      required: ['ratingKey', 'imageUrl'],
    },
    handler: uploadPoster,
  },
];
