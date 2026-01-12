# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that integrates with Things3 task management app for macOS. The server uses a hybrid approach:
- **Read operations**: Direct SQLite database access to Things3's database
- **Write operations**: Things3 URL scheme (opens Things3 app briefly)

## Development Commands

### Building and Running
```bash
npm run build      # Compile TypeScript to JavaScript
npm run dev        # Run in development mode with tsx (no build needed)
npm start          # Run the compiled server
```

### Testing
Manual testing is done through Claude Desktop or other MCP clients. After making changes:
1. `npm run build`
2. Restart the MCP client (e.g., Claude Desktop)
3. Test tools through the client interface

## Architecture

### Core Components

**src/index.ts** - MCP server entry point
- Initializes MCP server using `@modelcontextprotocol/sdk`
- Registers all tools and their handlers
- Uses stdio transport for communication
- Tool registry pattern: each tool exports both definition and handler

**src/database.ts** - SQLite read operations
- Direct read-only access to Things3's SQLite database
- Location: `~/Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/ThingsData-xxxxx/Things Database.thingsdatabase/main.sqlite`
- Key functions:
  - `initDatabase()`: Finds and opens DB (called once on startup)
  - `getTasksByFilter()`: Implements Things3's list filtering logic
  - `convertThings3Date()`: Decodes Things3's custom date format `(year << 16) | (dayOfYear * 128)`
  - Query helpers for tasks, projects, areas, tags

**src/urlScheme.ts** - Things3 URL scheme for write operations
- Constructs Things3 URLs (e.g., `things:///add?title=...`)
- Executes URLs via macOS `open` command
- Write operations briefly open Things3 app window
- Handles parameter encoding and URL construction

**src/types.ts** - TypeScript types and Zod schemas
- `TaskStatus`, `TaskType` enums matching Things3's values
- `Things3Task`, `Things3Area`, `Things3Tag` interfaces
- Zod schemas for runtime validation of tool inputs

**src/tools/** - Individual MCP tool implementations
- Each tool file exports: tool definition object + async handler function
- Pattern: validate with Zod schema → call DB function or URL scheme → return JSON string
- Tools return JSON strings (not objects) as MCP text content

### Things3 Database Schema

Key tables accessed:
- `TMTask` - All tasks, projects, and headings (type field distinguishes)
- `TMArea` - Areas (top-level organizational containers)
- `TMTag` - Tags
- `TMTaskTag` - Many-to-many task-tag relationships
- `TMChecklistItem` - Checklist items within tasks

Important fields:
- `status`: 0=incomplete, 2=canceled, 3=completed
- `type`: 0=todo, 1=project, 2=heading
- `start`: 1=Anytime, 2=Someday
- `startDate`/`deadline`: Custom date format (see `convertThings3Date()`)
- `trashed`: 0=active, 1=deleted

### Things3 Date Format

Things3 stores dates as integers: `(year << 16) | (dayOfYear * 128) + OFFSET`
- High 16 bits: year
- Low 16 bits: day of year (0-indexed) * 128
- **IMPORTANT**: Things3 uses a 33-day offset in its date encoding
  - Base calculation: `(year << 16) | (dayOfYear * 128)`
  - Actual Things3 value: Add `33 * 128 = 4224` to base
  - Example: 2026-01-11 → day 10 → base `132777216` → Things3 `132781440`
- This offset is empirically determined and used in the "today" filter
- See `convertThings3Date()` and `dateToThings3Format()` in database.ts

## Tool Handler Pattern

All tools follow this pattern:

```typescript
// Tool definition (for MCP protocol)
export const myTool = {
  name: 'tool_name',
  description: 'What the tool does',
  inputSchema: { /* JSON schema */ }
};

// Tool handler
export async function handleMyTool(params: MyInput): Promise<string> {
  const validated = MySchema.parse(params);  // Zod validation

  // For reads: query database
  const result = getDatabaseData(validated);

  // For writes: execute Things3 URL
  const url = await createThingsUrl(validated);

  return JSON.stringify({ success: true, ... }, null, 2);
}
```

## Common Pitfalls

### Things3 "Today" List Logic
Tasks appear in "Today" when their `todayIndexReferenceDate` matches today's date value (see `getTasksByFilter()` in database.ts):
- Check `todayIndexReferenceDate IS NOT NULL`
- Match against today's Things3 date value (with 33-day offset)
- Include yesterday's value to catch "This Evening" carryover tasks
- **DO NOT** use `todayIndex >= 0` - this field has different semantics

### URL Scheme vs Direct DB Writes
- NEVER write directly to Things3 database (read-only mode enforced)
- All writes MUST use URL scheme via urlScheme.ts
- URL scheme opens Things3 app (unavoidable Things3 behavior)

### Date Handling
- User-facing dates: YYYY-MM-DD format (ISO 8601)
- Internal storage: Things3's custom integer format
- Always convert between formats using helper functions

### TypeScript Module System
- Uses ES modules (`"type": "module"` in package.json)
- Module resolution: Node16 (requires `.js` extensions in imports)
- Import example: `import { foo } from './bar.js'` (not `./bar`)

## Adding New Tools

1. Create tool file in `src/tools/my-tool.ts`
2. Define Zod schema in `src/types.ts` if needed
3. Export tool definition and handler from tool file
4. Register in `src/index.ts`:
   - Add to `tools` array
   - Add handler to `toolHandlers` object
5. Rebuild and test

## Things3 URL Scheme Reference

Write operations use these URL formats:
- `things:///add?title=...&notes=...&when=...&auth-token=...` - Create todo
- `things:///update?id=...&title=...&completed=...&auth-token=...` - Update todo
- `things:///show?id=...&auth-token=...` - Show todo in Things3

### Authentication Token

All URL scheme operations require an authentication token from Things3:
- Token is stored in `TMSettings` table: `uriSchemeAuthenticationToken` field
- Current token: `_zHFvh-uS12aQ2EfDRnOyg`
- Token is hardcoded in `src/urlScheme.ts` as `AUTH_TOKEN` constant
- Without the token, URL scheme operations will fail silently

To get the token:
```sql
sqlite3 ~/Library/Group\ Containers/.../main.sqlite \
  "SELECT uriSchemeAuthenticationToken FROM TMSettings;"
```

Full documentation: https://culturedcode.com/things/support/articles/2803573/
