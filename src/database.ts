import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Things3Task, Things3Area, Things3Tag, TaskStatus, TaskType, ChecklistItem } from './types.js';

let db: Database.Database | null = null;

// Locate the Things3 database
export function findThings3Database(): string {
  const baseDir = join(homedir(), 'Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac');

  if (!existsSync(baseDir)) {
    throw new Error('Things3 directory not found. Is Things3 installed?');
  }

  // Find ThingsData directory (there might be multiple with different suffixes)
  const entries = readdirSync(baseDir);
  const thingsDataDir = entries.find(entry => entry.startsWith('ThingsData-'));

  if (!thingsDataDir) {
    throw new Error('ThingsData directory not found');
  }

  const dbPath = join(baseDir, thingsDataDir, 'Things Database.thingsdatabase/main.sqlite');

  if (!existsSync(dbPath)) {
    throw new Error(`Things3 database not found at ${dbPath}`);
  }

  return dbPath;
}

// Initialize database connection
export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = findThings3Database();
  db = new Database(dbPath, { readonly: true, fileMustExist: true });

  return db;
}

// Get database connection
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Helper to parse checklist items
function parseChecklistItems(taskUuid: string): ChecklistItem[] {
  const db = getDatabase();

  const items = db.prepare(`
    SELECT title, status
    FROM TMChecklistItem
    WHERE task = ?
    ORDER BY stopDate
  `).all(taskUuid) as any[];

  return items.map(item => ({
    title: item.title,
    status: item.status
  }));
}

// Helper to convert Things3 date format to Unix timestamp
// Things3 stores dates as: (year << 16) | (dayOfYear * 128)
function convertThings3Date(things3Date: number | null): number | null {
  if (!things3Date) return null;

  // Extract year from high 16 bits
  const year = things3Date >> 16;
  // Extract day info from low 16 bits, divide by 128 to get day of year (0-indexed)
  const dayInfo = things3Date & 0xFFFF;
  const dayOfYear = Math.floor(dayInfo / 128);

  // Create date: Jan 1 of year + dayOfYear days
  const date = new Date(Date.UTC(year, 0, dayOfYear + 1));
  return Math.floor(date.getTime() / 1000);
}

// Helper to convert a JavaScript Date to Things3 date format
function dateToThings3Format(date: Date): number {
  const year = date.getFullYear();
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return (year << 16) | (dayOfYear * 128);
}

// Helper to get tags for a task
function getTaskTags(taskUuid: string): string[] {
  const db = getDatabase();

  const tags = db.prepare(`
    SELECT t.title
    FROM TMTag t
    JOIN TMTaskTag tt ON tt.tags = t.uuid
    WHERE tt.tasks = ?
  `).all(taskUuid) as any[];

  return tags.map(tag => tag.title);
}

// Helper to convert database row to Things3Task
function rowToTask(row: any): Things3Task {
  const tags = getTaskTags(row.uuid);
  const checklistItems = parseChecklistItems(row.uuid);

  return {
    uuid: row.uuid,
    title: row.title || '',
    notes: row.notes,
    status: row.status,
    type: row.type,
    creationDate: row.creationDate,
    modificationDate: row.userModificationDate,

    // Scheduling fields
    start: row.start,
    startDate: convertThings3Date(row.startDate),
    startBucket: row.startBucket,
    todayIndex: row.todayIndex,
    todayIndexReferenceDate: row.todayIndexReferenceDate,
    dueDate: convertThings3Date(row.deadline),
    stopDate: row.stopDate,

    // Organization
    area: row.area,
    areaTitle: row.areaTitle,
    project: row.project,
    projectTitle: row.projectTitle,
    heading: row.heading,

    // Index and counts
    index: row.index,
    checklistItemsCount: row.checklistItemsCount,
    openChecklistItemsCount: row.openChecklistItemsCount,

    // Related data
    tags,
    checklistItems
  };
}

// Get all tasks
export function getAllTasks(includeCompleted: boolean = false): Things3Task[] {
  const db = getDatabase();

  let query = `
    SELECT
      t.uuid,
      t.title,
      t.notes,
      t.status,
      t.type,
      t.creationDate,
      t.userModificationDate,
      t.deadline,
      t.start,
      t.startDate,
      t.startBucket,
      t.todayIndex,
      t.todayIndexReferenceDate,
      t.stopDate,
      t.heading,
      t."index",
      t.checklistItemsCount,
      t.openChecklistItemsCount,
      t.area,
      a.title as areaTitle,
      t.project,
      p.title as projectTitle
    FROM TMTask t
    LEFT JOIN TMArea a ON t.area = a.uuid
    LEFT JOIN TMTask p ON t.project = p.uuid
    WHERE t.trashed = 0 AND t.type = ${TaskType.TODO}
  `;

  if (!includeCompleted) {
    query += ` AND t.status = ${TaskStatus.INCOMPLETE}`;
  }

  query += ` ORDER BY t.todayIndex, t.creationDate DESC`;

  const rows = db.prepare(query).all() as any[];
  return rows.map(rowToTask);
}

