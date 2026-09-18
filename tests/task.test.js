const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

describe('Task CRUD', () => {
  test('POST /api/tasks creates a task with defaults', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee: null,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
  });

  test('POST /api/tasks rejects missing title and collects all field errors', async () => {
    const res = await request(app).post('/api/tasks').send({ priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'priority']));
  });

  test('GET /api/tasks/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tasks/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PUT /api/tasks/:id performs a partial merge, not a full replace', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'Original', description: 'Keep me', priority: 'low' });
    const { id } = created.body.data;

    const updated = await request(app).put(`/api/tasks/${id}`).send({ priority: 'high' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe('Original');
    expect(updated.body.data.description).toBe('Keep me');
    expect(updated.body.data.priority).toBe('high');
  });

  test('PUT /api/tasks/:id with no updatable fields returns 400', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Original' });
    const { id } = created.body.data;

    const res = await request(app).put(`/api/tasks/${id}`).send({ unknownField: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no updatable fields/i);
  });

  test('PUT /api/tasks/:id on unknown id returns 404', async () => {
    const res = await request(app).put('/api/tasks/does-not-exist').send({ title: 'New title' });

    expect(res.status).toBe(404);
  });

  test('DELETE /api/tasks/:id removes the task, subsequent GET then 404s', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'To delete' });
    const { id } = created.body.data;

    const del = await request(app).delete(`/api/tasks/${id}`);
    expect(del.status).toBe(204);
    expect(del.body).toEqual({});

    const getAfter = await request(app).get(`/api/tasks/${id}`);
    expect(getAfter.status).toBe(404);
  });

  test('DELETE /api/tasks/:id on unknown id returns 404', async () => {
    const res = await request(app).delete('/api/tasks/does-not-exist');

    expect(res.status).toBe(404);
  });

  test('a __proto__ key in the request body does not pollute Object.prototype or the stored task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send(JSON.parse('{"title": "Safe title", "__proto__": {"polluted": true}}'));

    expect(res.status).toBe(201);
    expect(res.body.data.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });
});

describe('Route ordering: /search and /assignee/:name must not be swallowed by /:id', () => {
  beforeEach(async () => {
    await request(app).post('/api/tasks').send({ title: 'Fix login bug', assignee: 'Alice' });
    await request(app).post('/api/tasks').send({ title: 'Write onboarding docs', assignee: 'Bob' });
  });

  test('GET /api/tasks/search requires q', async () => {
    const res = await request(app).get('/api/tasks/search');

    expect(res.status).toBe(400);
  });

  test('GET /api/tasks/search?q=... matches title/description substrings', async () => {
    const res = await request(app).get('/api/tasks/search').query({ q: 'login' });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('Fix login bug');
  });

  test('GET /api/tasks/assignee/:name matches case-insensitively', async () => {
    const res = await request(app).get('/api/tasks/assignee/alice');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].assignee).toBe('Alice');
  });

  test('GET /api/tasks/assignee/:name returns 200 + empty items when nobody matches (never 404)', async () => {
    const res = await request(app).get('/api/tasks/assignee/nobody');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('List endpoint validation and pagination', () => {
  test('invalid status query param returns 400', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'bogus' });

    expect(res.status).toBe(400);
  });

  test('limit above 100 returns 400', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: '101' });

    expect(res.status).toBe(400);
  });

  test('pagination metadata reflects total and totalPages', async () => {
    await request(app).post('/api/tasks').send({ title: 'Task 0' });
    await request(app).post('/api/tasks').send({ title: 'Task 1' });
    await request(app).post('/api/tasks').send({ title: 'Task 2' });

    const res = await request(app).get('/api/tasks').query({ limit: '2', page: '1' });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.items).toHaveLength(2);
  });
});
