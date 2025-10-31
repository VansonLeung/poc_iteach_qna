/**
 * Database Schema Definition
 * SQLite database with full versioning support for activities, elements, and questions
 */

export const createTables = (db) => {
  // Users table with role-based access
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      first_name TEXT,
      last_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // Activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      tags TEXT, -- JSON array of tags
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
    CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);
  `);

  // Activity versions for full history tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_versions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      tags TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(activity_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_activity_versions_activity_id ON activity_versions(activity_id);
  `);

  // Activity permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_permissions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'archive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_permissions_activity_id ON activity_permissions(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_permissions_user_id ON activity_permissions(user_id);
  `);

  // Questions table with inheritance support
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body_html TEXT NOT NULL, -- HTML content with interactive elements
      parent_question_id TEXT, -- For question inheritance
      tags TEXT, -- JSON array of tags
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_question_id) REFERENCES questions(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_questions_parent_question_id ON questions(parent_question_id);
    CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
  `);

  // Question versions
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_versions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      body_html TEXT NOT NULL,
      parent_question_id TEXT,
      tags TEXT,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(question_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_question_versions_question_id ON question_versions(question_id);
  `);

  // Question permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_permissions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'archive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_question_permissions_question_id ON question_permissions(question_id);
  `);

  // Interactive elements within questions (for UUID tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_interactive_elements (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      element_uuid TEXT NOT NULL, -- UUID embedded in HTML
      element_type TEXT NOT NULL CHECK(element_type IN ('text_input', 'textarea', 'radio', 'checkbox', 'select', 'file_upload')),
      element_label TEXT,
      element_config TEXT, -- JSON config (options for radio/select, validation rules, etc.)
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(question_id, element_uuid)
    );
    CREATE INDEX IF NOT EXISTS idx_question_interactive_elements_question_id ON question_interactive_elements(question_id);
  `);

  // Activity Elements with unlimited nesting support
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_elements (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      parent_element_id TEXT, -- For nested structure
      element_type TEXT NOT NULL CHECK(element_type IN ('section', 'question')),
      question_id TEXT, -- Only populated if element_type = 'question'
      title TEXT, -- For sections
      description TEXT, -- For sections
      order_index INTEGER NOT NULL, -- Order within parent
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      tags TEXT, -- JSON array
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_element_id) REFERENCES activity_elements(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id),
      CHECK ((element_type = 'question' AND question_id IS NOT NULL) OR (element_type = 'section' AND question_id IS NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_elements_activity_id ON activity_elements(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_elements_parent_element_id ON activity_elements(parent_element_id);
    CREATE INDEX IF NOT EXISTS idx_activity_elements_question_id ON activity_elements(question_id);
  `);

  // Activity Element versions
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_element_versions (
      id TEXT PRIMARY KEY,
      element_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      activity_id TEXT NOT NULL,
      parent_element_id TEXT,
      element_type TEXT NOT NULL,
      question_id TEXT,
      title TEXT,
      description TEXT,
      order_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      tags TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (element_id) REFERENCES activity_elements(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(element_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_activity_element_versions_element_id ON activity_element_versions(element_id);
  `);

  // Activity Element permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_element_permissions (
      id TEXT PRIMARY KEY,
      element_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'archive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (element_id) REFERENCES activity_elements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_element_permissions_element_id ON activity_element_permissions(element_id);
  `);

  // User Activity Submissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in-progress' CHECK(status IN ('in-progress', 'submitted', 'archived')),
      version INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT,
      submitted_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (activity_id) REFERENCES activities(id),
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submissions_user_id ON user_activity_submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_submissions_activity_id ON user_activity_submissions(activity_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_submissions_status ON user_activity_submissions(status);
  `);

  // User Activity Submission versions
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submission_versions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES user_activity_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(submission_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_versions_submission_id ON user_activity_submission_versions(submission_id);
  `);

  // User Activity Submission permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submission_permissions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'archive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES user_activity_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_permissions_submission_id ON user_activity_submission_permissions(submission_id);
  `);

  // User Activity Submission Answers
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submission_answers (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      element_uuid TEXT NOT NULL, -- References the interactive element UUID
      answer_data TEXT NOT NULL, -- JSON data containing the user's response
      status TEXT NOT NULL DEFAULT 'in-progress' CHECK(status IN ('in-progress', 'submitted', 'archived')),
      version INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT,
      submitted_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES user_activity_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_answers_submission_id ON user_activity_submission_answers(submission_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_answers_question_id ON user_activity_submission_answers(question_id);
  `);

  // User Activity Submission Answer versions
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submission_answer_versions (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      element_uuid TEXT NOT NULL,
      answer_data TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (answer_id) REFERENCES user_activity_submission_answers(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(answer_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_answer_versions_answer_id ON user_activity_submission_answer_versions(answer_id);
  `);

  // User Activity Submission Answer permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_submission_answer_permissions (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      permission_type TEXT NOT NULL CHECK(permission_type IN ('view', 'edit', 'archive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (answer_id) REFERENCES user_activity_submission_answers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_submission_answer_permissions_answer_id ON user_activity_submission_answer_permissions(answer_id);
  `);

  console.log('✓ All database tables created successfully');
};
