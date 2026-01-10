import { getTomorrowTasks } from '../database.js';

export const listTomorrowTool = {
  name: 'list_tomorrow_todos',
  description: 'List todos scheduled for tomorrow from Things3.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function handleListTomorrow(): Promise<string> {
  const tasks = getTomorrowTasks();

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
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tasks: simplifiedTasks
  }, null, 2);
}
