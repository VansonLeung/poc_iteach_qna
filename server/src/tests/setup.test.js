/**
 * Basic Setup Test
 * Verifies that the test environment is correctly configured
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import db from '../database/index.js';

describe('Test Setup', () => {
  it('should connect to the database', () => {
    expect(db).toBeDefined();
  });

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/api/unknown')
      .expect(404);
  });
});
