import axios, { AxiosInstance, AxiosError } from 'axios';

export interface TautulliActivity {
  sessions: TautulliSession[];
  streamCount: number;
  streamCountDirectPlay: number;
  streamCountDirectStream: number;
  streamCountTranscode: number;
  totalBandwidth: number;
  lanBandwidth: number;
  wanBandwidth: number;
}

export interface TautulliSession {
  sessionKey: string;
  mediaType: string;
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  thumb?: string;
  user: string;
  userId: string;
  friendlyName: string;
  player: string;
  product: string;
  platform: string;
  ipAddress: string;
  state: string;
  progressPercent: number;
  duration: number;
  viewOffset: number;
  streamBitrate: number;
  videoResolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  transcodeDecision: string;
  transcodeProgress?: number;
  transcodeSpeed?: string;
  bandwidth: number;
  location: string;
  relayed: boolean;
  secure: boolean;
}

export interface TautulliHistoryItem {
  referenceId: number;
  date: number;
  started: number;
  stopped: number;
  duration: number;
  pausedCounter: number;
  user: string;
  userId: string;
  friendlyName: string;
  platform: string;
  product: string;
  player: string;
  ipAddress: string;
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  mediaType: string;
  ratingKey: string;
  thumbUrl?: string;
  percentComplete: number;
  watchedStatus: number;
  transcodeDecision: string;
}

export interface TautulliLibraryStats {
  sectionId: string;
  sectionName: string;
  sectionType: string;
  count: number;
  parentCount?: number;
  childCount?: number;
  duration: number;
  durationStr: string;
  lastAccessed?: number;
  lastPlayed?: string;
  plays: number;
}

export interface TautulliUserStats {
  rowId: number;
  friendlyName: string;
  username: string;
  userId: string;
  email?: string;
  isActive: boolean;
  isAdmin: boolean;
  thumb?: string;
  totalPlays: number;
  totalDuration: number;
  lastSeen?: number;
  lastPlayed?: string;
}

export interface TautulliMostWatched {
  rowId: number;
  ratingKey: string;
  title: string;
  grandparentTitle?: string;
  year?: number;
  mediaType: string;
  thumb?: string;
  totalPlays: number;
  totalDuration: number;
  usersWatched: number;
  lastPlay?: number;
}

export interface TautulliServerStats {
  totalSize: number;
  totalDuration: number;
  movieCount: number;
  showCount: number;
  seasonCount: number;
  episodeCount: number;
  artistCount: number;
  albumCount: number;
  trackCount: number;
}