// Get tasks filtered by list type
export function getTasksByFilter(filter: string, includeCompleted: boolean = false): Things3Task[] {
  const db = getDatabase();

  let whereClause = `t.trashed = 0 AND t.type = ${TaskType.TODO}`;

  if (!includeCompleted) {
    whereClause += ` AND t.status = ${TaskStatus.INCOMPLETE}`;
  }

  switch (filter) {
    case 'today':
      whereClause += ` AND t.start = 1`;
      break;
    case 'tomorrow':
      whereClause += ` AND t.start = 2`;
      // Filter to only tomorrow (not later dates)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowValue = dateToThings3Format(tomorrow);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const dayAfterValue = dateToThings3Format(dayAfter);
      whereClause += ` AND t.startDate >= ${tomorrowValue} AND t.startDate < ${dayAfterValue}`;
      break;
    case 'upcoming':
      whereClause += ` AND t.start = 2`;
      break;
    case 'inbox':
      whereClause += ` AND t.area IS NULL AND t.project IS NULL`;
      break;
    case 'anytime':
      whereClause += ` AND t.start = 0`;
      break;
    case 'someday':
      whereClause += ` AND t.status = ${TaskStatus.INCOMPLETE} AND t.area = (SELECT uuid FROM TMArea WHERE title = 'Someday')`;
      break;
  }

  const query = `
    SELECT
      t.uuid,
      t.title,
      t.notes,
      t.status,
      t.type,
      t.creationDate,
      t.userModificationDate,
      t.deadline,
      t.start,
      t.startDate,
      t.startBucket,
      t.todayIndex,
      t.todayIndexReferenceDate,
      t.stopDate,
      t.heading,
      t.\`index\`,
      t.checklistItemsCount,
      t.openChecklistItemsCount,
      t.area,
      a.title as areaTitle,
      t.project,
      p.title as projectTitle
    FROM TMTask t
    LEFT JOIN TMArea a ON t.area = a.uuid
    LEFT JOIN TMTask p ON t.project = p.uuid
    WHERE ${whereClause}
    ORDER BY t.todayIndex, t.creationDate DESC
  `;

  const rows = db.prepare(query).all() as any[];
  return rows.map(rowToTask);
}

// Search tasks
export function searchTasks(query: string, searchIn: 'title' | 'notes' | 'both' = 'both'): Things3Task[] {
  const db = getDatabase();

  let whereClause = `t.trashed = 0 AND t.type = ${TaskType.TODO} AND t.status = ${TaskStatus.INCOMPLETE}`;

  const searchPattern = `%${query}%`;

  if (searchIn === 'title') {
    whereClause += ` AND t.title LIKE ?`;
  } else if (searchIn === 'notes') {
    whereClause += ` AND t.notes LIKE ?`;
  } else {
    whereClause += ` AND (t.title LIKE ? OR t.notes LIKE ?)`;
  }

  const sql = `
    SELECT
      t.uuid,
      t.title,
      t.notes,
      t.status,
      t.type,
      t.creationDate,
      t.userModificationDate,
      t.deadline,
      t.start,
      t.startDate,
      t.startBucket,
      t.todayIndex,
      t.todayIndexReferenceDate,
      t.stopDate,
      t.heading,
      t."index",
      t.checklistItemsCount,
      t.openChecklistItemsCount,
      t.area,
      a.title as areaTitle,
      t.project,
      p.title as projectTitle
    FROM TMTask t
    LEFT JOIN TMArea a ON t.area = a.uuid
    LEFT JOIN TMTask p ON t.project = p.uuid
    WHERE ${whereClause}
    ORDER BY t.todayIndex, t.creationDate DESC
  `;

  const stmt = db.prepare(sql);
  const params = searchIn === 'both' ? [searchPattern, searchPattern] : [searchPattern];
  const rows = stmt.all(...params) as any[];

  return rows.map(rowToTask);
}

