// Plex API Response Types

export interface PlexMediaContainer<T> {
  MediaContainer: {
    size: number;
    [key: string]: T[] | number | string | undefined;
  };
}

export interface PlexServer {
  name: string;
  version: string;
  platform: string;
  platformVersion: string;
  machineIdentifier: string;
  myPlex: boolean;
  myPlexUsername?: string;
}

export interface PlexLibrarySection {
  key: string;
  title: string;
  type: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  refreshing: boolean;
}

export interface PlexMediaItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  titleSort?: string;
  originalTitle?: string;
  summary?: string;
  rating?: number;
  audienceRating?: number;
  year?: number;
  thumb?: string;
  art?: string;
  duration?: number;
  addedAt: number;
  updatedAt: number;
  viewCount?: number;
  lastViewedAt?: number;
  viewOffset?: number;
  // TV Show specific
  parentTitle?: string;
  grandparentTitle?: string;
  index?: number;
  parentIndex?: number;
  // Movie specific
  studio?: string;
  contentRating?: string;
  // Additional metadata
  Genre?: { tag: string }[];
  Director?: { tag: string }[];
  Role?: { tag: string }[];
}

export interface PlexClient {
  name: string;
  host: string;
  address: string;
  port: number;
  machineIdentifier: string;
  version: string;
  protocol: string;
  product: string;
  deviceClass: string;
  protocolVersion: string;
  protocolCapabilities: string;
}

export interface PlexSession {
  sessionKey: string;
  ratingKey: string;
  key: string;
  type: string;
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  thumb?: string;
  duration: number;
  viewOffset: number;
  User: {
    id: string;
    title: string;
    thumb?: string;
  };
  Player: {
    address: string;
    device: string;
    machineIdentifier: string;
    model: string;
    platform: string;
    platformVersion: string;
    product: string;
    profile: string;
    state: 'playing' | 'paused' | 'buffering';
    title: string;
    version: string;
    local: boolean;
  };
  Session?: {
    id: string;
    bandwidth: number;
    location: string;
  };
}

export interface PlexPlaylist {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  summary?: string;
  smart: boolean;
  playlistType: string;
  composite?: string;
  duration: number;
  leafCount: number;
  addedAt: number;
  updatedAt: number;
}

export interface PlexPoster {
  key: string;
  ratingKey: string;
  selected: boolean;
  thumb: string;
  provider?: string;
}

export interface PlexHistoryItem {
  historyKey: string;
  key: string;
  ratingKey: string;
  title: string;
  type: string;
  thumb?: string;
  parentTitle?: string;
  grandparentTitle?: string;
  index?: number;
  parentIndex?: number;
  viewedAt: number;
  accountID: number;
  deviceID: number;
}

// Tool Response Types

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

// State

export interface ServerState {
  readOnlyMode: boolean;
}
