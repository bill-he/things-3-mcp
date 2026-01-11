#!/usr/bin/env -S npx tsx

import Database from 'better-sqlite3';
import { findThings3Database } from '../src/database.js';
import { readFileSync, writeFileSync } from 'fs';

function formatValue(value: any): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return value.toString();
}

function printResults(results: any[], showLineNumbers: boolean = true) {
  if (results.length === 0) {
    console.log('No results returned.');
    return;
  }

  // Get column names from first row
  const columns = Object.keys(results[0]);

  // Calculate column widths
  const widths = columns.map(col => {
    const maxDataWidth = Math.max(
      ...results.map(row => formatValue(row[col]).length)
    );
    return Math.max(col.length, maxDataWidth, 4); // min width of 4
  });

  // Print header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(' | ');
  console.log('\n' + header);
  console.log(widths.map(w => '-'.repeat(w)).join('-+-'));

  // Print rows
  results.forEach((row, idx) => {
    const rowStr = columns.map((col, i) =>
      formatValue(row[col]).padEnd(widths[i])
    ).join(' | ');

    if (showLineNumbers) {
      console.log(`${(idx + 1).toString().padStart(3)}. ${rowStr}`);
    } else {
      console.log(rowStr);
    }
  });

  console.log(`\nRows: ${results.length}\n`);
}

function printHelp() {
  console.log(`
Things3 SQLite Query Tool

Usage:
  tsx scripts/query.ts "<SQL_QUERY>"           Execute a SQL query
  tsx scripts/query.ts -f <file>               Execute SQL from a file
  tsx scripts/query.ts -i                      Interactive mode (enter query and press Ctrl+D)
  tsx scripts/query.ts -t                      Show all tables
  tsx scripts/query.ts -s <table>              Show schema for a table
  tsx scripts/query.ts -o <file>               Save output to JSON file
  tsx scripts/query.ts -h                      Show this help

Examples:
  tsx scripts/query.ts "SELECT * FROM TMTask LIMIT 5"
  tsx scripts/query.ts "SELECT title, status FROM TMTask WHERE status = 0"
  tsx scripts/query.ts -t
  tsx scripts/query.ts -s TMTask
  tsx scripts/query.ts -f queries/my-query.sql
  tsx scripts/query.ts -o output.json "SELECT * FROM TMTask LIMIT 5"

Note: Results are output as JSON by default.
Note: Database is opened in READ-ONLY mode for safety.
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    return;
  }

  // JSON output is now the default
  const jsonOutput = true;

  // Check for output file flag
  let outputFile: string | null = null;
  const filteredArgs = args.filter((arg, index) => {
    if (arg === '-o' || arg === '--output') {
      if (index + 1 < args.length) {
        outputFile = args[index + 1];
        return false;
      }
    }
    if (index > 0 && (args[index - 1] === '-o' || args[index - 1] === '--output')) {
      return false;
    }
    return true;
  });

  // Connect to database
  let dbPath: string;
  try {
    dbPath = findThings3Database();
  } catch (error) {
    console.error('Error finding Things3 database:', (error as Error).message);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  if (!jsonOutput) {
    console.log(`Connected to: ${dbPath}\n`);
  }

  try {
    let sql: string = '';

    // Handle different input modes
    if (filteredArgs[0] === '-t' || filteredArgs[0] === '--tables') {
      // Show all tables
      sql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
      const results = db.prepare(sql).all();

      if (jsonOutput) {
        const output = JSON.stringify(results, null, 2);
        if (outputFile) {
          writeFileSync(outputFile, output, 'utf-8');
          console.log(`Results saved to ${outputFile}`);
        } else {
          console.log(output);
        }
      } else {
        console.log('Tables in Things3 database:\n');
        results.forEach((row: any) => console.log(`  - ${row.name}`));
        console.log();
      }

    } else if (filteredArgs[0] === '-s' || filteredArgs[0] === '--schema') {
      // Show schema for a table
      if (filteredArgs.length < 2) {
        console.error('Error: Table name required. Usage: -s <table_name>');
        process.exit(1);
      }
      const tableName = filteredArgs[1];
      sql = `PRAGMA table_info(${tableName})`;
      const results = db.prepare(sql).all();

      if (results.length === 0) {
        if (jsonOutput) {
          const output = JSON.stringify({ error: `Table '${tableName}' not found.` }, null, 2);
          if (outputFile) {
            writeFileSync(outputFile, output, 'utf-8');
            console.log(`Results saved to ${outputFile}`);
          } else {
            console.log(output);
          }
        } else {
          console.log(`Table '${tableName}' not found.`);
        }
      } else {
        if (jsonOutput) {
          const output = JSON.stringify(results, null, 2);
          if (outputFile) {
            writeFileSync(outputFile, output, 'utf-8');
            console.log(`Results saved to ${outputFile}`);
          } else {
            console.log(output);
          }
        } else {
          console.log(`Schema for table '${tableName}':\n`);
          printResults(results, false);
        }
      }

    } else if (filteredArgs[0] === '-f' || filteredArgs[0] === '--file') {
      // Read SQL from file
      if (filteredArgs.length < 2) {
        console.error('Error: File path required. Usage: -f <file_path>');
        process.exit(1);
      }
      try {
        sql = readFileSync(filteredArgs[1], 'utf-8').trim();
      } catch (error) {
        console.error('Error reading file:', (error as Error).message);
        process.exit(1);
      }

    } else if (filteredArgs[0] === '-i' || filteredArgs[0] === '--interactive') {
      // Interactive mode - read from stdin
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      const lines: string[] = [];
      for await (const line of rl) {
        lines.push(line);
      }
      sql = lines.join('\n').trim();

    } else {
      // SQL query passed as argument
      sql = filteredArgs.join(' ').trim();
    }

    if (!sql) {
      console.error('Error: No SQL query provided.');
      process.exit(1);
    }

    if (!jsonOutput) {
      console.log(`Executing query:\n${sql}\n`);
    }

    // Execute query
    const stmt = db.prepare(sql);

    // Check if it's a SELECT query or returns data
    if (sql.trim().toUpperCase().startsWith('SELECT') ||
        sql.trim().toUpperCase().startsWith('PRAGMA')) {
      const results = stmt.all();

      if (jsonOutput) {
        const output = JSON.stringify(results, null, 2);
        if (outputFile) {
          writeFileSync(outputFile, output, 'utf-8');
          console.log(`Results saved to ${outputFile}`);
        } else {
          console.log(output);
        }
      } else {
        printResults(results);
      }
    } else {
      // For non-SELECT queries (though we're readonly, so this shouldn't work)
      const info = stmt.run();

      if (jsonOutput) {
        const output = JSON.stringify({ changes: info.changes }, null, 2);
        if (outputFile) {
          writeFileSync(outputFile, output, 'utf-8');
          console.log(`Results saved to ${outputFile}`);
        } else {
          console.log(output);
        }
      } else {
        console.log('Query executed successfully.');
        console.log(`Changes: ${info.changes}`);
      }
    }

  } catch (error) {
    console.error('Error executing query:', (error as Error).message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