// Get task by ID
export function getTaskById(uuid: string): Things3Task | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT
      t.uuid,
      t.title,
      t.notes,
      t.status,
      t.type,
      t.creationDate,
      t.userModificationDate,
      t.deadline,
      t.start,
      t.startDate,
      t.startBucket,
      t.todayIndex,
      t.todayIndexReferenceDate,
      t.stopDate,
      t.heading,
      t."index",
      t.checklistItemsCount,
      t.openChecklistItemsCount,
      t.area,
      a.title as areaTitle,
      t.project,
      p.title as projectTitle
    FROM TMTask t
    LEFT JOIN TMArea a ON t.area = a.uuid
    LEFT JOIN TMTask p ON t.project = p.uuid
    WHERE t.uuid = ? AND t.trashed = 0
  `).get(uuid) as any;

  if (!row) return null;

  return rowToTask(row);
}

// Get all projects and areas
export function getProjectsAndAreas(includeAreas: boolean = true): Things3Area[] {
  const db = getDatabase();

  let query = `
    SELECT uuid, title, visible
    FROM TMArea
    WHERE visible = 1
  `;

  const rows = db.prepare(query).all() as any[];

  const areas = rows.map(row => ({
    uuid: row.uuid,
    title: row.title,
    type: 'area' as const,
    visible: row.visible === 1
  }));

  // Get projects (which are TMTask with type = PROJECT)
  const projectQuery = `
    SELECT uuid, title, status
    FROM TMTask
    WHERE type = ${TaskType.PROJECT} AND trashed = 0 AND status = ${TaskStatus.INCOMPLETE}
  `;

  const projectRows = db.prepare(projectQuery).all() as any[];

  const projects = projectRows.map(row => ({
    uuid: row.uuid,
    title: row.title,
    type: 'project' as const,
    visible: true
  }));

  if (includeAreas) {
    return [...areas, ...projects];
  } else {
    return projects;
  }
}

// Get all tags
export function getTags(): Things3Tag[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT uuid, title
    FROM TMTag
    ORDER BY title
  `).all() as any[];

  return rows.map(row => ({
    uuid: row.uuid,
    title: row.title
  }));
}

// Find project/area by name
export function findProjectByName(name: string): Things3Area | null {
  const db = getDatabase();

  // Try areas first
  const areaRow = db.prepare(`
    SELECT uuid, title, visible
    FROM TMArea
    WHERE title = ? AND visible = 1
  `).get(name) as any;

  if (areaRow) {
    return {
      uuid: areaRow.uuid,
      title: areaRow.title,
      type: 'area',
      visible: areaRow.visible === 1
    };
  }

  // Try projects
  const projectRow = db.prepare(`
    SELECT uuid, title
    FROM TMTask
    WHERE type = ${TaskType.PROJECT} AND title = ? AND trashed = 0 AND status = ${TaskStatus.INCOMPLETE}
  `).get(name) as any;

  if (projectRow) {
    return {
      uuid: projectRow.uuid,
      title: projectRow.title,
      type: 'project',
      visible: true
    };
  }

  return null;
}

// Find tag by name
export function findTagByName(name: string): Things3Tag | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT uuid, title
    FROM TMTag
    WHERE title = ?
  `).get(name) as any;

  if (!row) return null;

  return {
    uuid: row.uuid,
    title: row.title
  };
}

// Get tasks for tomorrow
export function getTomorrowTasks(): Things3Task[] {
  const db = getDatabase();

  // Calculate tomorrow's date in Things3 format: (year << 16) | (dayOfYear * 128)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Convert tomorrow to Things3 format
  const tomorrowStartValue = dateToThings3Format(tomorrow);
  // End of tomorrow = start of day after tomorrow
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const tomorrowEndValue = dateToThings3Format(dayAfterTomorrow);

  const query = `
    SELECT
      t.uuid,
      t.title,
      t.notes,
      t.status,
      t.type,
      t.creationDate,
      t.userModificationDate,
      t.deadline,
      t.start,
      t.startDate,
      t.startBucket,
      t.todayIndex,
      t.todayIndexReferenceDate,
      t.stopDate,
      t.heading,
      t."index",
      t.checklistItemsCount,
      t.openChecklistItemsCount,
      t.area,
      a.title as areaTitle,
      t.project,
      p.title as projectTitle
    FROM TMTask t
    LEFT JOIN TMArea a ON t.area = a.uuid
    LEFT JOIN TMTask p ON t.project = p.uuid
    WHERE t.trashed = 0
      AND t.type = ${TaskType.TODO}
      AND t.status = ${TaskStatus.INCOMPLETE}
      AND t.start = 2
      AND t.startDate >= ${tomorrowStartValue}
      AND t.startDate < ${tomorrowEndValue}
    ORDER BY t.todayIndex, t.creationDate DESC
  `;

  const rows = db.prepare(query).all() as any[];
  return rows.map(rowToTask);
}
