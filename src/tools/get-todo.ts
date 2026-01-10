import { GetTodoSchema, GetTodoInput } from '../types.js';
import { getTaskById } from '../database.js';

export const getTodoTool = {
  name: 'get_todo',
  description: 'Get detailed information about a specific todo by its UUID. Returns full task details including tags, project, checklist items, and all dates.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to retrieve'
      }
    },
    required: ['taskId']
  }
};

export async function handleGetTodo(params: GetTodoInput): Promise<string> {
  const validated = GetTodoSchema.parse(params);
  const task = getTaskById(validated.taskId);

  if (!task) {
    return JSON.stringify({
      success: false,
      error: 'Task not found',
      taskId: validated.taskId
    }, null, 2);
  }

  const detailedTask = {
    id: task.uuid,
    title: task.title,
    notes: task.notes,
    status: task.status === 0 ? 'incomplete' : task.status === 3 ? 'completed' : 'canceled',
    createdAt: task.creationDate ? new Date(task.creationDate * 1000).toISOString() : null,
    modifiedAt: task.modificationDate ? new Date(task.modificationDate * 1000).toISOString() : null,
    dueDate: task.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] : null,
    startDate: task.startDate ? new Date(task.startDate * 1000).toISOString().split('T')[0] : null,
    project: task.projectTitle,
    projectId: task.project,
    area: task.areaTitle,
    areaId: task.area,
    tags: task.tags,
    checklistItems: task.checklistItems.map(item => ({
      title: item.title,
      completed: item.status === 3
    }))
  };

  return JSON.stringify({
    success: true,
    task: detailedTask
  }, null, 2);
}
