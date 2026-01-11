import { getTasksByFilter, getTomorrowTasks } from '../src/database.js';

console.log('='.repeat(80));
console.log('VERIFYING DATABASE FIXES');
console.log('='.repeat(80));

// Test 1: Get today tasks
console.log('\nTest 1: Get TODAY tasks (filter="today")');
console.log('-'.repeat(80));
const todayTasks = getTasksByFilter('today', false);
console.log(`Found ${todayTasks.length} tasks`);
console.log('\nExpected tasks (6 total):');
const expectedToday = [
  'review calls',
  'think about the best way to take notes now',
  'Monologue without feedback',
  'Traits about the cofounder about Eric that I didn\'t mention:',
  'Interview rubric: things to gauge',
  'Interview stage thought: how to summarize/organize the ticket so it\'s easy to execute on the eng side'
];

for (const expected of expectedToday) {
  const found = todayTasks.find(t => t.title === expected);
  if (found) {
    console.log(`  ✓ "${expected}" (start=${found.start})`);
  } else {
    console.log(`  ✗ MISSING: "${expected}"`);
  }
}

// Check for any unexpected tasks
const unexpectedToday = todayTasks.filter(t => !expectedToday.includes(t.title));
if (unexpectedToday.length > 0) {
  console.log(`\n⚠️  Found ${unexpectedToday.length} UNEXPECTED tasks:`);
  unexpectedToday.slice(0, 5).forEach(t => {
    console.log(`  - "${t.title}" (start=${t.start})`);
  });
}

// Test 2: Get tomorrow tasks
console.log('\n\nTest 2: Get TOMORROW tasks');
console.log('-'.repeat(80));
const tomorrowTasks = getTomorrowTasks();
console.log(`Found ${tomorrowTasks.length} tasks`);

const tomorrowTask = tomorrowTasks.find(t => t.title === 'Tomorrow');
if (tomorrowTask) {
  console.log(`  ✓ "Tomorrow" found (start=${tomorrowTask.start})`);
} else {
  console.log('  ✗ "Tomorrow" NOT FOUND');
}

// Test 3: Get upcoming tasks
console.log('\n\nTest 3: Get UPCOMING tasks (filter="upcoming")');
console.log('-'.repeat(80));
const upcomingTasks = getTasksByFilter('upcoming', false);
console.log(`Found ${upcomingTasks.length} tasks`);

const expectedUpcoming = ['Tomorrow', 'Third'];
for (const expected of expectedUpcoming) {
  const found = upcomingTasks.find(t => t.title === expected);
  if (found) {
    console.log(`  ✓ "${expected}" (start=${found.start})`);
  } else {
    console.log(`  ✗ MISSING: "${expected}"`);
  }
}

// Test 4: Verify start field is populated
console.log('\n\nTest 4: Verify "start" field is populated in returned tasks');
console.log('-'.repeat(80));
const sampleTask = todayTasks[0];
if (sampleTask) {
  console.log(`Sample task: "${sampleTask.title}"`);
  console.log(`  start: ${sampleTask.start}`);
  console.log(`  startDate: ${sampleTask.startDate}`);
  console.log(`  startBucket: ${sampleTask.startBucket}`);
  console.log(`  todayIndex: ${sampleTask.todayIndex}`);
  console.log(`  todayIndexReferenceDate: ${sampleTask.todayIndexReferenceDate}`);

  if (sampleTask.start !== undefined && sampleTask.start !== null) {
    console.log('  ✓ start field is populated');
  } else {
    console.log('  ✗ start field is MISSING');
  }
}

// Test 5: Check anytime filter
console.log('\n\nTest 5: Get ANYTIME tasks (filter="anytime")');
console.log('-'.repeat(80));
const anytimeTasks = getTasksByFilter('anytime', false);
console.log(`Found ${anytimeTasks.length} tasks`);
if (anytimeTasks.length > 0) {
  const sample = anytimeTasks[0];
  console.log(`  Sample: "${sample.title}" (start=${sample.start})`);
  if (sample.start === 0) {
    console.log('  ✓ Anytime tasks have start=0');
  } else {
    console.log('  ✗ Anytime tasks should have start=0');
  }
}

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80));

// Summary
const allTestsPassed =
  todayTasks.length === 6 &&
  expectedToday.every(title => todayTasks.some(t => t.title === title)) &&
  tomorrowTasks.some(t => t.title === 'Tomorrow') &&
  upcomingTasks.some(t => t.title === 'Tomorrow') &&
  upcomingTasks.some(t => t.title === 'Third');

if (allTestsPassed) {
  console.log('\n✓ ALL TESTS PASSED');
} else {
  console.log('\n✗ SOME TESTS FAILED');
}
