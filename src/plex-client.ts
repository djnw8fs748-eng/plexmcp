import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  PlexServer,
  PlexLibrarySection,
  PlexMediaItem,
  PlexClient,
  PlexSession,
  PlexPlaylist,
  PlexPoster,
  PlexHistoryItem,
} from './types.js';

export class PlexApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    const plexUrl = process.env.PLEX_URL || 'http://localhost:32400';
    const plexToken = process.env.PLEX_TOKEN;

    if (!plexToken) {
      throw new Error('PLEX_TOKEN environment variable is required');
    }

    this.baseUrl = plexUrl;
    this.client = axios.create({
      baseURL: plexUrl,
      headers: {
        'X-Plex-Token': plexToken,
        Accept: 'application/json',
        'X-Plex-Client-Identifier': 'plex-mcp-server',
        'X-Plex-Product': 'Plex MCP Server',
        'X-Plex-Version': '1.0.0',
        'X-Plex-Platform': 'Node.js',
      },
    });
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      if (error.response) {
        throw new Error(
          `Plex API error: ${error.response.status} - ${error.response.statusText}`
        );
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to Plex server at ${this.baseUrl}. Is Plex running?`
        );
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }

  // Server Info
  async getServerInfo(): Promise<PlexServer> {
    try {
      const response = await this.client.get('/');
      const container = response.data.MediaContainer;
      return {
        name: container.friendlyName,
        version: container.version,
        platform: container.platform,
        platformVersion: container.platformVersion,
        machineIdentifier: container.machineIdentifier,
        myPlex: container.myPlex,
        myPlexUsername: container.myPlexUsername,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // Library Operations
  async getLibrarySections(): Promise<PlexLibrarySection[]> {
    try {
      const response = await this.client.get('/library/sections');
      return response.data.MediaContainer.Directory || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchLibrary(
    query: string,
    sectionId?: string
  ): Promise<PlexMediaItem[]> {
    try {
      const endpoint = sectionId
        ? `/library/sections/${sectionId}/search`
        : '/search';
      const response = await this.client.get(endpoint, {
        params: { query },
      });
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getRecentlyAdded(
    sectionId?: string,
    limit: number = 50
  ): Promise<PlexMediaItem[]> {
    try {
      const endpoint = sectionId
        ? `/library/sections/${sectionId}/recentlyAdded`
        : '/library/recentlyAdded';
      const response = await this.client.get(endpoint, {
        params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': limit },
      });
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOnDeck(limit: number = 50): Promise<PlexMediaItem[]> {
    try {
      const response = await this.client.get('/library/onDeck', {
        params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': limit },
      });
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getMediaItem(ratingKey: string): Promise<PlexMediaItem> {
    try {
      const response = await this.client.get(`/library/metadata/${ratingKey}`);
      const items = response.data.MediaContainer.Metadata;
      if (!items || items.length === 0) {
        throw new Error(`Media item not found: ${ratingKey}`);
      }
      return items[0];
    } catch (error) {
      this.handleError(error);
    }
  }

  // Client Operations
  async getClients(): Promise<PlexClient[]> {
    try {
      const response = await this.client.get('/clients');
      return response.data.MediaContainer.Server || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getActiveSessions(): Promise<PlexSession[]> {
    try {
      const response = await this.client.get('/status/sessions');
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  // Playback Control
  async playMedia(
    clientId: string,
    mediaKey: string,
    offset?: number
  ): Promise<void> {
    try {
      const params: Record<string, string | number> = {
        key: mediaKey,
        machineIdentifier: await this.getMachineIdentifier(),
      };
      if (offset !== undefined) {
        params.offset = offset;
      }

      await this.client.get(`/player/playback/playMedia`, {
        params,
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async pausePlayback(clientId: string): Promise<void> {
    try {
      await this.client.get('/player/playback/pause', {
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async resumePlayback(clientId: string): Promise<void> {
    try {
      await this.client.get('/player/playback/play', {
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async stopPlayback(clientId: string): Promise<void> {
    try {
      await this.client.get('/player/playback/stop', {
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async seekTo(clientId: string, offsetMs: number): Promise<void> {
    try {
      await this.client.get('/player/playback/seekTo', {
        params: { offset: offsetMs },
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async setVolume(clientId: string, level: number): Promise<void> {
    try {
      const volume = Math.max(0, Math.min(100, level));
      await this.client.get('/player/playback/setParameters', {
        params: { volume },
        headers: {
          'X-Plex-Target-Client-Identifier': clientId,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // History
  async getWatchHistory(
    accountId?: number,
    limit: number = 50
  ): Promise<PlexHistoryItem[]> {
    try {
      const params: Record<string, number> = {
        'X-Plex-Container-Start': 0,
        'X-Plex-Container-Size': limit,
      };
      if (accountId !== undefined) {
        params.accountID = accountId;
      }
      const response = await this.client.get('/status/sessions/history/all', {
        params,
      });
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getContinueWatching(limit: number = 50): Promise<PlexMediaItem[]> {
    try {
      const response = await this.client.get('/hubs/continueWatching/items', {
        params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': limit },
      });
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      // This endpoint might not exist on all Plex versions
      // Fall back to onDeck
      return this.getOnDeck(limit);
    }
  }

  // Playlists
  async getPlaylists(): Promise<PlexPlaylist[]> {
    try {
      const response = await this.client.get('/playlists');
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPlaylistItems(playlistKey: string): Promise<PlexMediaItem[]> {
    try {
      const response = await this.client.get(`${playlistKey}/items`);
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async createPlaylist(
    title: string,
    type: 'video' | 'audio' | 'photo',
    itemKeys?: string[]
  ): Promise<PlexPlaylist> {
    try {
      const machineId = await this.getMachineIdentifier();
      const params: Record<string, string> = {
        type,
        title,
        smart: '0',
        uri: itemKeys
          ? `server://${machineId}/com.plexapp.plugins.library/library/metadata/${itemKeys.join(',')}`
          : '',
      };

      const response = await this.client.post('/playlists', null, { params });
      const playlists = response.data.MediaContainer.Metadata;
      if (!playlists || playlists.length === 0) {
        throw new Error('Failed to create playlist');
      }
      return playlists[0];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addToPlaylist(playlistKey: string, itemKeys: string[]): Promise<void> {
    try {
      const machineId = await this.getMachineIdentifier();
      await this.client.put(`${playlistKey}/items`, null, {
        params: {
          uri: `server://${machineId}/com.plexapp.plugins.library/library/metadata/${itemKeys.join(',')}`,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeFromPlaylist(
    playlistKey: string,
    playlistItemId: string
  ): Promise<void> {
    try {
      await this.client.delete(`${playlistKey}/items/${playlistItemId}`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async deletePlaylist(playlistKey: string): Promise<void> {
    try {
      await this.client.delete(playlistKey);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Posters
  async getPosters(ratingKey: string): Promise<PlexPoster[]> {
    try {
      const response = await this.client.get(
        `/library/metadata/${ratingKey}/posters`
      );
      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async setSelectedPoster(ratingKey: string, posterKey: string): Promise<void> {
    try {
      await this.client.put(`/library/metadata/${ratingKey}/poster`, null, {
        params: { url: posterKey },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async uploadPoster(ratingKey: string, imageUrl: string): Promise<void> {
    try {
      await this.client.post(`/library/metadata/${ratingKey}/posters`, null, {
        params: { url: imageUrl },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async deletePoster(ratingKey: string, posterKey: string): Promise<void> {
    try {
      // The posterKey typically looks like /library/metadata/123/posters/456
      // We need to delete using the provider parameter
      await this.client.delete(`/library/metadata/${ratingKey}/posters`, {
        params: { url: posterKey },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // Helpers
  private async getMachineIdentifier(): Promise<string> {
    const info = await this.getServerInfo();
    return info.machineIdentifier;
  }
}

// Singleton instance
let plexClient: PlexApiClient | null = null;

export function getPlexClient(): PlexApiClient {
  if (!plexClient) {
    plexClient = new PlexApiClient();
  }
  return plexClient;
}
