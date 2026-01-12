import { UpdateTodoSchema, UpdateTodoInput } from '../types.js';
import { updateTodo } from '../urlScheme.js';

export const updateTodoTool = {
  name: 'update_todo',
  description: 'Update an existing todo in Things3. You can update any combination of title, notes, dates, tags, and project/area. This will open Things3 and apply the updates.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to update'
      },
      title: {
        type: 'string',
        description: 'New title'
      },
      notes: {
        type: 'string',
        description: 'New notes'
      },
      when: {
        type: 'string',
        description: 'When to schedule (use "today", "tomorrow", "evening", "anytime", "someday", or a specific date in YYYY-MM-DD format)'
      },
      deadline: {
        type: 'string',
        description: 'Deadline date in YYYY-MM-DD format (empty string to remove)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of tag names (replaces existing)'
      },
      addTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of tag names to add'
      },
      listId: {
        type: 'string',
        description: 'Move to this project/area UUID'
      },
      completed: {
        type: 'boolean',
        description: 'Mark as completed or not'
      }
    },
    required: ['taskId']
  }
};

export async function handleUpdateTodo(params: UpdateTodoInput): Promise<string> {
  const validated = UpdateTodoSchema.parse(params);
  const url = await updateTodo(validated);

  return JSON.stringify({
    success: true,
    message: 'Todo updated successfully',
    url,
    taskId: validated.taskId
  }, null, 2);
}
