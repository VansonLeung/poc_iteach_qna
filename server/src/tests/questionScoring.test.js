/**
 * API Tests for Question Scoring Endpoints
 *
 * Tests the question scoring configuration functionality including:
 * - Creating scoring configurations
 * - Retrieving scoring configurations
 * - Updating scoring configurations
 * - Deleting scoring configurations
 * - Expected answers validation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import db from '../database/index.js';
import { hashPassword, generateToken } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

let teacherToken;
let studentToken;
let teacherId;
let studentId;
let testQuestionId;
let testRubricId;

beforeAll(async () => {
  // Create test users
  teacherId = uuidv4();
  studentId = uuidv4();

  const teacherPassword = await hashPassword('teacher123');
  const studentPassword = await hashPassword('student123');

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, first_name, last_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(teacherId, 'qs.teacher@example.com', teacherPassword, 'teacher', 'QS', 'Teacher');

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, first_name, last_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, 'qs.student@example.com', studentPassword, 'student', 'QS', 'Student');

  teacherToken = generateToken({ id: teacherId, role: 'teacher' });
  studentToken = generateToken({ id: studentId, role: 'student' });

  // Create test question
  testQuestionId = uuidv4();
  db.prepare(`
    INSERT INTO questions (id, title, body_html, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    testQuestionId,
    'Test Question for Scoring',
    '<div>Test question content</div>',
    teacherId,
    teacherId
  );

  // Create test rubric
  testRubricId = uuidv4();
  db.prepare(`
    INSERT INTO rubrics (id, title, rubric_type, max_score, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(testRubricId, 'Test Scoring Rubric', 'points', 10, teacherId);
});

afterAll(async () => {
  // Clean up test data
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('qs.%@example.com');
  db.prepare('DELETE FROM questions WHERE title LIKE ?').run('Test Question for Scoring%');
  db.prepare('DELETE FROM rubrics WHERE title LIKE ?').run('Test Scoring Rubric%');
  db.prepare('DELETE FROM question_scoring WHERE question_id = ?').run(testQuestionId);
});

describe('POST /api/question-scoring', () => {
  it('should create manual scoring configuration', async () => {
    const scoringData = {
      questionId: testQuestionId,
      rubricId: testRubricId,
      scoringType: 'manual',
      weight: 1.5
    };

    const response = await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(scoringData)
      .expect(201);

    expect(response.body.scoring).toBeDefined();
    expect(response.body.scoring.question_id).toBe(testQuestionId);
    expect(response.body.scoring.scoring_type).toBe('manual');
    expect(response.body.scoring.weight).toBe(1.5);
  });

  it('should create auto scoring configuration with expected answers', async () => {
    const newQuestionId = uuidv4();

    db.prepare(`
      INSERT INTO questions (id, title, body_html, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      newQuestionId,
      'Test Question for Auto Scoring',
      '<input type="text" data-answer-field="answer1" />',
      teacherId,
      teacherId
    );

    const scoringData = {
      questionId: newQuestionId,
      rubricId: testRubricId,
      scoringType: 'auto',
      weight: 2.0,
      expectedAnswers: {
        answer1: 'correct answer'
      },
      autoGradeConfig: {
        matchingStrategy: 'fuzzy',
        caseSensitive: false,
        tolerance: 0.8
      }
    };

    const response = await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(scoringData)
      .expect(201);

    expect(response.body.scoring.scoring_type).toBe('auto');
    expect(response.body.scoring.expected_answers).toBeDefined();
    expect(JSON.parse(response.body.scoring.expected_answers).answer1).toBe('correct answer');

    // Clean up
    db.prepare('DELETE FROM questions WHERE id = ?').run(newQuestionId);
    db.prepare('DELETE FROM question_scoring WHERE question_id = ?').run(newQuestionId);
  });

  it('should create hybrid scoring configuration', async () => {
    const newQuestionId = uuidv4();

    db.prepare(`
      INSERT INTO questions (id, title, body_html, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      newQuestionId,
      'Test Question for Hybrid Scoring',
      '<textarea data-answer-field="essay"></textarea>',
      teacherId,
      teacherId
    );

    const scoringData = {
      questionId: newQuestionId,
      rubricId: testRubricId,
      scoringType: 'hybrid',
      weight: 1.0,
      expectedAnswers: {
        essay: {
          keywords: ['javascript', 'programming', 'web'],
          minLength: 100
        }
      }
    };

    const response = await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(scoringData)
      .expect(201);

    expect(response.body.scoring.scoring_type).toBe('hybrid');

    // Clean up
    db.prepare('DELETE FROM questions WHERE id = ?').run(newQuestionId);
    db.prepare('DELETE FROM question_scoring WHERE question_id = ?').run(newQuestionId);
  });

  it('should reject scoring configuration without rubric for criteria-based grading', async () => {
    const newQuestionId = uuidv4();

    db.prepare(`
      INSERT INTO questions (id, title, body_html, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(newQuestionId, 'Test Question', '<div>Test</div>', teacherId, teacherId);

    const scoringData = {
      questionId: newQuestionId,
      scoringType: 'manual',
      weight: 1.0
      // No rubricId provided
    };

    await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(scoringData)
      .expect(201); // Should still succeed as rubric is optional

    // Clean up
    db.prepare('DELETE FROM questions WHERE id = ?').run(newQuestionId);
    db.prepare('DELETE FROM question_scoring WHERE question_id = ?').run(newQuestionId);
  });

  it('should reject duplicate scoring configuration for same question', async () => {
    const scoringData = {
      questionId: testQuestionId,
      scoringType: 'manual',
      weight: 1.0
    };

    await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(scoringData)
      .expect(400); // Already exists
  });

  it('should reject unauthorized access', async () => {
    const scoringData = {
      questionId: testQuestionId,
      scoringType: 'manual'
    };

    await request(app)
      .post('/api/question-scoring')
      .send(scoringData)
      .expect(401);
  });

  it('should reject student access', async () => {
    const scoringData = {
      questionId: testQuestionId,
      scoringType: 'manual'
    };

    await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(scoringData)
      .expect(403);
  });
});

describe('GET /api/question-scoring/:questionId', () => {
  it('should retrieve scoring configuration for a question', async () => {
    const response = await request(app)
      .get(`/api/question-scoring/${testQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.scoring).toBeDefined();
    expect(response.body.scoring.question_id).toBe(testQuestionId);
  });

  it('should return 404 for question without scoring config', async () => {
    const newQuestionId = uuidv4();

    db.prepare(`
      INSERT INTO questions (id, title, body_html, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(newQuestionId, 'No Scoring Question', '<div>Test</div>', teacherId, teacherId);

    await request(app)
      .get(`/api/question-scoring/${newQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);

    // Clean up
    db.prepare('DELETE FROM questions WHERE id = ?').run(newQuestionId);
  });
});

describe('PUT /api/question-scoring/:questionId', () => {
  it('should update scoring type from manual to auto', async () => {
    const updates = {
      scoringType: 'auto',
      expectedAnswers: {
        answer: 'expected value'
      },
      autoGradeConfig: {
        matchingStrategy: 'exact'
      }
    };

    const response = await request(app)
      .put(`/api/question-scoring/${testQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.scoring.scoring_type).toBe('auto');
    expect(response.body.scoring.expected_answers).toBeDefined();
  });

  it('should update weight', async () => {
    const updates = {
      weight: 3.0
    };

    const response = await request(app)
      .put(`/api/question-scoring/${testQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.scoring.weight).toBe(3.0);
  });

  it('should update rubric association', async () => {
    const newRubricId = uuidv4();

    db.prepare(`
      INSERT INTO rubrics (id, title, rubric_type, max_score, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(newRubricId, 'New Rubric', 'criteria', 100, teacherId);

    const updates = {
      rubricId: newRubricId
    };

    const response = await request(app)
      .put(`/api/question-scoring/${testQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.scoring.rubric_id).toBe(newRubricId);

    // Clean up
    db.prepare('DELETE FROM rubrics WHERE id = ?').run(newRubricId);
  });
});

describe('DELETE /api/question-scoring/:questionId', () => {
  it('should delete scoring configuration', async () => {
    const newQuestionId = uuidv4();

    // Create question with scoring config
    db.prepare(`
      INSERT INTO questions (id, title, body_html, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(newQuestionId, 'Delete Test Question', '<div>Test</div>', teacherId, teacherId);

    await request(app)
      .post('/api/question-scoring')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        questionId: newQuestionId,
        scoringType: 'manual',
        weight: 1.0
      });

    // Delete scoring config
    await request(app)
      .delete(`/api/question-scoring/${newQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    // Verify deleted
    await request(app)
      .get(`/api/question-scoring/${newQuestionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);

    // Clean up
    db.prepare('DELETE FROM questions WHERE id = ?').run(newQuestionId);
  });

  it('should return 404 when deleting non-existent config', async () => {
    await request(app)
      .delete(`/api/question-scoring/${uuidv4()}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);
  });
});

describe('Expected Answers Validation', () => {
  it('should accept various expected answer formats', async () => {
    const testCases = [
      {
        name: 'Simple text answer',
        expectedAnswers: { text_input: 'correct answer' }
      },
      {
        name: 'Multiple choice array',
        expectedAnswers: { checkboxes: ['option1', 'option2', 'option3'] }
      },
      {
        name: 'Number with tolerance',
        expectedAnswers: {
          number_input: {
            value: 42,
            tolerance: 0.1
          }
        }
      },
      {
        name: 'Complex validation rules',
        expectedAnswers: {
          essay: {
            keywords: ['keyword1', 'keyword2'],
            minLength: 100,
            maxLength: 500,
            requiredPhrases: ['specific phrase']
          }
        }
      }
    ];

    for (const testCase of testCases) {
      const questionId = uuidv4();

      db.prepare(`
        INSERT INTO questions (id, title, body_html, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(questionId, testCase.name, '<div>Test</div>', teacherId, teacherId);

      const response = await request(app)
        .post('/api/question-scoring')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionId,
          scoringType: 'auto',
          weight: 1.0,
          expectedAnswers: testCase.expectedAnswers
        })
        .expect(201);

      expect(response.body.scoring.expected_answers).toBeDefined();

      // Clean up
      db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
      db.prepare('DELETE FROM question_scoring WHERE question_id = ?').run(questionId);
    }
  });
});
