import { z } from 'zod';

// Things3 Task Status
export enum TaskStatus {
  INCOMPLETE = 0,
  COMPLETED = 3,
  CANCELED = 2
}

// Things3 Task Type
export enum TaskType {
  TODO = 0,
  PROJECT = 1,
  HEADING = 2
}

// Things3 Task interface
export interface Things3Task {
  uuid: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  type: TaskType;
  creationDate: number | null;
  modificationDate: number | null;

  // Scheduling fields
  start: number; // 0=none, 1=today, 2=upcoming
  startDate: number | null;
  startBucket: number | null;
  todayIndex: number | null;
  todayIndexReferenceDate: number | null;
  dueDate: number | null;
  stopDate: number | null;

  // Organization
  area: string | null;
  areaTitle: string | null;
  project: string | null;
  projectTitle: string | null;
  heading: string | null;

  // Index and counts
  index: number | null;
  checklistItemsCount: number | null;
  openChecklistItemsCount: number | null;

  // Related data
  tags: string[];
  checklistItems: ChecklistItem[];
}

// Things3 Project/Area interface
export interface Things3Area {
  uuid: string;
  title: string;
  type: 'area' | 'project';
  visible: boolean;
}

// Things3 Tag interface
export interface Things3Tag {
  uuid: string;
  title: string;
}

// Checklist Item interface
export interface ChecklistItem {
  title: string;
  status: TaskStatus;
}

// Zod Schemas for tool inputs

export const CreateTodoSchema = z.object({
  title: z.string().describe('The title of the todo'),
  notes: z.string().optional().describe('Notes or description for the todo'),
  when: z.enum(['today', 'tomorrow', 'evening', 'anytime', 'someday']).optional().describe('When to schedule the todo'),
  deadline: z.string().optional().describe('Deadline date in YYYY-MM-DD format'),
  tags: z.array(z.string()).optional().describe('Array of tag names'),
  checklistItems: z.array(z.string()).optional().describe('Array of checklist item titles'),
  listId: z.string().optional().describe('Project or area UUID to add the todo to'),
  listName: z.string().optional().describe('Project or area name (will search for UUID)'),
  heading: z.string().optional().describe('Heading to add the todo under')
});

export const ListTodosSchema = z.object({
  filter: z.enum(['all', 'today', 'tomorrow', 'upcoming', 'inbox', 'anytime', 'someday']).optional().default('all').describe('Filter tasks by list'),
  includeCompleted: z.boolean().optional().default(false).describe('Include completed tasks')
});

export const SearchTodosSchema = z.object({
  query: z.string().describe('Search query string'),
  searchIn: z.enum(['title', 'notes', 'both']).optional().default('both').describe('Where to search')
});

export const GetTodoSchema = z.object({
  taskId: z.string().describe('UUID of the task to retrieve')
});

export const UpdateTodoSchema = z.object({
  taskId: z.string().describe('UUID of the task to update'),
  title: z.string().optional().describe('New title'),
  notes: z.string().optional().describe('New notes'),
  when: z.enum(['today', 'tomorrow', 'evening', 'anytime', 'someday']).optional().describe('When to schedule'),
  deadline: z.string().optional().describe('Deadline date in YYYY-MM-DD format'),
  tags: z.array(z.string()).optional().describe('Array of tag names (replaces existing)'),
  addTags: z.array(z.string()).optional().describe('Array of tag names to add'),
  listId: z.string().optional().describe('Move to this project/area UUID'),
  completed: z.boolean().optional().describe('Mark as completed or not')
});

export const CompleteTodoSchema = z.object({
  taskId: z.string().describe('UUID of the task to complete')
});

export const ListProjectsSchema = z.object({
  includeAreas: z.boolean().optional().default(true).describe('Include areas in the results')
});

export const ListTagsSchema = z.object({});

// Type exports for tool inputs
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type ListTodosInput = z.infer<typeof ListTodosSchema>;
export type SearchTodosInput = z.infer<typeof SearchTodosSchema>;
export type GetTodoInput = z.infer<typeof GetTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
export type CompleteTodoInput = z.infer<typeof CompleteTodoSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type ListTagsInput = z.infer<typeof ListTagsSchema>;
