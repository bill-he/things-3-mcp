import { CompleteTodoSchema, CompleteTodoInput } from '../types.js';
import { completeTodo } from '../urlScheme.js';

export const completeTodoTool = {
  name: 'complete_todo',
  description: 'Mark a todo as completed in Things3. This will open Things3 and mark the task as done.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to complete'
      }
    },
    required: ['taskId']
  }
};

export async function handleCompleteTodo(params: CompleteTodoInput): Promise<string> {
  const validated = CompleteTodoSchema.parse(params);
  const url = await completeTodo(validated.taskId);

  return JSON.stringify({
    success: true,
    message: 'Todo marked as completed',
    url,
    taskId: validated.taskId
  }, null, 2);
}
