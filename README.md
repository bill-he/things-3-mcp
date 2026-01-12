# Things3 MCP Server

A Model Context Protocol (MCP) server that provides integration with [Things3](https://culturedcode.com/things/) task management app for macOS.

## Features

- **Create Todos**: Add new tasks with titles, notes, dates, tags, and more
- **List Todos**: Query tasks by list type (Today, Upcoming, Inbox, etc.)
- **Search Todos**: Search tasks by title or notes
- **Update Todos**: Modify existing tasks
- **Complete Todos**: Mark tasks as done
- **List Projects/Areas**: Get all projects and areas
- **List Tags**: Get all available tags

## How It Works

This MCP server uses a hybrid approach:
- **Things3 URL Scheme**: For creating and updating tasks (write operations)
- **SQLite Database**: For reading and querying existing tasks (read operations)

The server directly reads from Things3's SQLite database located at:
```
~/Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/ThingsData-xxxxx/Things Database.thingsdatabase/main.sqlite
```

## Prerequisites

- macOS
- [Things3](https://culturedcode.com/things/) installed and configured
- Node.js 18 or higher

## Installation

### Option 1: From Source (Development)

1. Clone this repository:
```bash
git clone https://github.com/yourusername/things3-mcp.git
cd things3-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Option 2: From npm (Once Published)

```bash
npm install -g things3-mcp
```

## Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "things3": {
      "command": "node",
      "args": ["/path/to/things3-mcp/build/index.js"]
    }
  }
}
```

If installed globally via npm:
```json
{
  "mcpServers": {
    "things3": {
      "command": "things3-mcp"
    }
  }
}
```

### Other MCP Clients

For other MCP clients, use the stdio transport with:
```bash
node /path/to/things3-mcp/build/index.js
```

## Available Tools

### 1. `create_todo`

Create a new todo in Things3.

**Parameters:**
- `title` (required): The title of the todo
- `notes` (optional): Notes or description
- `when` (optional): When to schedule (`today`, `tomorrow`, `evening`, `anytime`, `someday`)
- `deadline` (optional): Deadline date in YYYY-MM-DD format
- `tags` (optional): Array of tag names
- `checklistItems` (optional): Array of checklist item titles
- `listId` (optional): Project or area UUID
- `listName` (optional): Project or area name (will search for UUID)
- `heading` (optional): Heading to add the todo under

**Example:**
```json
{
  "title": "Buy groceries",
  "notes": "Milk, eggs, bread",
  "when": "today",
  "tags": ["shopping"],
  "checklistItems": ["Milk", "Eggs", "Bread"]
}
```

### 2. `list_todos`

List todos from Things3.

**Parameters:**
- `filter` (optional): Filter by list type (`all`, `today`, `upcoming`, `inbox`, `anytime`, `someday`)
- `includeCompleted` (optional): Include completed tasks (default: false)

**Example:**
```json
{
  "filter": "today",
  "includeCompleted": false
}
```

### 3. `search_todos`

Search for todos by title and/or notes.

**Parameters:**
- `query` (required): Search query string
- `searchIn` (optional): Where to search (`title`, `notes`, `both`) (default: `both`)

**Example:**
```json
{
  "query": "meeting",
  "searchIn": "both"
}
```

### 4. `get_todo`

Get detailed information about a specific todo.

**Parameters:**
- `taskId` (required): UUID of the task

**Example:**
```json
{
  "taskId": "abc123..."
}
```

### 5. `update_todo`

Update an existing todo.

**Parameters:**
- `taskId` (required): UUID of the task to update
- `title` (optional): New title
- `notes` (optional): New notes
- `when` (optional): When to schedule
- `deadline` (optional): Deadline date (empty string to remove)
- `tags` (optional): Array of tag names (replaces existing)
- `addTags` (optional): Array of tag names to add
- `listId` (optional): Move to this project/area UUID
- `completed` (optional): Mark as completed

**Example:**
```json
{
  "taskId": "abc123...",
  "title": "Updated title",
  "when": "tomorrow"
}
```

### 6. `complete_todo`

Mark a todo as completed.

**Parameters:**
- `taskId` (required): UUID of the task to complete

**Example:**
```json
{
  "taskId": "abc123..."
}
```

### 7. `list_date_todos`

List todos scheduled for a specific date.

**Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `includeCompleted` (optional): Include completed tasks (default: false)

**Example:**
```json
{
  "date": "2025-01-12",
  "includeCompleted": false
}
```

### 8. `list_range_todos`

List todos scheduled within a date range (inclusive).

**Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format (inclusive)
- `includeCompleted` (optional): Include completed tasks (default: false)

**Example:**
```json
{
  "startDate": "2026-01-08",
  "endDate": "2026-01-14",
  "includeCompleted": false
}
```

### 9. `list_projects`

List all projects and areas.

**Parameters:**
- `includeAreas` (optional): Include areas in results (default: true)

**Example:**
```json
{
  "includeAreas": true
}
```

### 10. `list_tags`

List all tags.

**Parameters:** None

## Development

### Project Structure

```
things3-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── database.ts           # SQLite database reader
│   ├── urlScheme.ts          # Things3 URL scheme generator
│   ├── types.ts              # TypeScript type definitions
│   └── tools/                # MCP tool implementations
│       ├── create-todo.ts
│       ├── list-todos.ts
│       ├── search-todos.ts
│       ├── get-todo.ts
│       ├── update-todo.ts
│       ├── complete-todo.ts
│       ├── list-projects.ts
│       └── list-tags.ts
├── build/                    # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with tsx
- `npm start` - Run the compiled server

### Testing

To test the server manually:

1. Build the project: `npm run build`
2. Configure Claude Desktop with the server
3. Restart Claude Desktop
4. Use the tools through Claude's interface

## Things3 URL Scheme Reference

The server uses Things3's URL scheme for write operations. Key URL formats:

- **Add**: `things:///add?title=...&notes=...&when=...&auth-token=...`
- **Update**: `things:///update?id=...&title=...&auth-token=...`
- **Show**: `things:///show?id=...&auth-token=...`

**Authentication**: All URL scheme operations require an authentication token. The token is automatically included by the server and is retrieved from Things3's database (`TMSettings.uriSchemeAuthenticationToken`). The token is hardcoded in `src/urlScheme.ts`.

See [Things3 URL Scheme documentation](https://culturedcode.com/things/support/articles/2803573/) for more details.

## Things3 Database Schema

The server reads from these main tables:
- `TMTask` - All tasks, projects, and headings
- `TMArea` - Areas
- `TMTag` - Tags
- `TMTaskTag` - Task-tag relationships
- `TMChecklistItem` - Checklist items

## Limitations

- **macOS only**: Things3 is macOS/iOS only
- **Read-only database**: The SQLite database is opened in read-only mode
- **URL scheme opens Things3**: Write operations will briefly open Things3 app
- **No repeating tasks**: Repeating tasks are not currently supported

## Troubleshooting

### Database not found

Make sure Things3 is installed and has been opened at least once. The database is created on first launch.

### Permission errors

The server needs read access to:
```
~/Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/
```

This should be accessible by default.

### Tools not appearing in Claude

1. Check that Claude Desktop config is correct
2. Restart Claude Desktop completely
3. Check the server logs for errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Things3](https://culturedcode.com/things/) by Cultured Code
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for SQLite access
