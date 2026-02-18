# Plex MCP Server

A TypeScript-based MCP (Model Context Protocol) server that provides full control over a local Plex Media Server. Compatible with Claude Desktop, Claude Code, and other MCP clients.

## Features

### Core Capabilities

| Category | Tools | Description |
|----------|-------|-------------|
| **Library** | `search_library`, `get_library_sections`, `get_recently_added`, `get_on_deck` | Browse and search media |
| **Playback** | `play_media`, `pause`, `resume`, `stop`, `seek`, `set_volume`, `get_playback_status` | Control active sessions |
| **Clients** | `list_clients`, `get_active_sessions` | View connected devices |
| **History** | `get_watch_history`, `get_continue_watching` | View watch progress |
| **Playlists** | `list_playlists`, `get_playlist_items`, `create_playlist`, `add_to_playlist`, `remove_from_playlist`, `delete_playlist` | Manage playlists |
| **Posters** | `list_posters`, `get_current_poster`, `set_poster`, `delete_poster`, `upload_poster` | Manage media artwork |
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

## License

MIT
