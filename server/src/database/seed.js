import { v4 as uuidv4 } from 'uuid';
import db from './index.js';
import { hashPassword } from '../utils/crypto.js';

/**
 * Seed database with sample data
 */
async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create sample users
    const adminId = uuidv4();
    const teacherId = uuidv4();
    const studentId = uuidv4();

    const adminPassword = await hashPassword('admin123');
    const teacherPassword = await hashPassword('teacher123');
    const studentPassword = await hashPassword('student123');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin@example.com', adminPassword, 'admin', 'Admin', 'User');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(teacherId, 'teacher@example.com', teacherPassword, 'teacher', 'Jane', 'Teacher');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(studentId, 'student@example.com', studentPassword, 'student', 'John', 'Student');

    console.log('✓ Created 3 sample users (admin, teacher, student)');

    // Create sample questions
    const question1Id = uuidv4();
    const question2Id = uuidv4();
    const question3Id = uuidv4();

    const question1Html = `
      <div class="question-content">
        <h3>What is JavaScript?</h3>
        <p>Please provide a comprehensive explanation of JavaScript and its use cases.</p>
        <div class="form-group">
          <label data-element-label="Your Answer">Your Answer:</label>
          <textarea
            data-element-uuid="${uuidv4()}"
            data-element-type="textarea"
            placeholder="Type your answer here..."
            rows="5"
          ></textarea>
        </div>
      </div>
    `;

    const question2Html = `
      <div class="question-content">
        <h3>Which of the following are valid JavaScript data types?</h3>
        <p>Select all that apply.</p>
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              data-element-uuid="${uuidv4()}"
              data-element-type="checkbox"
              data-element-label="String"
              value="string"
            />
            String
          </label>
        </div>
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              data-element-uuid="${uuidv4()}"
              data-element-type="checkbox"
              data-element-label="Number"
              value="number"
            />
            Number
          </label>
        </div>
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              data-element-uuid="${uuidv4()}"
              data-element-type="checkbox"
              data-element-label="Boolean"
              value="boolean"
            />
            Boolean
          </label>
        </div>
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              data-element-uuid="${uuidv4()}"
              data-element-type="checkbox"
              data-element-label="Character"
              value="character"
            />
            Character
          </label>
        </div>
      </div>
    `;

    const question3Html = `
      <div class="question-content">
        <h3>What is your experience level with programming?</h3>
        <div class="form-group">
          <label>
            <input
              type="radio"
              name="experience"
              data-element-uuid="${uuidv4()}"
              data-element-type="radio"
              data-element-label="Beginner"
              value="beginner"
            />
            Beginner (Less than 1 year)
          </label>
        </div>
        <div class="form-group">
          <label>
            <input
              type="radio"
              name="experience"
              data-element-uuid="${uuidv4()}"
              data-element-type="radio"
              data-element-label="Intermediate"
              value="intermediate"
            />
            Intermediate (1-3 years)
          </label>
        </div>
        <div class="form-group">
          <label>
            <input
              type="radio"
              name="experience"
              data-element-uuid="${uuidv4()}"
              data-element-type="radio"
              data-element-label="Advanced"
              value="advanced"
            />
            Advanced (3+ years)
          </label>
        </div>
      </div>
    `;

    db.prepare(`
      INSERT INTO questions (id, title, body_html, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      question1Id,
      'What is JavaScript?',
      question1Html,
      JSON.stringify(['javascript', 'basics', 'programming']),
      teacherId,
      teacherId
    );

    db.prepare(`
      INSERT INTO questions (id, title, body_html, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      question2Id,
      'JavaScript Data Types',
      question2Html,
      JSON.stringify(['javascript', 'data-types', 'multiple-choice']),
      teacherId,
      teacherId
    );

    db.prepare(`
      INSERT INTO questions (id, title, body_html, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      question3Id,
      'Programming Experience Level',
      question3Html,
      JSON.stringify(['survey', 'experience']),
      teacherId,
      teacherId
    );

    // Save question versions
    [question1Id, question2Id, question3Id].forEach((qId, index) => {
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(qId);
      db.prepare(`
        INSERT INTO question_versions (id, question_id, version, title, body_html, tags, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        qId,
        1,
        question.title,
        question.body_html,
        question.tags,
        question.status,
        teacherId
      );
    });

    console.log('✓ Created 3 sample questions');

    // Extract and save interactive elements for questions
    const extractAndSaveElements = (questionId, html) => {
      const uuidRegex = /data-element-uuid="([^"]+)"/g;
      const uuids = [...html.matchAll(uuidRegex)].map(m => m[1]);

      const typeRegex = /data-element-type="([^"]+)"/g;
      const types = [...html.matchAll(typeRegex)].map(m => m[1]);

      const labelRegex = /data-element-label="([^"]+)"/g;
      const labels = [...html.matchAll(labelRegex)].map(m => m[1]);

      uuids.forEach((uuid, index) => {
        db.prepare(`
          INSERT INTO question_interactive_elements (id, question_id, element_uuid, element_type, element_label)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), questionId, uuid, types[index] || 'text_input', labels[index] || '');
      });
    };

    extractAndSaveElements(question1Id, question1Html);
    extractAndSaveElements(question2Id, question2Html);
    extractAndSaveElements(question3Id, question3Html);

    console.log('✓ Extracted and saved interactive elements');

    // Create sample activity
    const activityId = uuidv4();
    db.prepare(`
      INSERT INTO activities (id, title, description, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      activityId,
      'Introduction to JavaScript',
      'A comprehensive introduction to JavaScript programming covering basics, data types, and best practices.',
      JSON.stringify(['javascript', 'beginner', 'programming']),
      teacherId,
      teacherId
    );

    // Save activity version
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    db.prepare(`
      INSERT INTO activity_versions (id, activity_id, version, title, description, status, tags, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      activityId,
      1,
      activity.title,
      activity.description,
      activity.status,
      activity.tags,
      teacherId
    );

    console.log('✓ Created 1 sample activity');

    // Create activity elements
    const element1Id = uuidv4();
    const element2Id = uuidv4();
    const element3Id = uuidv4();
    const element4Id = uuidv4();

    // Section element
    db.prepare(`
      INSERT INTO activity_elements
      (id, activity_id, element_type, title, description, order_index, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      element1Id,
      activityId,
      'section',
      'Part 1: Understanding JavaScript',
      'This section covers the fundamental concepts of JavaScript',
      0,
      JSON.stringify(['introduction']),
      teacherId,
      teacherId
    );

    // Question elements under section
    db.prepare(`
      INSERT INTO activity_elements
      (id, activity_id, parent_element_id, element_type, question_id, order_index, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      element2Id,
      activityId,
      element1Id,
      'question',
      question1Id,
      0,
      JSON.stringify([]),
      teacherId,
      teacherId
    );

    db.prepare(`
      INSERT INTO activity_elements
      (id, activity_id, parent_element_id, element_type, question_id, order_index, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      element3Id,
      activityId,
      element1Id,
      'question',
      question2Id,
      1,
      JSON.stringify([]),
      teacherId,
      teacherId
    );

    // Standalone question element
    db.prepare(`
      INSERT INTO activity_elements
      (id, activity_id, element_type, question_id, order_index, tags, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      element4Id,
      activityId,
      'question',
      question3Id,
      1,
      JSON.stringify([]),
      teacherId,
      teacherId
    );

    // Save element versions
    [element1Id, element2Id, element3Id, element4Id].forEach(eId => {
      const element = db.prepare('SELECT * FROM activity_elements WHERE id = ?').get(eId);
      db.prepare(`
        INSERT INTO activity_element_versions
        (id, element_id, version, activity_id, parent_element_id, element_type, question_id, title, description, order_index, status, tags, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        eId,
        1,
        element.activity_id,
        element.parent_element_id,
        element.element_type,
        element.question_id,
        element.title,
        element.description,
        element.order_index,
        element.status,
        element.tags,
        teacherId
      );
    });

    console.log('✓ Created 4 activity elements (1 section with 2 nested questions, 1 standalone question)');

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅ Database seeded successfully!                        ║
║                                                           ║
║   Sample Credentials:                                     ║
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║   Admin:                                                  ║
║     Email: admin@example.com                              ║
║     Password: admin123                                    ║
║                                                           ║
║   Teacher:                                                ║
║     Email: teacher@example.com                            ║
║     Password: teacher123                                  ║
║                                                           ║
║   Student:                                                ║
║     Email: student@example.com                            ║
║     Password: student123                                  ║
║                                                           ║
║   Sample Data Created:                                    ║
║   - 3 Users (admin, teacher, student)                     ║
║   - 3 Questions                                           ║
║   - 1 Activity with 4 elements                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export default seed;
