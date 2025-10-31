# Migration 001: Reconcile Duplicate Submission Tables

**Date:** 2025-10-31
**Status:** Pending
**Type:** Schema Consolidation

## Problem Statement

The database schema currently has **two separate submission tracking systems**:

### Old System (Comprehensive)
- `user_activity_submissions` - Main submission tracking
- `user_activity_submission_versions` - Full version history
- `user_activity_submission_permissions` - Access control
- `user_activity_submission_answers` - Individual answers
- `user_activity_submission_answer_versions` - Answer version history
- `user_activity_submission_answer_permissions` - Answer-level permissions

### New System (Grading-Focused)
- `activity_submissions` - Simplified submission with grading fields
- `question_responses` - Individual question answers
- `question_scores` - Grading results with version history

## Issues

1. **Data Fragmentation**: Code must choose which system to use, leading to inconsistency
2. **Feature Overlap**: Both track submissions and answers, but with different capabilities
3. **Missing Features**:
   - Old system lacks grading fields (score, rubric, feedback)
   - New system lacks comprehensive versioning and permissions
4. **Migration Risk**: Existing data in old tables, new code uses new tables

## Recommended Solution: Hybrid Approach

Keep **both systems** but clearly define their roles and establish data flow:

### Decision: Use Old Tables as Primary, New Tables for Grading

**Rationale:**
- Old system has comprehensive versioning and permissions (critical for audit trail)
- New grading fields can be added to old tables
- Backwards compatible - existing data remains intact

### Migration Steps

#### Step 1: Add Grading Fields to Old Tables

Add grading-related columns to `user_activity_submissions`:

```sql
ALTER TABLE user_activity_submissions
  ADD COLUMN total_score REAL;

ALTER TABLE user_activity_submissions
  ADD COLUMN max_possible_score REAL;

ALTER TABLE user_activity_submissions
  ADD COLUMN percentage REAL;

ALTER TABLE user_activity_submissions
  ADD COLUMN instructor_feedback TEXT;

ALTER TABLE user_activity_submissions
  ADD COLUMN graded_by TEXT REFERENCES users(id);

ALTER TABLE user_activity_submissions
  ADD COLUMN graded_at TEXT;
```

Add grading fields to `user_activity_submission_answers`:

```sql
ALTER TABLE user_activity_submission_answers
  ADD COLUMN is_auto_graded INTEGER DEFAULT 0;

ALTER TABLE user_activity_submission_answers
  ADD COLUMN auto_grade_result TEXT;
```

#### Step 2: Create Grading Scores Table (Enhanced)

Create a new table for grading history that references old submission tables:

```sql
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

CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_answer_id
  ON submission_answer_scores(answer_id);
CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_submission_id
  ON submission_answer_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_answer_scores_is_current
  ON submission_answer_scores(is_current);
```

#### Step 3: Deprecate New Tables

Mark new tables as deprecated with comments:

```sql
-- DEPRECATED: Use user_activity_submissions instead
-- This table exists for backwards compatibility only
-- New code should use user_activity_submissions with grading fields
CREATE TABLE IF NOT EXISTS activity_submissions (
  -- ... existing schema
);

-- DEPRECATED: Use user_activity_submission_answers instead
CREATE TABLE IF NOT EXISTS question_responses (
  -- ... existing schema
);

-- DEPRECATED: Use submission_answer_scores instead
CREATE TABLE IF NOT EXISTS question_scores (
  -- ... existing schema
);
```

#### Step 4: Create Data Migration Script

Migrate existing data from new tables to old tables:

```javascript
// migrate-submissions.js
import db from './index.js';
import { v4 as uuidv4 } from 'uuid';

function migrateSubmissions() {
  // Get all records from activity_submissions
  const newSubmissions = db.prepare('SELECT * FROM activity_submissions').all();

  for (const newSub of newSubmissions) {
    // Check if already exists in old table
    const existing = db.prepare(`
      SELECT id FROM user_activity_submissions
      WHERE user_id = ? AND activity_id = ?
    `).get(newSub.user_id, newSub.activity_id);

    if (!existing) {
      // Create in old table
      const submissionId = uuidv4();
      db.prepare(`
        INSERT INTO user_activity_submissions (
          id, user_id, activity_id, status, submitted_at,
          submitted_by, updated_by, total_score, max_possible_score,
          percentage, instructor_feedback, graded_by, graded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        submissionId,
        newSub.user_id,
        newSub.activity_id,
        newSub.status,
        newSub.submitted_at,
        newSub.user_id, // submitted_by
        newSub.user_id, // updated_by
        newSub.total_score,
        newSub.max_possible_score,
        newSub.percentage,
        newSub.instructor_feedback,
        newSub.graded_by,
        newSub.graded_at
      );

      // Migrate question_responses to user_activity_submission_answers
      const responses = db.prepare(`
        SELECT * FROM question_responses WHERE submission_id = ?
      `).all(newSub.id);

      for (const resp of responses) {
        // Extract element_uuid from response_data or generate
        // This requires parsing the response_data JSON
        // ... migration logic
      }
    }
  }

  console.log('✓ Migrated submissions from new tables to old tables');
}
```

#### Step 5: Update API Routes

Update all API routes to use old tables:

```javascript
// Before (using new tables)
import ActivitySubmission from '../models/ActivitySubmission.js';
import QuestionResponse from '../models/QuestionResponse.js';

// After (using old tables)
import UserActivitySubmission from '../models/UserActivitySubmission.js';
import UserActivitySubmissionAnswer from '../models/UserActivitySubmissionAnswer.js';
import SubmissionAnswerScore from '../models/SubmissionAnswerScore.js';
```

### Alternative Solution: Remove Old Tables

If versioning/permissions are not critical:

1. Drop old submission tables
2. Keep new tables as primary
3. Add missing features (versioning, permissions) to new tables
4. Simpler structure but loses audit trail

**Not recommended** due to data loss and reduced audit capabilities.

## Implementation Checklist

- [ ] Review and approve migration plan
- [ ] Backup production database
- [ ] Add grading fields to `user_activity_submissions`
- [ ] Add grading fields to `user_activity_submission_answers`
- [ ] Create `submission_answer_scores` table
- [ ] Write data migration script
- [ ] Test migration with sample data
- [ ] Update Sequelize models to use old tables
- [ ] Update API routes to use old tables
- [ ] Update frontend to use correct API endpoints
- [ ] Mark new tables as deprecated in schema
- [ ] Document the decision in README
- [ ] Consider removing deprecated tables in future version

## Rollback Plan

If migration fails:

1. Restore database from backup
2. Revert code changes to API routes
3. Continue using new tables temporarily
4. Investigate issues and retry migration

## Timeline

- **Phase 1** (Week 1): Schema updates, model creation
- **Phase 2** (Week 2): Data migration script, testing
- **Phase 3** (Week 3): API updates, frontend updates
- **Phase 4** (Week 4): Production deployment, monitoring

## Notes

- This migration is **non-destructive** - keeps both table sets during transition
- Deprecated tables can be removed in a future version after verification
- All existing features continue to work during migration
