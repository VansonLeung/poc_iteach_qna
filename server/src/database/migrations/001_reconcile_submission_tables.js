/**
 * Migration 001: Reconcile Duplicate Submission Tables
 *
 * This migration adds grading fields to the original submission tables
 * and provides utilities to migrate data from the new tables to old ones.
 */

export const up = (db) => {
  console.log('Running migration 001: Reconcile submission tables...');

  // Step 1: Add grading fields to user_activity_submissions
  console.log('  → Adding grading fields to user_activity_submissions...');

  try {
    db.exec(`
      ALTER TABLE user_activity_submissions ADD COLUMN total_score REAL;
      ALTER TABLE user_activity_submissions ADD COLUMN max_possible_score REAL;
      ALTER TABLE user_activity_submissions ADD COLUMN percentage REAL;
      ALTER TABLE user_activity_submissions ADD COLUMN instructor_feedback TEXT;
      ALTER TABLE user_activity_submissions ADD COLUMN graded_by TEXT REFERENCES users(id);
      ALTER TABLE user_activity_submissions ADD COLUMN graded_at TEXT;
    `);
    console.log('  ✓ Added grading fields to user_activity_submissions');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('  ⚠ Grading fields already exist in user_activity_submissions');
  }

  // Step 2: Add grading fields to user_activity_submission_answers
  console.log('  → Adding grading fields to user_activity_submission_answers...');

  try {
    db.exec(`
      ALTER TABLE user_activity_submission_answers ADD COLUMN is_auto_graded INTEGER DEFAULT 0;
      ALTER TABLE user_activity_submission_answers ADD COLUMN auto_grade_result TEXT;
    `);
    console.log('  ✓ Added grading fields to user_activity_submission_answers');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('  ⚠ Grading fields already exist in user_activity_submission_answers');
  }

  // Step 3: Create submission_answer_scores table
  console.log('  → Creating submission_answer_scores table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_answer_scores (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL,
      rubric_id TEXT,
      criteria_scores TEXT,
      feedback TEXT,
      graded_by TEXT NOT NULL,
      graded_at TEXT NOT NULL DEFAULT (datetime('now')),
      version INTEGER DEFAULT 1,
      is_current INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (answer_id) REFERENCES user_activity_submission_answers(id) ON DELETE CASCADE,
      FOREIGN KEY (submission_id) REFERENCES user_activity_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE SET NULL,
      FOREIGN KEY (graded_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_answer_id ON submission_answer_scores(answer_id);
    CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_submission_id ON submission_answer_scores(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_is_current ON submission_answer_scores(is_current);
  `);

  console.log('  ✓ Created submission_answer_scores table');

  console.log('✓ Migration 001 completed successfully');
};

export const down = (db) => {
  console.log('Rolling back migration 001...');

  // Drop the new scores table
  db.exec(`DROP TABLE IF EXISTS submission_answer_scores;`);
  console.log('  ✓ Dropped submission_answer_scores table');

  // Note: Cannot remove columns in SQLite without recreating table
  // So we leave the added columns in place
  console.log('  ⚠ Cannot remove added columns in SQLite (left in place)');

  console.log('✓ Migration 001 rolled back');
};

/**
 * Migrate data from new tables (activity_submissions, question_responses)
 * to old tables (user_activity_submissions, user_activity_submission_answers)
 */
export const migrateData = (db, uuidv4) => {
  console.log('Migrating data from new tables to old tables...');

  let migratedSubmissions = 0;
  let migratedAnswers = 0;
  let migratedScores = 0;

  // Get all submissions from new table
  const newSubmissions = db.prepare('SELECT * FROM activity_submissions').all();

  for (const newSub of newSubmissions) {
    // Check if already exists in old table
    const existing = db.prepare(`
      SELECT id FROM user_activity_submissions
      WHERE user_id = ? AND activity_id = ?
    `).get(newSub.user_id, newSub.activity_id);

    let oldSubmissionId;

    if (!existing) {
      // Create in old table
      oldSubmissionId = uuidv4();

      const status = newSub.status === 'draft' ? 'in-progress' :
                     newSub.status === 'graded' || newSub.status === 'returned' ? 'submitted' :
                     newSub.status;

      db.prepare(`
        INSERT INTO user_activity_submissions (
          id, user_id, activity_id, status, submitted_at,
          submitted_by, updated_by, total_score, max_possible_score,
          percentage, instructor_feedback, graded_by, graded_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oldSubmissionId,
        newSub.user_id,
        newSub.activity_id,
        status,
        newSub.submitted_at,
        newSub.user_id, // submitted_by
        newSub.user_id, // updated_by
        newSub.total_score,
        newSub.max_possible_score,
        newSub.percentage,
        newSub.instructor_feedback,
        newSub.graded_by,
        newSub.graded_at,
        newSub.created_at,
        newSub.updated_at
      );

      migratedSubmissions++;
    } else {
      oldSubmissionId = existing.id;

      // Update grading fields if they exist
      if (newSub.total_score !== null || newSub.graded_by !== null) {
        db.prepare(`
          UPDATE user_activity_submissions
          SET total_score = ?, max_possible_score = ?, percentage = ?,
              instructor_feedback = ?, graded_by = ?, graded_at = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          newSub.total_score,
          newSub.max_possible_score,
          newSub.percentage,
          newSub.instructor_feedback,
          newSub.graded_by,
          newSub.graded_at,
          newSub.updated_at,
          oldSubmissionId
        );
      }
    }

    // Migrate question_responses to user_activity_submission_answers
    const responses = db.prepare(`
      SELECT * FROM question_responses WHERE submission_id = ?
    `).all(newSub.id);

    for (const resp of responses) {
      // Try to extract element_uuid from response_data
      let elementUuid = 'migrated_' + uuidv4();

      try {
        const responseData = JSON.parse(resp.response_data);
        // If there's a single key, use it as element_uuid
        const keys = Object.keys(responseData);
        if (keys.length === 1) {
          elementUuid = keys[0];
        }
      } catch (e) {
        // If can't parse, use generated UUID
      }

      // Check if answer already exists
      const existingAnswer = db.prepare(`
        SELECT id FROM user_activity_submission_answers
        WHERE submission_id = ? AND question_id = ? AND element_uuid = ?
      `).get(oldSubmissionId, resp.question_id, elementUuid);

      let answerId;

      if (!existingAnswer) {
        answerId = uuidv4();

        db.prepare(`
          INSERT INTO user_activity_submission_answers (
            id, submission_id, question_id, element_uuid, answer_data,
            status, submitted_by, updated_by, is_auto_graded, auto_grade_result,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          answerId,
          oldSubmissionId,
          resp.question_id,
          elementUuid,
          resp.response_data,
          'submitted',
          newSub.user_id,
          newSub.user_id,
          resp.is_auto_graded || 0,
          resp.auto_grade_result,
          resp.created_at,
          resp.updated_at
        );

        migratedAnswers++;
      } else {
        answerId = existingAnswer.id;
      }

      // Migrate question_scores to submission_answer_scores
      const scores = db.prepare(`
        SELECT * FROM question_scores WHERE response_id = ?
      `).all(resp.id);

      for (const score of scores) {
        const existingScore = db.prepare(`
          SELECT id FROM submission_answer_scores
          WHERE answer_id = ? AND version = ?
        `).get(answerId, score.version);

        if (!existingScore) {
          db.prepare(`
            INSERT INTO submission_answer_scores (
              id, answer_id, submission_id, question_id, score, max_score,
              rubric_id, criteria_scores, feedback, graded_by, graded_at,
              version, is_current, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            answerId,
            oldSubmissionId,
            score.question_id,
            score.score,
            score.max_score,
            score.rubric_id,
            score.criteria_scores,
            score.feedback,
            score.graded_by,
            score.graded_at,
            score.version,
            score.is_current,
            score.created_at
          );

          migratedScores++;
        }
      }
    }
  }

  console.log(`✓ Migrated ${migratedSubmissions} submissions`);
  console.log(`✓ Migrated ${migratedAnswers} answers`);
  console.log(`✓ Migrated ${migratedScores} scores`);
  console.log('✓ Data migration completed');

  return { migratedSubmissions, migratedAnswers, migratedScores };
};
