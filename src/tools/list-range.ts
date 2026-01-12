import { ListRangeTodosSchema, ListRangeTodosInput } from '../types.js';
import { getTasksForRange } from '../database.js';

export const listRangeTodosTool = {
  name: 'list_range_todos',
  description: 'List todos scheduled within a date range (inclusive).',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format'
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (inclusive)'
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed tasks',
        default: false
      }
    },
    required: ['startDate', 'endDate']
  }
};

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) {
    throw new Error('Invalid date format, expected YYYY-MM-DD');
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date;
}

export async function handleListRangeTodos(params: ListRangeTodosInput): Promise<string> {
  const validated = ListRangeTodosSchema.parse(params);
  const startDate = parseLocalDate(validated.startDate);
  const endDate = parseLocalDate(validated.endDate);

  if (endDate < startDate) {
    throw new Error('endDate must be on or after startDate');
  }

  const tasks = getTasksForRange(startDate, endDate, validated.includeCompleted);

  const simplifiedTasks = tasks.map(task => ({
    id: task.uuid,
    title: task.title,
    notes: task.notes,
    status: task.status === 0 ? 'incomplete' : task.status === 3 ? 'completed' : 'canceled',
    dueDate: task.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] : null,
    startDate: task.startDate ? new Date(task.startDate * 1000).toISOString().split('T')[0] : null,
    project: task.projectTitle,
    area: task.areaTitle,
    tags: task.tags
  }));

  return JSON.stringify({
    success: true,
    count: simplifiedTasks.length,
    startDate: validated.startDate,
    endDate: validated.endDate,
    tasks: simplifiedTasks
  }, null, 2);
}
