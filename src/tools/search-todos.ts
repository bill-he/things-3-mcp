import { SearchTodosSchema, SearchTodosInput } from '../types.js';
import { searchTasks } from '../database.js';

export const searchTodosTool = {
  name: 'search_todos',
  description: 'Search for todos in Things3 by title and/or notes. Returns incomplete tasks matching the search query.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string'
      },
      searchIn: {
        type: 'string',
        enum: ['title', 'notes', 'both'],
        description: 'Where to search',
        default: 'both'
      }
    },
    required: ['query']
  }
};

export async function handleSearchTodos(params: SearchTodosInput): Promise<string> {
  const validated = SearchTodosSchema.parse(params);
  const tasks = searchTasks(validated.query, validated.searchIn || 'both');

  const simplifiedTasks = tasks.map(task => ({
    id: task.uuid,
    title: task.title,
    notes: task.notes,
    dueDate: task.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] : null,
    project: task.projectTitle,
    area: task.areaTitle,
    tags: task.tags
  }));

  return JSON.stringify({
    success: true,
    count: simplifiedTasks.length,
    query: validated.query,
    tasks: simplifiedTasks
  }, null, 2);
}
