/**
 * Migration: Add field_scores and max_score to question_scoring table
 * 
 * Purpose: Support per-field scoring with configurable points and penalties
 * 
 * Schema Changes:
 * - Add field_scores (TEXT/JSON) column to store per-field configuration
 * - Add max_score (FLOAT) column to store total question score
 * 
 * Data Structure Example:
 * field_scores: {
 *   "uuid-1": { points: 5, wrongPenalty: -1, blankPenalty: -1 },
 *   "uuid-2": { points: 3, wrongPenalty: 0, blankPenalty: 0 }
 * }
 */

export async function up(queryInterface, Sequelize) {
  console.log('Starting migration: add field_scores and max_score columns...');

  try {
    // Add field_scores column (JSON stored as TEXT)
    await queryInterface.addColumn('question_scoring', 'field_scores', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON object storing per-field points and penalties',
    });
    console.log('✓ Added field_scores column');

    // Add max_score column
    await queryInterface.addColumn('question_scoring', 'max_score', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Maximum score for the question',
    });
    console.log('✓ Added max_score column');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  console.log('Rolling back migration: removing field_scores and max_score columns...');

  try {
    await queryInterface.removeColumn('question_scoring', 'field_scores');
    console.log('✓ Removed field_scores column');

    await queryInterface.removeColumn('question_scoring', 'max_score');
    console.log('✓ Removed max_score column');

    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}
