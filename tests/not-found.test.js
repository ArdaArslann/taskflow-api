const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

describe('Catch-all 404 handler', () => {
  test('GET /api/does-not-exist returns the standard JSON error envelope, not HTML', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body).toMatchObject({
      status: 'error',
      error: {
        code: 'NOT_FOUND',
      },
    });
    expect(res.body.error.message).toEqual(expect.any(String));
  });
});
