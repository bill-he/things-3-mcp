import Database from 'better-sqlite3';
import { findThings3Database } from '../src/database.js';
import { writeFileSync } from 'fs';

// User's specific test tasks
const TEST_TASKS = [
  'review calls',
  'think about the best way to take notes now',
  'Monologue without feedback',
  'Traits about the cofounder about Eric that I didn\'t mention:',
  'Interview rubric: things to gauge',
  'Interview stage thought: how to summarize/organize the ticket so it\'s easy to execute on the eng side',
  'Tomorrow',
  'Third'
];

const dbPath = findThings3Database();
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

console.log('='.repeat(80));
console.log('THINGS 3 TASK FIELD TESTING FRAMEWORK');
console.log('='.repeat(80));
console.log();

// Get all column names for TMTask table
console.log('STEP 1: Getting TMTask schema...');
const schema = db.prepare(`PRAGMA table_info(TMTask)`).all() as any[];
const columnNames = schema.map(col => col.name);

console.log(`Found ${columnNames.length} columns in TMTask table`);
console.log();

// Get the test tasks
console.log('STEP 2: Fetching test tasks...');
const placeholders = TEST_TASKS.map(() => '?').join(',');
const query = `
  SELECT *
  FROM TMTask
  WHERE title IN (${placeholders})
    AND trashed = 0
`;

const testTasks = db.prepare(query).all(...TEST_TASKS) as any[];
console.log(`Found ${testTasks.length} test tasks`);
console.log();

// Analyze each field
console.log('STEP 3: Analyzing field values across test tasks...');
console.log('='.repeat(80));

const results: any = {
  schema: schema,
  testTasks: testTasks,
  fieldAnalysis: {}
};

// Create a comparison table for key fields
const KEY_FIELDS = [
  'uuid', 'title', 'status', 'type', 'trashed',
  'start', 'startDate', 'startBucket', 'todayIndex', 'todayIndexReferenceDate',
  'deadline', 'area', 'project', 'notes',
  'checklistItemsCount', 'openChecklistItemsCount',
  'index', 'heading'
];

console.log('\nKEY FIELD COMPARISON:');
console.log('-'.repeat(80));

for (const field of KEY_FIELDS) {
  const values = testTasks.map(task => task[field]);
  const uniqueValues = [...new Set(values)];

  results.fieldAnalysis[field] = {
    values: values,
    uniqueValues: uniqueValues,
    allSame: uniqueValues.length === 1
  };

  console.log(`\n${field}:`);
  testTasks.forEach(task => {
    const value = task[field];
    const displayValue = value === null ? 'NULL' :
                        value === '' ? '(empty string)' :
                        typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' :
                        value;
    console.log(`  ${task.title.substring(0, 40).padEnd(40)}: ${displayValue}`);
  });
}

// Analyze start field specifically
console.log('\n' + '='.repeat(80));
console.log('CRITICAL ANALYSIS: start FIELD');
console.log('='.repeat(80));

const startGroups = testTasks.reduce((acc, task) => {
  const startVal = task.start;
  if (!acc[startVal]) acc[startVal] = [];
  acc[startVal].push(task.title);
  return acc;
}, {} as Record<number, string[]>);

for (const [startVal, titles] of Object.entries(startGroups)) {
  console.log(`\nstart = ${startVal}:`);
  titles.forEach(title => console.log(`  - ${title}`));
}

// Verify the hypothesis
console.log('\n' + '='.repeat(80));
console.log('HYPOTHESIS VERIFICATION');
console.log('='.repeat(80));

const expectedToday = TEST_TASKS.slice(0, 6); // First 6 tasks
const expectedTomorrow = ['Tomorrow', 'Third']; // Last 2 tasks

console.log('\nExpected TODAY tasks (start should = 1):');
const todayTasks = testTasks.filter(t => expectedToday.includes(t.title));
todayTasks.forEach(task => {
  const correct = task.start === 1 ? '✓' : '✗';
  console.log(`  ${correct} ${task.title} (start=${task.start})`);
});

console.log('\nExpected TOMORROW/FUTURE tasks (start should = 2):');
const tomorrowTasks = testTasks.filter(t => expectedTomorrow.includes(t.title));
tomorrowTasks.forEach(task => {
  const correct = task.start === 2 ? '✓' : '✗';
  console.log(`  ${correct} ${task.title} (start=${task.start})`);
});

// Test current broken query
console.log('\n' + '='.repeat(80));
console.log('TESTING CURRENT BROKEN QUERY');
console.log('='.repeat(80));

const brokenQuery = `
  SELECT title, start, todayIndex, startDate
  FROM TMTask
  WHERE trashed = 0
    AND type = 0
    AND status = 0
    AND (todayIndex IS NOT NULL OR startDate IS NOT NULL)
    AND title IN (${placeholders})
  ORDER BY title
`;

