import { CreateTodoSchema, CreateTodoInput } from '../types.js';
import { createTodo } from '../urlScheme.js';

export const createTodoTool = {
  name: 'create_todo',
  description: 'Create a new todo in Things3. This will open Things3 and create the task with the specified parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the todo'
      },
      notes: {
        type: 'string',
        description: 'Notes or description for the todo'
      },
      when: {
        type: 'string',
        description: 'When to schedule the todo (use "today", "tomorrow", "evening", "anytime", "someday", or a specific date in YYYY-MM-DD format)'
      },
      deadline: {
        type: 'string',
        description: 'Deadline date in YYYY-MM-DD format'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of tag names'
      },
      checklistItems: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of checklist item titles'
      },
      listId: {
        type: 'string',
        description: 'Project or area UUID to add the todo to'
      },
      listName: {
        type: 'string',
        description: 'Project or area name (will search for UUID)'
      },
      heading: {
        type: 'string',
        description: 'Heading to add the todo under'
      }
    },
    required: ['title']
  }
};

export async function handleCreateTodo(params: CreateTodoInput): Promise<string> {
  const validated = CreateTodoSchema.parse(params);
  const url = await createTodo(validated);

  return JSON.stringify({
    success: true,
    message: 'Todo created successfully',
    url,
    title: validated.title
  }, null, 2);
}
