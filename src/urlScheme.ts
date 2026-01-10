import { exec } from 'child_process';
import { promisify } from 'util';
import { CreateTodoInput, UpdateTodoInput } from './types.js';
import { findProjectByName, findTagByName } from './database.js';

const execAsync = promisify(exec);

// Encode parameter for URL
function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

// Execute a Things3 URL
export async function executeThingsUrl(url: string): Promise<void> {
  try {
    await execAsync(`open "${url}"`);
  } catch (error) {
    throw new Error(`Failed to execute Things3 URL: ${error}`);
  }
}

// Create a new todo using Things3 URL scheme
export async function createTodo(params: CreateTodoInput): Promise<string> {
  const urlParams: string[] = [];

  // Required: title
  urlParams.push(`title=${encodeParam(params.title)}`);

  // Optional: notes
  if (params.notes) {
    urlParams.push(`notes=${encodeParam(params.notes)}`);
  }

  // Optional: when
  if (params.when) {
    urlParams.push(`when=${params.when}`);
  }

  // Optional: deadline
  if (params.deadline) {
    urlParams.push(`deadline=${encodeParam(params.deadline)}`);
  }

  // Optional: tags
  if (params.tags && params.tags.length > 0) {
    const tagsList = params.tags.join(',');
    urlParams.push(`tags=${encodeParam(tagsList)}`);
  }

  // Optional: checklist items
  if (params.checklistItems && params.checklistItems.length > 0) {
    const checklistJson = JSON.stringify(
      params.checklistItems.map(item => ({ type: 'checklist-item', attributes: { title: item } }))
    );
    urlParams.push(`checklist-items=${encodeParam(checklistJson)}`);
  }

  // Optional: list (project/area)
  if (params.listId) {
    urlParams.push(`list-id=${encodeParam(params.listId)}`);
  } else if (params.listName) {
    // Try to find the project/area by name
    const list = findProjectByName(params.listName);
    if (list) {
      urlParams.push(`list-id=${encodeParam(list.uuid)}`);
    } else {
      // If not found, use list name directly (Things3 will create inbox item)
      urlParams.push(`list=${encodeParam(params.listName)}`);
    }
  }

  // Optional: heading
  if (params.heading) {
    urlParams.push(`heading=${encodeParam(params.heading)}`);
  }

  // Reveal the newly created todo
  urlParams.push('reveal=true');

  const url = `things:///add?${urlParams.join('&')}`;

  await executeThingsUrl(url);

  return url;
}

// Update an existing todo
export async function updateTodo(params: UpdateTodoInput): Promise<string> {
  const urlParams: string[] = [];

  // Required: id
  urlParams.push(`id=${encodeParam(params.taskId)}`);

  // Optional: title
  if (params.title !== undefined) {
    urlParams.push(`title=${encodeParam(params.title)}`);
  }

  // Optional: notes
  if (params.notes !== undefined) {
    urlParams.push(`notes=${encodeParam(params.notes)}`);
  }

  // Optional: when
  if (params.when) {
    urlParams.push(`when=${params.when}`);
  }

  // Optional: deadline
  if (params.deadline !== undefined) {
    if (params.deadline === '') {
      // Empty string removes deadline
      urlParams.push('deadline=');
    } else {
      urlParams.push(`deadline=${encodeParam(params.deadline)}`);
    }
  }

  // Optional: tags (replaces existing tags)
  if (params.tags && params.tags.length > 0) {
    const tagsList = params.tags.join(',');
    urlParams.push(`tags=${encodeParam(tagsList)}`);
  }

  // Optional: add tags (adds to existing tags)
  if (params.addTags && params.addTags.length > 0) {
    const tagsList = params.addTags.join(',');
    urlParams.push(`add-tags=${encodeParam(tagsList)}`);
  }

  // Optional: list (project/area)
  if (params.listId) {
    urlParams.push(`list-id=${encodeParam(params.listId)}`);
  }

  // Optional: completed
  if (params.completed !== undefined) {
    urlParams.push(`completed=${params.completed}`);
  }

  // Reveal the updated todo
  urlParams.push('reveal=true');

  const url = `things:///update?${urlParams.join('&')}`;

  await executeThingsUrl(url);

  return url;
}

// Complete a todo
export async function completeTodo(taskId: string): Promise<string> {
  const url = `things:///update?id=${encodeParam(taskId)}&completed=true`;

  await executeThingsUrl(url);

  return url;
}

// Show a todo in Things3
export async function showTodo(taskId: string): Promise<string> {
  const url = `things:///show?id=${encodeParam(taskId)}`;

  await executeThingsUrl(url);

  return url;
}

// Search in Things3 (opens Things3 with search)
export async function searchInThings(query: string): Promise<string> {
  const url = `things:///search?query=${encodeParam(query)}`;

  await executeThingsUrl(url);

  return url;
}
