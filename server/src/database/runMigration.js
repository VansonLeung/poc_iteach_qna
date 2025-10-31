/**
 * Migration Runner
 * Executes database migrations
 */

import models from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { up as up001, down as down001, migrateData } from './migrations/001_reconcile_submission_tables.js';
import { up as up002, down as down002 } from './migrations/002_add_field_scores_to_question_scoring.js';

const args = process.argv.slice(2);
const command = args[0];

// Migration registry - add new migrations here
const migrations = [
  { number: '001', name: 'Reconcile submission tables', up: up001, down: down001 },
  { number: '002', name: 'Add field_scores to question_scoring', up: up002, down: down002 },
];

async function runMigration() {
  console.log('🔄 Migration Runner Starting...\n');

  try {
    const queryInterface = models.sequelize.getQueryInterface();
    const Sequelize = models.sequelize.Sequelize;

    if (command === 'up') {
      console.log('Running migrations UP...');
      for (const migration of migrations) {
        console.log(`Running migration ${migration.number}: ${migration.name}...`);
        await migration.up(queryInterface, Sequelize);
        console.log(`✓ Migration ${migration.number} completed successfully\n`);
      }
      console.log('✅ All migrations UP completed successfully!\n');
    } else if (command === 'down') {
      console.log('Running migrations DOWN...');
      // Run in reverse order
      for (const migration of [...migrations].reverse()) {
        console.log(`Rolling back migration ${migration.number}: ${migration.name}...`);
        await migration.down(queryInterface, Sequelize);
        console.log(`✓ Migration ${migration.number} rolled back successfully\n`);
      }
      console.log('✅ All migrations DOWN completed successfully!\n');
    } else if (command === 'migrate-data') {
      console.log('Running data migration...');
      const result = migrateData(models, uuidv4);
      console.log('\n✅ Data migration completed successfully!');
      console.log(`   - ${result.migratedSubmissions} submissions migrated`);
      console.log(`   - ${result.migratedAnswers} answers migrated`);
      console.log(`   - ${result.migratedScores} scores migrated\n`);
    } else {
      console.log('Usage:');
      console.log('  npm run migrate:up          - Run all migrations');
      console.log('  npm run migrate:down        - Rollback all migrations');
      console.log('  npm run migrate:data        - Migrate data from new to old tables');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