export class TautulliClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    const tautulliUrl = process.env.TAUTULLI_URL;
    const tautulliApiKey = process.env.TAUTULLI_API_KEY;

    if (!tautulliUrl || !tautulliApiKey) {
      throw new Error(
        'TAUTULLI_URL and TAUTULLI_API_KEY environment variables are required for Tautulli integration'
      );
    }

    this.baseUrl = tautulliUrl;
    this.client = axios.create({
      baseURL: tautulliUrl,
      params: {
        apikey: tautulliApiKey,
      },
    });
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      if (error.response) {
        throw new Error(
          `Tautulli API error: ${error.response.status} - ${error.response.data?.response?.message || error.response.statusText}`
        );
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to Tautulli at ${this.baseUrl}. Is Tautulli running?`
        );
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }

  private async apiCall(cmd: string, params: Record<string, unknown> = {}): Promise<unknown> {
    try {
      const response = await this.client.get('/api/v2', {
        params: {
          cmd,
          ...params,
        },
      });

      if (response.data.response.result !== 'success') {
        throw new Error(response.data.response.message || 'Tautulli API call failed');
      }

      return response.data.response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getActivity(): Promise<TautulliActivity> {
    const data = await this.apiCall('get_activity') as Record<string, unknown>;
    return {
      sessions: (data.sessions as Record<string, unknown>[]).map((s) => this.mapSession(s)),
      streamCount: data.stream_count as number,
      streamCountDirectPlay: data.stream_count_direct_play as number,
      streamCountDirectStream: data.stream_count_direct_stream as number,
      streamCountTranscode: data.stream_count_transcode as number,
      totalBandwidth: data.total_bandwidth as number,
      lanBandwidth: data.lan_bandwidth as number,
      wanBandwidth: data.wan_bandwidth as number,
    };
  }

  private mapSession(session: Record<string, unknown>): TautulliSession {
    return {
      sessionKey: session.session_key as string,
      mediaType: session.media_type as string,
      title: session.title as string,
      grandparentTitle: session.grandparent_title as string | undefined,
      parentTitle: session.parent_title as string | undefined,
      year: session.year as number | undefined,
      thumb: session.thumb as string | undefined,
      user: session.user as string,
      userId: session.user_id as string,
      friendlyName: session.friendly_name as string,
      player: session.player as string,
      product: session.product as string,
      platform: session.platform as string,
      ipAddress: session.ip_address as string,
      state: session.state as string,
      progressPercent: session.progress_percent as number,
      duration: session.duration as number,
      viewOffset: session.view_offset as number,
      streamBitrate: session.stream_bitrate as number,
      videoResolution: session.stream_video_resolution as string | undefined,
      videoCodec: session.stream_video_codec as string | undefined,
      audioCodec: session.stream_audio_codec as string | undefined,
      transcodeDecision: session.transcode_decision as string,
      transcodeProgress: session.transcode_progress as number | undefined,
      transcodeSpeed: session.transcode_speed as string | undefined,
      bandwidth: session.bandwidth as number,
      location: session.location as string,
      relayed: session.relayed as boolean,
      secure: session.secure as boolean,
    };
  }

  async getHistory(
    options: {
      userId?: string;
      sectionId?: string;
      mediaType?: string;
      startDate?: string;
      length?: number;
      start?: number;
    } = {}
  ): Promise<TautulliHistoryItem[]> {
    const params: Record<string, unknown> = {
      length: options.length || 25,
      start: options.start || 0,
    };
    if (options.userId) params.user_id = options.userId;
    if (options.sectionId) params.section_id = options.sectionId;
    if (options.mediaType) params.media_type = options.mediaType;
    if (options.startDate) params.start_date = options.startDate;

    const data = await this.apiCall('get_history', params) as { data: Record<string, unknown>[] };
    return data.data.map((item) => ({
      referenceId: item.reference_id as number,
      date: item.date as number,
      started: item.started as number,
      stopped: item.stopped as number,
      duration: item.duration as number,
      pausedCounter: item.paused_counter as number,
      user: item.user as string,
      userId: item.user_id as string,
      friendlyName: item.friendly_name as string,
      platform: item.platform as string,
      product: item.product as string,
      player: item.player as string,
      ipAddress: item.ip_address as string,
      title: item.title as string,
      grandparentTitle: item.grandparent_title as string | undefined,
      parentTitle: item.parent_title as string | undefined,
      year: item.year as number | undefined,
      mediaType: item.media_type as string,
      ratingKey: item.rating_key as string,
      thumbUrl: item.thumb as string | undefined,
      percentComplete: item.percent_complete as number,
      watchedStatus: item.watched_status as number,
      transcodeDecision: item.transcode_decision as string,
    }));
  }

  async getLibrariesTable(): Promise<TautulliLibraryStats[]> {
    const data = await this.apiCall('get_libraries_table') as { data: Record<string, unknown>[] };
    return data.data.map((lib) => ({
      sectionId: lib.section_id as string,
      sectionName: lib.section_name as string,
      sectionType: lib.section_type as string,
      count: lib.count as number,
      parentCount: lib.parent_count as number | undefined,
      childCount: lib.child_count as number | undefined,
      duration: lib.duration as number,
      durationStr: lib.duration as string,
      lastAccessed: lib.last_accessed as number | undefined,
      lastPlayed: lib.last_played as string | undefined,
      plays: lib.plays as number,
    }));
  }

  async getUsersTable(): Promise<TautulliUserStats[]> {
    const data = await this.apiCall('get_users_table') as { data: Record<string, unknown>[] };
    return data.data.map((user) => ({
      rowId: user.row_id as number,
      friendlyName: user.friendly_name as string,
      username: user.username as string,
      userId: user.user_id as string,
      email: user.email as string | undefined,
      isActive: user.is_active === 1,
      isAdmin: user.is_admin === 1,
      thumb: user.thumb as string | undefined,
      totalPlays: user.plays as number,
      totalDuration: user.duration as number,
      lastSeen: user.last_seen as number | undefined,
      lastPlayed: user.last_played as string | undefined,
    }));
  }

  async getMostWatchedMovies(
    timeRange?: number,
    limit: number = 10
  ): Promise<TautulliMostWatched[]> {
    const params: Record<string, unknown> = { stats_count: limit };
    if (timeRange) params.time_range = timeRange;

    const data = await this.apiCall('get_home_stats', {
      ...params,
      stat_id: 'top_movies',
    }) as { rows: Record<string, unknown>[] };

    return (data.rows || []).map((item) => ({
      rowId: item.row_id as number,
      ratingKey: item.rating_key as string,
      title: item.title as string,
      year: item.year as number | undefined,
      mediaType: 'movie',
      thumb: item.thumb as string | undefined,
      totalPlays: item.total_plays as number,
      totalDuration: item.total_duration as number,
      usersWatched: item.users_watched as number,
      lastPlay: item.last_play as number | undefined,
    }));
  }

  async getMostWatchedShows(
    timeRange?: number,
    limit: number = 10
  ): Promise<TautulliMostWatched[]> {
    const params: Record<string, unknown> = { stats_count: limit };
    if (timeRange) params.time_range = timeRange;

    const data = await this.apiCall('get_home_stats', {
      ...params,
      stat_id: 'top_tv',
    }) as { rows: Record<string, unknown>[] };

    return (data.rows || []).map((item) => ({
      rowId: item.row_id as number,
      ratingKey: item.rating_key as string,
      title: item.title as string,
      year: item.year as number | undefined,
      mediaType: 'show',
      thumb: item.thumb as string | undefined,
      totalPlays: item.total_plays as number,
      totalDuration: item.total_duration as number,
      usersWatched: item.users_watched as number,
      lastPlay: item.last_play as number | undefined,
    }));
  }

  async getMostActiveUsers(
    timeRange?: number,
    limit: number = 10
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, unknown> = { stats_count: limit };
    if (timeRange) params.time_range = timeRange;

    const data = await this.apiCall('get_home_stats', {
      ...params,
      stat_id: 'top_users',
    }) as { rows: Record<string, unknown>[] };

    return data.rows || [];
  }

  async getPlaysByDate(
    timeRange: number = 30,
    userId?: string
  ): Promise<{ date: string; plays: number }[]> {
    const params: Record<string, unknown> = { time_range: timeRange };
    if (userId) params.user_id = userId;

    const data = await this.apiCall('get_plays_by_date', params) as {
      categories: string[];
      series: { name: string; data: number[] }[];
    };

    const dates = data.categories;
    const totalPlays = data.series.find((s) => s.name === 'Movies')?.data || [];
    const tvPlays = data.series.find((s) => s.name === 'TV')?.data || [];

    return dates.map((date, i) => ({
      date,
      plays: (totalPlays[i] || 0) + (tvPlays[i] || 0),
    }));
  }

  async getServerStats(): Promise<TautulliServerStats> {
    const data = await this.apiCall('get_library_media_info', {
      section_id: '',
      refresh: false,
    }) as Record<string, unknown>;

    // This is a simplified version - actual implementation would aggregate across libraries
    return {
      totalSize: 0,
      totalDuration: 0,
      movieCount: 0,
      showCount: 0,
      seasonCount: 0,
      episodeCount: 0,
      artistCount: 0,
      albumCount: 0,
      trackCount: 0,
    };
  }

  async getStreamTypeByMonth(
    timeRange: number = 12
  ): Promise<{ month: string; directPlay: number; directStream: number; transcode: number }[]> {
    const data = await this.apiCall('get_plays_by_stream_type', {
      time_range: timeRange,
      y_axis: 'plays',
    }) as {
      categories: string[];
      series: { name: string; data: number[] }[];
    };

    const months = data.categories;
    const directPlay = data.series.find((s) => s.name === 'Direct Play')?.data || [];
    const directStream = data.series.find((s) => s.name === 'Direct Stream')?.data || [];
    const transcode = data.series.find((s) => s.name === 'Transcode')?.data || [];

    return months.map((month, i) => ({
      month,
      directPlay: directPlay[i] || 0,
      directStream: directStream[i] || 0,
      transcode: transcode[i] || 0,
    }));
  }
}

// Singleton instance
let tautulliClient: TautulliClient | null = null;

export function getTautulliClient(): TautulliClient {
  if (!tautulliClient) {
    tautulliClient = new TautulliClient();
  }
  return tautulliClient;
}

export function isTautulliConfigured(): boolean {
  return !!(process.env.TAUTULLI_URL && process.env.TAUTULLI_API_KEY);
}
