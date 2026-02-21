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
  PlexWatchlistItem,
  PlexFriend,
  PlexSharedServer,
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
      // For locally uploaded posters, the listing returns an internal path like
      // /library/metadata/{id}/file?url=upload%3A%2F%2Fposters%2F{hash}.
      // The delete endpoint requires the bare upload:// URL as the `url`
      // parameter, so extract it from the query string when present.
      let deleteKey = posterKey;
      if (posterKey.startsWith('/')) {
        const qsIndex = posterKey.indexOf('?');
        if (qsIndex !== -1) {
          const params = new URLSearchParams(posterKey.slice(qsIndex + 1));
          const innerUrl = params.get('url');
          if (innerUrl && innerUrl.startsWith('upload://')) {
            deleteKey = innerUrl;
          }
        }
      }
      await this.client.delete(`/library/metadata/${ratingKey}/posters`, {
        params: { url: deleteKey },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // Library Management
  async scanLibrary(sectionId: string): Promise<void> {
    try {
      await this.client.get(`/library/sections/${sectionId}/refresh`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async refreshMetadata(ratingKey: string, force: boolean = false): Promise<void> {
    try {
      await this.client.put(`/library/metadata/${ratingKey}/refresh`, null, {
        params: force ? { force: 1 } : {},
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async analyzeMedia(ratingKey: string): Promise<void> {
    try {
      await this.client.put(`/library/metadata/${ratingKey}/analyze`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async emptyTrash(sectionId?: string): Promise<void> {
    try {
      if (sectionId) {
        await this.client.put(`/library/sections/${sectionId}/emptyTrash`);
      } else {
        // Empty trash for all sections
        const sections = await this.getLibrarySections();
        for (const section of sections) {
          await this.client.put(`/library/sections/${section.key}/emptyTrash`);
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async cleanBundles(): Promise<void> {
    try {
      await this.client.put('/library/clean/bundles');
    } catch (error) {
      this.handleError(error);
    }
  }

  async optimizeDatabase(): Promise<void> {
    try {
      await this.client.put('/library/optimize');
    } catch (error) {
      this.handleError(error);
    }
  }

  // Watchlist (requires Plex.tv metadata provider API)
  private async metadataProviderRequest(
    method: 'get' | 'put' | 'delete',
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const plexToken = process.env.PLEX_TOKEN;
    const response = await axios({
      method,
      url: `https://metadata.provider.plex.tv${endpoint}`,
      headers: {
        'X-Plex-Token': plexToken,
        'X-Plex-Client-Identifier': 'plex-mcp-server',
        Accept: 'application/json',
      },
      params,
    });
    return response.data;
  }

  async searchCatalog(
    query: string,
    type?: 'movie' | 'show',
    limit: number = 10
  ): Promise<PlexWatchlistItem[]> {
    try {
      const params: Record<string, unknown> = { query, limit };
      if (type) {
        params.searchTypes = type;
      }
      const data = await this.metadataProviderRequest('get', '/library/search', params) as {
        MediaContainer?: { SearchResult?: Array<{ Metadata?: PlexWatchlistItem }> };
      };
      const results = data?.MediaContainer?.SearchResult || [];
      return results
        .map((r) => r.Metadata)
        .filter((m): m is PlexWatchlistItem => m !== undefined);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getWatchlist(limit: number = 50): Promise<PlexWatchlistItem[]> {
    try {
      const data = await this.metadataProviderRequest('get', '/library/sections/watchlist/all', {
        'X-Plex-Container-Start': 0,
        'X-Plex-Container-Size': limit,
      }) as { MediaContainer?: { Metadata?: PlexWatchlistItem[] } };
      return data?.MediaContainer?.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addToWatchlist(ratingKey: string): Promise<void> {
    try {
      // ratingKey should be the Plex GUID (e.g. from the item's guid field)
      await this.metadataProviderRequest('put', '/actions/addToWatchlist', {
        ratingKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeFromWatchlist(ratingKey: string): Promise<void> {
    try {
      await this.metadataProviderRequest('put', '/actions/removeFromWatchlist', {
        ratingKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // Friends and Sharing (requires Plex.tv API)
  private async plexTvRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const plexToken = process.env.PLEX_TOKEN;
    const response = await axios({
      method,
      url: `https://plex.tv/api/v2${endpoint}`,
      headers: {
        'X-Plex-Token': plexToken,
        'X-Plex-Client-Identifier': 'plex-mcp-server',
        Accept: 'application/json',
      },
      params,
    });
    return response.data;
  }

  async getFriends(): Promise<PlexFriend[]> {
    try {
      const data = await this.plexTvRequest('get', '/friends') as PlexFriend[];
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getFriend(friendId: string): Promise<PlexFriend> {
    try {
      const data = await this.plexTvRequest('get', `/friends/${friendId}`) as PlexFriend;
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSharedServers(): Promise<PlexSharedServer[]> {
    try {
      const data = await this.plexTvRequest('get', '/resources', {
        includeSharedServers: 1,
      }) as PlexSharedServer[];
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async shareLibrary(
    friendId: string,
    sectionIds: string[],
    options: {
      allowSync?: boolean;
      allowCameraUpload?: boolean;
      allowChannels?: boolean;
      filterMovies?: string;
      filterTelevision?: string;
      filterMusic?: string;
    } = {}
  ): Promise<void> {
    try {
      const machineId = await this.getMachineIdentifier();
      await this.plexTvRequest('post', `/servers/${machineId}/shared_servers`, {
        invitedId: friendId,
        librarySectionIds: sectionIds.join(','),
        ...options,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateShare(
    friendId: string,
    options: {
      sectionIds?: string[];
      allowSync?: boolean;
      allowCameraUpload?: boolean;
      allowChannels?: boolean;
    }
  ): Promise<void> {
    try {
      const machineId = await this.getMachineIdentifier();
      const params: Record<string, unknown> = {};
      if (options.sectionIds) params.librarySectionIds = options.sectionIds.join(',');
      if (options.allowSync !== undefined) params.allowSync = options.allowSync;
      if (options.allowCameraUpload !== undefined) params.allowCameraUpload = options.allowCameraUpload;
      if (options.allowChannels !== undefined) params.allowChannels = options.allowChannels;

      await this.plexTvRequest('put', `/servers/${machineId}/shared_servers/${friendId}`, params);
    } catch (error) {
      this.handleError(error);
    }
  }

  async unshareLibrary(friendId: string): Promise<void> {
    try {
      const machineId = await this.getMachineIdentifier();
      await this.plexTvRequest('delete', `/servers/${machineId}/shared_servers/${friendId}`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async inviteFriend(email: string, sectionIds: string[]): Promise<void> {
    try {
      const machineId = await this.getMachineIdentifier();
      await this.plexTvRequest('post', `/servers/${machineId}/shared_servers`, {
        invitedEmail: email,
        librarySectionIds: sectionIds.join(','),
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // Advanced Search
  async advancedSearch(filters: Record<string, unknown>): Promise<PlexMediaItem[]> {
    try {
      // Determine the section to search
      let sectionId = filters.sectionId as string | undefined;

      if (!sectionId) {
        // Find the appropriate section based on type
        const sections = await this.getLibrarySections();
        const type = filters.type as string;

        if (type === 'movie') {
          const movieSection = sections.find((s) => s.type === 'movie');
          sectionId = movieSection?.key;
        } else if (type === 'show' || type === 'episode') {
          const showSection = sections.find((s) => s.type === 'show');
          sectionId = showSection?.key;
        } else if (type === 'artist' || type === 'album' || type === 'track') {
          const musicSection = sections.find((s) => s.type === 'artist');
          sectionId = musicSection?.key;
        }
      }

      if (!sectionId) {
        throw new Error('Could not determine library section for search');
      }

      // Build Plex filter parameters
      const params: Record<string, string | number> = {
        type: this.getPlexTypeNumber(filters.type as string),
      };

      // Title filter
      if (filters.title) {
        params['title'] = filters.title as string;
      }

      // Year filters
      if (filters.year) {
        params['year'] = filters.year as number;
      }
      if (filters.minYear || filters.maxYear) {
        const min = (filters.minYear as number) || 1800;
        const max = (filters.maxYear as number) || new Date().getFullYear();
        params['year>>'] = min;
        params['year<<'] = max;
      }
      if (filters.decade) {
        const decade = filters.decade as number;
        params['year>>'] = decade;
        params['year<<'] = decade + 9;
      }

      // Rating filters
      if (filters.minRating) {
        params['rating>>'] = filters.minRating as number;
      }
      if (filters.maxRating) {
        params['rating<<'] = filters.maxRating as number;
      }

      // Genre filter
      if (filters.genre) {
        params['genre'] = filters.genre as string;
      }

      // Content rating
      if (filters.contentRating) {
        params['contentRating'] = filters.contentRating as string;
      }

      // Director filter
      if (filters.director) {
        params['director'] = filters.director as string;
      }

      // Actor filter
      if (filters.actor) {
        params['actor'] = filters.actor as string;
      }

      // Studio filter
      if (filters.studio) {
        params['studio'] = filters.studio as string;
      }

      // Watch status filters
      if (filters.unwatched) {
        params['unwatched'] = 1;
      }
      if (filters.watched) {
        params['viewCount>>'] = 0;
      }
      if (filters.inProgress) {
        params['inProgress'] = 1;
      }

      // Duration filters (convert minutes to milliseconds)
      if (filters.minDuration) {
        params['duration>>'] = (filters.minDuration as number) * 60 * 1000;
      }
      if (filters.maxDuration) {
        params['duration<<'] = (filters.maxDuration as number) * 60 * 1000;
      }

      // Recently added filter
      if (filters.addedWithin) {
        const daysAgo = filters.addedWithin as number;
        const timestamp = Math.floor((Date.now() - daysAgo * 24 * 60 * 60 * 1000) / 1000);
        params['addedAt>>'] = timestamp;
      }

      // Resolution filter
      if (filters.resolution) {
        const res = filters.resolution as string;
        if (res === '4k') {
          params['videoResolution'] = '4k';
        } else if (res === 'hd') {
          params['videoResolution'] = '1080';
        }
      }

      // Sorting
      let sortField = 'titleSort';
      let sortDir = 'asc';

      if (filters.sort) {
        const sortMap: Record<string, string> = {
          titleSort: 'titleSort',
          year: 'year',
          rating: 'rating',
          addedAt: 'addedAt',
          lastViewedAt: 'lastViewedAt',
          duration: 'duration',
          random: 'random',
        };
        sortField = sortMap[filters.sort as string] || 'titleSort';
      }
      if (filters.sortOrder === 'desc') {
        sortDir = 'desc';
      }
      params['sort'] = `${sortField}:${sortDir}`;

      // Limit
      params['X-Plex-Container-Start'] = 0;
      params['X-Plex-Container-Size'] = (filters.limit as number) || 25;

      const response = await this.client.get(`/library/sections/${sectionId}/all`, {
        params,
      });

      return response.data.MediaContainer.Metadata || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  private getPlexTypeNumber(type: string): number {
    const typeMap: Record<string, number> = {
      movie: 1,
      show: 2,
      season: 3,
      episode: 4,
      trailer: 5,
      comic: 6,
      person: 7,
      artist: 8,
      album: 9,
      track: 10,
      photo: 11,
      clip: 12,
      photo_album: 13,
    };
    return typeMap[type] || 1;
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
