import request from 'supertest';
import bcrypt from 'bcrypt';
import { setupTestDB, teardownTestDB } from '../setup.js';
import app from '../../src/app.js';
import User from '../../src/models/User.js';

describe('Authentication Integration Tests', () => {
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create test admin user
    testUser = await User.create({
      username: 'testadmin',
      email: 'testadmin@example.com',
      passwordHash: await bcrypt.hash('testpass123', 10),
      role: 'admin',
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('role', 'admin');
    });

    it('should fail with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testadmin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token', async () => {
      // First login to get refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpass123',
        });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpass123',
        });

      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username', 'testadmin');
    });

    it('should fail without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
