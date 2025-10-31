/**
 * Migration Runner
 * Executes database migrations
 */

import db from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { up, down, migrateData } from './migrations/001_reconcile_submission_tables.js';

const args = process.argv.slice(2);
const command = args[0];

async function runMigration() {
  console.log('🔄 Migration Runner Starting...\n');

  try {
    if (command === 'up') {
      console.log('Running migration UP...');
      up(db);
      console.log('\n✅ Migration UP completed successfully!\n');
    } else if (command === 'down') {
      console.log('Running migration DOWN...');
      down(db);
      console.log('\n✅ Migration DOWN completed successfully!\n');
    } else if (command === 'migrate-data') {
      console.log('Running data migration...');
      const result = migrateData(db, uuidv4);
      console.log('\n✅ Data migration completed successfully!');
      console.log(`   - ${result.migratedSubmissions} submissions migrated`);
      console.log(`   - ${result.migratedAnswers} answers migrated`);
      console.log(`   - ${result.migratedScores} scores migrated\n`);
    } else {
      console.log('Usage:');
      console.log('  npm run migrate:up          - Run migration');
      console.log('  npm run migrate:down        - Rollback migration');
      console.log('  npm run migrate:data        - Migrate data from new to old tables');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
