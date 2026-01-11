import Database from 'better-sqlite3';
import { findThings3Database } from '../src/database.js';

const dbPath = findThings3Database();
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

// Helper to convert Things3 date format to Unix timestamp
function convertThings3Date(things3Date: number | null): Date | null {
  if (!things3Date) return null;

  const year = things3Date >> 16;
  const dayInfo = things3Date & 0xFFFF;
  const dayOfYear = Math.floor(dayInfo / 128);

  const date = new Date(Date.UTC(year, 0, dayOfYear + 1));
  return date;
}

// Helper to convert a JavaScript Date to Things3 date format
function dateToThings3Format(date: Date): number {
  const year = date.getFullYear();
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return (year << 16) | (dayOfYear * 128);
}

console.log('Current date:', new Date().toISOString().split('T')[0]);
console.log('Tomorrow would be:', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const tomorrowValue = dateToThings3Format(tomorrow);

const dayAfter = new Date(tomorrow);
dayAfter.setDate(dayAfter.getDate() + 1);
const dayAfterValue = dateToThings3Format(dayAfter);

console.log('\nThings3 format for tomorrow:', tomorrowValue);
console.log('Things3 format for day after:', dayAfterValue);

const tasks = db.prepare(`
  SELECT title, start, startDate
  FROM TMTask
  WHERE title IN ('Tomorrow', 'Third')
    AND trashed = 0
`).all() as any[];

console.log('\nTasks named "Tomorrow" and "Third":');
for (const task of tasks) {
  const date = convertThings3Date(task.startDate);
  console.log(`\n"${task.title}":`);
  console.log(`  start: ${task.start}`);
  console.log(`  startDate (raw): ${task.startDate}`);
  console.log(`  startDate (decoded): ${date?.toISOString().split('T')[0]}`);
  console.log(`  Matches tomorrow range? ${task.startDate >= tomorrowValue && task.startDate < dayAfterValue}`);
}

db.close();
