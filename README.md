# Plex MCP Server

A TypeScript-based MCP (Model Context Protocol) server that provides full control over a local Plex Media Server. Compatible with Claude Desktop, Claude Code, and other MCP clients.

## Features

### Core Capabilities

| Category | Tools | Description |
|----------|-------|-------------|
| **Library** | `search_library`, `get_library_sections`, `get_recently_added`, `get_on_deck` | Browse and search media |
| **Smart Search** | `smart_search`, `advanced_search` | Natural language and filtered search |
| **Library Management** | `scan_library`, `refresh_metadata`, `analyze_media`, `empty_trash`, `clean_bundles`, `optimize_database` | Library maintenance |
| **Playback** | `play_media`, `pause`, `resume`, `stop`, `seek`, `set_volume`, `get_playback_status` | Control active sessions |
| **Clients** | `list_clients`, `get_active_sessions` | View connected devices |
| **History** | `get_watch_history`, `get_continue_watching` | View watch progress |
| **Playlists** | `list_playlists`, `get_playlist_items`, `create_playlist`, `add_to_playlist`, `remove_from_playlist`, `delete_playlist` | Manage playlists |
| **Posters** | `list_posters`, `get_current_poster`, `set_poster`, `delete_poster`, `upload_poster` | Manage media artwork |
| **Sharing** | `list_friends`, `get_friend`, `share_library`, `update_share`, `unshare_library`, `invite_friend` | Manage library sharing |
| **Tautulli** | `tautulli_activity`, `tautulli_history`, `tautulli_most_watched`, `tautulli_user_stats`, etc. | Advanced statistics |
| **System** | `get_server_info`, `set_read_only_mode`, `get_mode` | Server status and mode control |

### Read-Only Mode

When enabled via `set_read_only_mode(true)`:
- All read operations continue to work (search, browse, history, status)
- Write/control operations are blocked (playback control, playlist modifications, poster changes)
- Mode persists until toggled off

## Installation

### Prerequisites

- Node.js 18+
- A running Plex Media Server
- Plex authentication token

### Setup

1. Clone or download this repository

2. Install dependencies:
   ```bash
   cd plex-mcp-server
   npm install
   ```

3. Build the TypeScript:
   ```bash
   npm run build
   ```

4. Create a `.env` file (or use environment variables):
   ```bash
   cp .env.example .env
   # Edit .env with your Plex URL and token
   ```

### Getting Your Plex Token

