import { ListDateTodosSchema, ListDateTodosInput } from '../types.js';
import { getTasksForDate } from '../database.js';

export const listDateTodosTool = {
  name: 'list_date_todos',
  description: 'List todos scheduled for a specific date (YYYY-MM-DD) from Things3.',
  inputSchema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format'
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed tasks',
        default: false
      }
    },
    required: ['date']
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

export async function handleListDateTodos(params: ListDateTodosInput): Promise<string> {
  const validated = ListDateTodosSchema.parse(params);
  const date = parseLocalDate(validated.date);
  const tasks = getTasksForDate(date, validated.includeCompleted);

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
    date: validated.date,
    tasks: simplifiedTasks
  }, null, 2);
}
