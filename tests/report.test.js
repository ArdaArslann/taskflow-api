const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

describe('GET /api/reports/summary', () => {
  test('empty store returns zero-filled buckets', async () => {
    const res = await request(app).get('/api/reports/summary');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 0,
      byStatus: { todo: 0, 'in-progress': 0, completed: 0 },
      byPriority: { low: 0, medium: 0, high: 0 },
      byAssignee: {},
    });
  });

  test('populated store counts by status/priority and buckets null assignee as unassigned', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'A', assignee: 'Alice', status: 'completed', priority: 'high' });
    await request(app).post('/api/tasks').send({ title: 'B', priority: 'low' });
    await request(app).post('/api/tasks').send({ title: 'C', assignee: 'Alice' });

    const res = await request(app).get('/api/reports/summary');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.byStatus).toEqual({ todo: 2, 'in-progress': 0, completed: 1 });
    expect(res.body.data.byPriority).toEqual({ low: 1, medium: 1, high: 1 });
    expect(res.body.data.byAssignee).toEqual({ Alice: 2, unassigned: 1 });
  });
});

describe('GET /api/reports/completed', () => {
  test('empty store returns zero', async () => {
    const res = await request(app).get('/api/reports/completed');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 0 });
  });

  test('counts only completed tasks', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', status: 'completed' });
    await request(app).post('/api/tasks').send({ title: 'B', status: 'todo' });
    await request(app).post('/api/tasks').send({ title: 'C', status: 'in-progress' });

    const res = await request(app).get('/api/reports/completed');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 1 });
  });
});

describe('GET /api/reports/pending', () => {
  test('empty store returns zero', async () => {
    const res = await request(app).get('/api/reports/pending');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 0 });
  });

  test('counts todo and in-progress tasks, excludes completed', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', status: 'completed' });
    await request(app).post('/api/tasks').send({ title: 'B', status: 'todo' });
    await request(app).post('/api/tasks').send({ title: 'C', status: 'in-progress' });

    const res = await request(app).get('/api/reports/pending');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 2 });
  });
});
