import { ListTodosSchema, ListTodosInput } from '../types.js';
import { getTasksByFilter } from '../database.js';

export const listTodosTool = {
  name: 'list_todos',
  description: 'List todos from Things3. Can filter by list type (all, today, upcoming, inbox, anytime, someday) and optionally include completed tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['all', 'today', 'upcoming', 'inbox', 'anytime', 'someday'],
        description: 'Filter tasks by list',
        default: 'all'
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed tasks',
        default: false
      }
    }
  }
};

export async function handleListTodos(params: ListTodosInput): Promise<string> {
  const validated = ListTodosSchema.parse(params);
  const tasks = getTasksByFilter(validated.filter || 'all', validated.includeCompleted || false);

  const simplifiedTasks = tasks.map(task => ({
    id: task.uuid,
    title: task.title,
    notes: task.notes,
    status: task.status === 0 ? 'incomplete' : task.status === 3 ? 'completed' : 'canceled',
    dueDate: task.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] : null,
    project: task.projectTitle,
    area: task.areaTitle,
    tags: task.tags
  }));

  return JSON.stringify({
    success: true,
    count: simplifiedTasks.length,
    filter: validated.filter,
    tasks: simplifiedTasks
  }, null, 2);
}
