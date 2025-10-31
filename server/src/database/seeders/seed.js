import { v4 as uuidv4 } from 'uuid';
import {
  sequelize,
  User,
  Activity,
  ActivityVersion,
  Question,
  ActivityElement
} from '../../models/index.js';
import { hashPassword } from '../../utils/crypto.js';

/**
 * Seed database with sample data using Sequelize
 */
async function seed() {
  console.log('🌱 Seeding database with Sequelize...');

  // Sync database (create tables if they don't exist)
  console.log('📊 Syncing database schema...');
  await sequelize.sync({ force: true }); // force: true will drop existing tables and recreate them
  console.log('✓ Database schema synced');

  const transaction = await sequelize.transaction();

  try {
    // Create sample users
    const adminId = uuidv4();
    const teacherId = uuidv4();
    const studentId = uuidv4();

    const adminPassword = await hashPassword('admin123');
    const teacherPassword = await hashPassword('teacher123');
    const studentPassword = await hashPassword('student123');

    await User.create({
      id: adminId,
      email: 'admin@example.com',
      password_hash: adminPassword,
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }, { transaction });

    await User.create({
      id: teacherId,
      email: 'teacher@example.com',
      password_hash: teacherPassword,
      role: 'teacher',
      first_name: 'Jane',
      last_name: 'Teacher'
    }, { transaction });

    await User.create({
      id: studentId,
      email: 'student@example.com',
      password_hash: studentPassword,
      role: 'student',
      first_name: 'John',
      last_name: 'Student'
    }, { transaction });

    console.log('✓ Created 3 sample users');

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
      </div>
    `;

    await Question.create({
      id: question1Id,
      title: 'What is JavaScript?',
      body_html: question1Html,
      tags: ['javascript', 'basics', 'programming'],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    await Question.create({
      id: question2Id,
      title: 'JavaScript Data Types',
      body_html: question2Html,
      tags: ['javascript', 'data-types', 'multiple-choice'],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    await Question.create({
      id: question3Id,
      title: 'Programming Experience Level',
      body_html: question3Html,
      tags: ['survey', 'experience'],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    console.log('✓ Created 3 sample questions');

    // Note: Interactive elements are parsed directly from question HTML at runtime
    // No need to store them separately - they're identified by data-element-uuid attributes

    // Create sample activity
    const activityId = uuidv4();
    const activity = await Activity.create({
      id: activityId,
      title: 'Introduction to JavaScript',
      description: 'A comprehensive introduction to JavaScript programming covering basics, data types, and best practices.',
      tags: ['javascript', 'beginner', 'programming'],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    // Save activity version
    await ActivityVersion.create({
      id: uuidv4(),
      activity_id: activityId,
      version: 1,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      tags: activity.tags,
      created_by: teacherId
    }, { transaction });

    console.log('✓ Created 1 sample activity');

    // Create activity elements
    const element1Id = uuidv4();
    const element2Id = uuidv4();
    const element3Id = uuidv4();

    // Section element
    await ActivityElement.create({
      id: element1Id,
      activity_id: activityId,
      element_type: 'section',
      title: 'Part 1: Understanding JavaScript',
      description: 'This section covers the fundamental concepts of JavaScript',
      order_index: 0,
      tags: ['introduction'],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    // Question elements under section
    await ActivityElement.create({
      id: element2Id,
      activity_id: activityId,
      parent_element_id: element1Id,
      element_type: 'question',
      question_id: question1Id,
      order_index: 0,
      tags: [],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    await ActivityElement.create({
      id: element3Id,
      activity_id: activityId,
      parent_element_id: element1Id,
      element_type: 'question',
      question_id: question2Id,
      order_index: 1,
      tags: [],
      created_by: teacherId,
      updated_by: teacherId
    }, { transaction });

    console.log('✓ Created 3 activity elements');

    // Commit transaction
    await transaction.commit();

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅ Database seeded successfully with Sequelize!        ║
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
║   - 3 Questions with interactive elements                 ║
║   - 1 Activity with 3 elements                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
seed()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });

export default seed;
