#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool definitions
import { createTodoTool, handleCreateTodo } from './tools/create-todo.js';
import { listTodosTool, handleListTodos } from './tools/list-todos.js';
import { listTomorrowTool, handleListTomorrow } from './tools/list-tomorrow.js';
import { listDateTodosTool, handleListDateTodos } from './tools/list-date.js';
import { listRangeTodosTool, handleListRangeTodos } from './tools/list-range.js';
import { searchTodosTool, handleSearchTodos } from './tools/search-todos.js';
import { getTodoTool, handleGetTodo } from './tools/get-todo.js';
import { updateTodoTool, handleUpdateTodo } from './tools/update-todo.js';
import { completeTodoTool, handleCompleteTodo } from './tools/complete-todo.js';
import { listProjectsTool, handleListProjects } from './tools/list-projects.js';
import { listTagsTool, handleListTags } from './tools/list-tags.js';

// Initialize database connection at startup
import { initDatabase } from './database.js';

// Server info
const SERVER_NAME = 'things3-mcp';
const SERVER_VERSION = '1.0.0';

// Tool registry
const tools = [
  createTodoTool,
  listTodosTool,
  listTomorrowTool,
  listDateTodosTool,
  listRangeTodosTool,
  searchTodosTool,
  getTodoTool,
  updateTodoTool,
  completeTodoTool,
  listProjectsTool,
  listTagsTool,
];

// Tool handlers
const toolHandlers: Record<string, (params: any) => Promise<string>> = {
  create_todo: handleCreateTodo,
  list_todos: handleListTodos,
  list_tomorrow_todos: handleListTomorrow,
  list_date_todos: handleListDateTodos,
  list_range_todos: handleListRangeTodos,
  search_todos: handleSearchTodos,
  get_todo: handleGetTodo,
  update_todo: handleUpdateTodo,
  complete_todo: handleCompleteTodo,
  list_projects: handleListProjects,
  list_tags: handleListTags,
};

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];

    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Unknown tool: ${name}`,
            }, null, 2),
          },
        ],
      };
    }

    const result = await handler(args || {});

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  try {
    // Initialize database connection
    console.error('Initializing Things3 database connection...');
    initDatabase();
    console.error('Database connection established');

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    console.error(`${SERVER_NAME} v${SERVER_VERSION} started successfully`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
