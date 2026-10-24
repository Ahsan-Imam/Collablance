# CollabLance Context MCP Server

A **Model Context Protocol** (MCP) server that gives AI tools real-time visibility into your team's shared context board.

## What it does

When any team member posts context on the CollabLance board (what they're building, their blockers, decisions, goals), this MCP server makes it instantly available to your AI tools. Ask Claude, Cursor, or Antigravity — they'll know what the whole team is working on.

## Tools

| Tool | Description |
|------|-------------|
| `get_team_context` | All cards from the team board |
| `get_context_by_section` | Cards filtered by section (building / goals / blockers / decisions / perspective / notes) |
| `get_member_context` | All cards from a specific team member |
| `get_context_summary` | AI-friendly structured summary, organized by member |
| `post_my_context` | Post a new context card programmatically |

## Setup

### 1. Install dependencies

```bash
cd mcp-server
npm install
```

### 2. Set environment variables

Copy `SUPABASE_*` values from `.env.local`. Get your Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey) (free tier available):

```bash
export COLLABLANCE_SUPABASE_URL="https://prmtsttdgwewgxiwvhev.supabase.co"
export COLLABLANCE_SUPABASE_ANON_KEY="eyJ..."
export GEMINI_API_KEY="AIza..."
```

### 3. Configure your AI tool

#### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "collablance-context": {
      "command": "node",
      "args": ["/Users/talatnaaz/collab_new/mcp-server/index.js"],
      "env": {
        "COLLABLANCE_SUPABASE_URL": "https://prmtsttdgwewgxiwvhev.supabase.co",
        "COLLABLANCE_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

#### Antigravity IDE (`~/.gemini/config/mcp_config.json`)

```json
{
  "mcpServers": {
    "collablance-context": {
      "command": "node",
      "args": ["/Users/talatnaaz/collab_new/mcp-server/index.js"],
      "env": {
        "COLLABLANCE_SUPABASE_URL": "https://prmtsttdgwewgxiwvhev.supabase.co",
        "COLLABLANCE_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

#### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "collablance-context": {
      "command": "node",
      "args": ["/Users/talatnaaz/collab_new/mcp-server/index.js"],
      "env": {
        "COLLABLANCE_SUPABASE_URL": "https://prmtsttdgwewgxiwvhev.supabase.co",
        "COLLABLANCE_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

### 4. Test it

```bash
node index.js
# In another terminal:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | node index.js
```

## Usage in AI tools

Once connected, you can ask:
- *"What is the team building right now?"*
- *"What blockers does the team have?"*
- *"Summarize what everyone is working on."*
- *"What decisions has Sarah made recently?"*

The AI tool will call `get_context_summary` or `get_team_context` automatically.
