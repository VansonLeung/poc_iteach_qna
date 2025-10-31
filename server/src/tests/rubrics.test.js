/**
 * API Tests for Rubrics Endpoints
 *
 * Tests the rubric management functionality including:
 * - Creating rubrics with criteria and levels
 * - Retrieving rubrics
 * - Updating rubrics
 * - Deleting/archiving rubrics
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
  `).run(teacherId, 'test.teacher@example.com', teacherPassword, 'teacher', 'Test', 'Teacher');

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, first_name, last_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, 'test.student@example.com', studentPassword, 'student', 'Test', 'Student');

  teacherToken = generateToken({ id: teacherId, role: 'teacher' });
  studentToken = generateToken({ id: studentId, role: 'student' });
});

afterAll(async () => {
  // Clean up test data
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('test.%@example.com');
  db.prepare('DELETE FROM rubrics WHERE title LIKE ?').run('Test %');
});

describe('POST /api/rubrics', () => {
  it('should create a criteria-based rubric with nested criteria and levels', async () => {
    const rubricData = {
      title: 'Test Essay Rubric',
      description: 'Test rubric for essays',
      rubricType: 'criteria',
      maxScore: 100,
      criteria: [
        {
          criterionName: 'Content',
          description: 'Quality of content',
          maxScore: 50,
          orderIndex: 0,
          levels: [
            { levelName: 'Excellent', description: 'Outstanding work', scoreValue: 50, orderIndex: 0 },
            { levelName: 'Good', description: 'Good work', scoreValue: 35, orderIndex: 1 },
            { levelName: 'Fair', description: 'Acceptable work', scoreValue: 25, orderIndex: 2 },
          ]
        },
        {
          criterionName: 'Organization',
          description: 'Structure and flow',
          maxScore: 50,
          orderIndex: 1,
          levels: [
            { levelName: 'Excellent', description: 'Well organized', scoreValue: 50, orderIndex: 0 },
            { levelName: 'Good', description: 'Mostly organized', scoreValue: 35, orderIndex: 1 },
          ]
        }
      ]
    };

    const response = await request(app)
      .post('/api/rubrics')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(rubricData)
      .expect(201);

    expect(response.body.rubric).toBeDefined();
    expect(response.body.rubric.title).toBe('Test Essay Rubric');
    expect(response.body.rubric.rubric_type).toBe('criteria');
    expect(response.body.rubric.max_score).toBe(100);
    expect(response.body.criteria).toHaveLength(2);
    expect(response.body.criteria[0].levels).toHaveLength(3);

    testRubricId = response.body.rubric.id;
  });

  it('should create a points-based rubric without criteria', async () => {
    const rubricData = {
      title: 'Test Points Rubric',
      description: 'Simple points rubric',
      rubricType: 'points',
      maxScore: 10
    };

    const response = await request(app)
      .post('/api/rubrics')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(rubricData)
      .expect(201);

    expect(response.body.rubric.rubric_type).toBe('points');
    expect(response.body.criteria).toBeUndefined();
  });

  it('should reject rubric creation without authentication', async () => {
    const rubricData = {
      title: 'Unauthorized Rubric',
      rubricType: 'points',
      maxScore: 10
    };

    await request(app)
      .post('/api/rubrics')
      .send(rubricData)
      .expect(401);
  });

  it('should reject rubric creation by students', async () => {
    const rubricData = {
      title: 'Student Rubric',
      rubricType: 'points',
      maxScore: 10
    };

    await request(app)
      .post('/api/rubrics')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(rubricData)
      .expect(403);
  });

  it('should validate required fields', async () => {
    await request(app)
      .post('/api/rubrics')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Missing Type' })
      .expect(400);
  });
});

describe('GET /api/rubrics', () => {
  it('should retrieve all active rubrics', async () => {
    const response = await request(app)
      .get('/api/rubrics')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.rubrics).toBeDefined();
    expect(Array.isArray(response.body.rubrics)).toBe(true);
  });

  it('should filter rubrics by type', async () => {
    const response = await request(app)
      .get('/api/rubrics?rubricType=criteria')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.rubrics.every(r => r.rubric_type === 'criteria')).toBe(true);
  });

  it('should filter rubrics by status', async () => {
    const response = await request(app)
      .get('/api/rubrics?status=active')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.rubrics.every(r => r.status === 'active')).toBe(true);
  });
});

describe('GET /api/rubrics/:id', () => {
  it('should retrieve a rubric with criteria and levels', async () => {
    const response = await request(app)
      .get(`/api/rubrics/${testRubricId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.rubric.id).toBe(testRubricId);
    expect(response.body.criteria).toBeDefined();
    expect(response.body.criteria.length).toBeGreaterThan(0);
    expect(response.body.criteria[0].levels).toBeDefined();
  });

  it('should return 404 for non-existent rubric', async () => {
    await request(app)
      .get(`/api/rubrics/${uuidv4()}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);
  });
});

describe('PUT /api/rubrics/:id', () => {
  it('should update rubric details', async () => {
    const updates = {
      title: 'Updated Test Rubric',
      description: 'Updated description',
      maxScore: 120
    };

    const response = await request(app)
      .put(`/api/rubrics/${testRubricId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.rubric.title).toBe('Updated Test Rubric');
    expect(response.body.rubric.max_score).toBe(120);
  });

  it('should update criteria and levels', async () => {
    const updates = {
      criteria: [
        {
          criterionName: 'New Criterion',
          maxScore: 60,
          orderIndex: 0,
          levels: [
            { levelName: 'Perfect', scoreValue: 60, orderIndex: 0 }
          ]
        }
      ]
    };

    const response = await request(app)
      .put(`/api/rubrics/${testRubricId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.criteria).toBeDefined();
  });
});

describe('DELETE /api/rubrics/:id', () => {
  it('should archive a rubric', async () => {
    const response = await request(app)
      .delete(`/api/rubrics/${testRubricId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(response.body.message).toContain('archived');

    // Verify it's archived
    const getResponse = await request(app)
      .get(`/api/rubrics/${testRubricId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(getResponse.body.rubric.status).toBe('archived');
  });
});

describe('POST /api/rubrics/:id/criteria', () => {
  let activeRubricId;

  beforeAll(async () => {
    // Create a rubric for criterion tests
    const rubricData = {
      title: 'Test Criterion Rubric',
      rubricType: 'criteria',
      maxScore: 100
    };

    const response = await request(app)
      .post('/api/rubrics')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(rubricData);

    activeRubricId = response.body.rubric.id;
  });

  it('should add a criterion to an existing rubric', async () => {
    const criterionData = {
      criterionName: 'Additional Criterion',
      description: 'Added later',
      maxScore: 30,
      orderIndex: 0,
      levels: [
        { levelName: 'High', scoreValue: 30, orderIndex: 0 },
        { levelName: 'Low', scoreValue: 10, orderIndex: 1 }
      ]
    };

    const response = await request(app)
      .post(`/api/rubrics/${activeRubricId}/criteria`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(criterionData)
      .expect(201);

    expect(response.body.criterion).toBeDefined();
    expect(response.body.criterion.criterion_name).toBe('Additional Criterion');
    expect(response.body.levels).toHaveLength(2);
  });
});