1. Open Plex Web App and sign in
2. Browse to any media item
3. Click the "..." menu and select "Get Info"
4. Click "View XML"
5. In the URL, find `X-Plex-Token=YOUR_TOKEN_HERE`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLEX_URL` | URL of your Plex server | `http://localhost:32400` |
| `PLEX_TOKEN` | Your Plex authentication token | (required) |
| `READ_ONLY_MODE` | Start in read-only mode | `false` |
| `TAUTULLI_URL` | URL of your Tautulli server (optional) | - |
| `TAUTULLI_API_KEY` | Tautulli API key (optional) | - |

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "plex": {
      "command": "node",
      "args": ["/path/to/plex-mcp-server/dist/index.js"],
      "env": {
        "PLEX_URL": "http://localhost:32400",
        "PLEX_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "plex": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/plex-mcp-server",
      "env": {
        "PLEX_URL": "http://localhost:32400",
        "PLEX_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Usage Examples

Once configured, you can interact naturally with Claude:

### Library Browsing
- "What movies were recently added to Plex?"
- "Search for 'The Matrix' in my library"
- "Show me my TV show library sections"
- "What's on deck for me to watch?"

### Playback Control
- "What devices are connected to Plex?"
- "Play Inception on my living room TV"
- "Pause playback"
- "Skip forward 5 minutes"
- "Set volume to 50%"
- "What's currently playing on Plex?"

### Playlists
- "Show me all my playlists"
- "Create a new movie playlist called 'Weekend Watch'"
- "Add The Dark Knight to my Weekend Watch playlist"
- "Delete the old test playlist"

### Posters
- "Show me all posters for The Dark Knight"
- "Change the poster for Inception"
- "Upload a new poster for Breaking Bad from this URL"
- "Delete the old posters for a movie"

### Smart Search (Natural Language)
- "Find unwatched sci-fi movies from the 90s"
- "Show me comedy shows rated above 8"
- "What 4k movies haven't I watched?"
- "Find action movies added in the last week"
- "Show me short films under 90 minutes"

### Library Management
- "Scan my Movies library for new content"
- "Refresh metadata for Inception"
- "Analyze The Matrix for intro detection"
- "Optimize the Plex database"
- "Empty the trash"

### Library Sharing
- "Who am I sharing my library with?"
- "Share my Movies library with john@example.com"
- "Remove sharing access for a friend"
- "What sections is my friend allowed to see?"

### Tautulli Statistics
- "What's currently streaming on Plex?"
- "Show me the most watched movies this month"
- "Who are my most active users?"
- "What's my transcode vs direct play ratio?"
- "Show play statistics for the last 30 days"

### System
- "Get Plex server info"
- "Enable read-only mode"
- "What mode is the server in?"

## Available Tools

### Library Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `search_library` | Search for media by title/keyword | Yes |
| `get_library_sections` | List all library sections | Yes |
| `get_recently_added` | Get recently added items | Yes |
| `get_on_deck` | Get items ready to continue | Yes |

### Playback Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `play_media` | Start playing media on a client | No |
| `pause` | Pause playback | No |
| `resume` | Resume playback | No |
| `stop` | Stop playback | No |
| `seek` | Seek to position | No |
| `set_volume` | Set volume level | No |
| `get_playback_status` | Get current playback info | Yes |

### Client Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `list_clients` | List connected clients | Yes |
| `get_active_sessions` | Get active playback sessions | Yes |

### Playlist Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `list_playlists` | List all playlists | Yes |
| `get_playlist_items` | Get items in a playlist | Yes |
| `create_playlist` | Create new playlist | No |
| `add_to_playlist` | Add items to playlist | No |
| `remove_from_playlist` | Remove item from playlist | No |
| `delete_playlist` | Delete a playlist | No |

### Poster Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `list_posters` | List available posters | Yes |
| `get_current_poster` | Get selected poster | Yes |
| `set_poster` | Change selected poster | No |
| `delete_poster` | Delete a poster | No |
| `upload_poster` | Upload poster from URL | No |

### System Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `get_server_info` | Get Plex server information | Yes |
| `set_read_only_mode` | Toggle read-only mode | N/A |
| `get_mode` | Get current mode | Yes |
| `get_watch_history` | Get watch history | Yes |
| `get_continue_watching` | Get in-progress items | Yes |

### Smart Search Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `smart_search` | Natural language search (e.g., "unwatched 90s sci-fi") | Yes |
| `advanced_search` | Search with precise filters (year, rating, genre, etc.) | Yes |

### Library Management Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `scan_library` | Trigger a library scan for new content | No |
| `refresh_metadata` | Refresh metadata for a specific item | No |
| `analyze_media` | Analyze media for intros/chapters | No |
| `empty_trash` | Empty trash for a section or all | No |
| `clean_bundles` | Clean up old metadata bundles | No |
| `optimize_database` | Optimize the Plex database | No |

### Sharing Tools

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `list_friends` | List all Plex friends | Yes |
| `get_friend` | Get details about a friend | Yes |
| `get_shared_servers` | Get shared server configurations | Yes |
| `share_library` | Share library sections with a friend | No |
| `update_share` | Update sharing settings | No |
| `unshare_library` | Remove sharing access | No |
| `invite_friend` | Invite someone by email | No |

### Tautulli Tools (requires Tautulli)

| Tool | Description | Read-Only Safe |
|------|-------------|----------------|
| `tautulli_activity` | Real-time streaming activity | Yes |
| `tautulli_history` | Detailed watch history | Yes |
| `tautulli_library_stats` | Library statistics | Yes |
| `tautulli_user_stats` | User statistics | Yes |
| `tautulli_most_watched` | Most watched movies/shows | Yes |
| `tautulli_most_active_users` | Most active users ranking | Yes |
| `tautulli_plays_by_date` | Play counts over time | Yes |
| `tautulli_stream_type_stats` | Direct play vs transcode stats | Yes |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Run directly
npm start
```

## Troubleshooting

### Cannot connect to Plex server
- Verify `PLEX_URL` is correct and the server is running
- Check that your Plex token is valid
- Ensure the server is accessible from where you're running the MCP server

### Playback controls not working
- The target client must be connected and reachable
- Use `list_clients` to find the correct `machineIdentifier`
- Some clients may not support all playback commands

### Read-only mode errors
- Use `get_mode` to check current mode
- Use `set_read_only_mode(false)` to disable read-only mode

### Tautulli not working
- Verify `TAUTULLI_URL` and `TAUTULLI_API_KEY` are set correctly
- Check that Tautulli is running and accessible
- Find your API key in Tautulli Settings > Web Interface > API Key

### Sharing tools not working
- Sharing features require your Plex token to have access to plex.tv APIs
- Ensure your Plex account is properly linked

## License

MIT