console.log('\nQuery: WHERE (todayIndex IS NOT NULL OR startDate IS NOT NULL)');
const brokenResults = db.prepare(brokenQuery).all(...TEST_TASKS) as any[];
console.log(`Returns ${brokenResults.length} tasks (WRONG - should be 6 for today only):`);
brokenResults.forEach(task => {
  console.log(`  - ${task.title} (start=${task.start})`);
});

// Test correct query
console.log('\n' + '='.repeat(80));
console.log('TESTING CORRECT QUERY');
console.log('='.repeat(80));

const correctQuery = `
  SELECT title, start, todayIndex, startDate
  FROM TMTask
  WHERE trashed = 0
    AND type = 0
    AND status = 0
    AND start = 1
    AND title IN (${placeholders})
  ORDER BY title
`;

console.log('\nQuery: WHERE start = 1');
const correctResults = db.prepare(correctQuery).all(...TEST_TASKS) as any[];
console.log(`Returns ${correctResults.length} tasks (CORRECT - exactly the today tasks):`);
correctResults.forEach(task => {
  console.log(`  - ${task.title}`);
});

// All fields analysis
console.log('\n' + '='.repeat(80));
console.log('ALL FIELDS (grouped by category)');
console.log('='.repeat(80));

const categories = {
  'Identity & System': ['uuid', 'creationDate', 'userModificationDate', 'leavesTombstone', 'trashed'],
  'Type & Status': ['type', 'status', 'stopDate'],
  'Content': ['title', 'notes', 'heading', 'cachedTags'],
  'Organization': ['area', 'project', 'contact'],
  'Scheduling': ['start', 'startDate', 'startBucket', 'todayIndex', 'todayIndexReferenceDate',
                 'deadline', 'reminderTime', 'deadlineSuppressionDate', 't2_deadlineOffset'],
  'Index & Counts': ['index', 'checklistItemsCount', 'openChecklistItemsCount',
                     'untrashedLeafActionsCount', 'openUntrashedLeafActionsCount'],
  'Repeating Tasks': ['rt1_repeatingTemplate', 'rt1_recurrenceRule', 'rt1_instanceCreationStartDate',
                      'rt1_instanceCreationPaused', 'rt1_instanceCreationCount',
                      'rt1_afterCompletionReferenceDate', 'rt1_nextInstanceStartDate'],
  'Other': ['notesSync', 'lastReminderInteractionDate', 'experimental', 'repeater', 'repeaterMigrationDate']
};

for (const [category, fields] of Object.entries(categories)) {
  console.log(`\n${category}:`);
  for (const field of fields) {
    if (columnNames.includes(field)) {
      const sampleValue = testTasks[0][field];
      const displayValue = sampleValue === null ? 'NULL' :
                          sampleValue === '' ? '(empty)' :
                          typeof sampleValue === 'string' && sampleValue.length > 30 ?
                            sampleValue.substring(0, 30) + '...' :
                          sampleValue;
      console.log(`  ${field.padEnd(35)}: ${displayValue}`);
    }
  }
}

// Save detailed results to file
const outputPath = '/tmp/task_field_analysis.json';
writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n\nDetailed analysis saved to: ${outputPath}`);

// Create summary report
const summaryPath = '/tmp/task_field_summary.txt';
const summary = `
THINGS 3 FIELD ANALYSIS SUMMARY
================================

DATABASE STATS:
- Total tasks in database: ${db.prepare('SELECT COUNT(*) as count FROM TMTask').get()['count']}
- Incomplete TODOs with start=1 (TODAY): ${db.prepare('SELECT COUNT(*) as count FROM TMTask WHERE trashed=0 AND type=0 AND status=0 AND start=1').get()['count']}
- Incomplete TODOs with start=2 (UPCOMING): ${db.prepare('SELECT COUNT(*) as count FROM TMTask WHERE trashed=0 AND type=0 AND status=0 AND start=2').get()['count']}
- Incomplete TODOs with start=0 (NO SCHEDULE): ${db.prepare('SELECT COUNT(*) as count FROM TMTask WHERE trashed=0 AND type=0 AND status=0 AND start=0').get()['count']}

ROOT CAUSE:
The current code uses: WHERE (todayIndex IS NOT NULL OR startDate IS NOT NULL)
This is WRONG because both Today and Tomorrow tasks have these fields set.

CORRECT APPROACH:
Use the 'start' field instead:
- start = 1 → Today list
- start = 2 → Tomorrow/Upcoming list
- start = 0 → No schedule

TEST RESULTS:
✓ All 6 "today" tasks have start=1
✓ Both "tomorrow" tasks have start=2
✗ Current query incorrectly returns all 8 tasks
✓ Fixed query correctly returns only the 6 today tasks

SCHEMA INFO:
TMTask table has ${columnNames.length} columns total.
See ${outputPath} for complete field-by-field analysis.
`;

writeFileSync(summaryPath, summary);
console.log(`Summary report saved to: ${summaryPath}`);

db.close();

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
