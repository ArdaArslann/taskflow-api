const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

const repeat = (char, n) => char.repeat(n);

describe('POST /api/tasks — field validation boundary matrix', () => {
  test('title at minimum length (1 char) is accepted', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'A' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('A');
  });

  test('title at maximum length (200 chars) is accepted', async () => {
    const title = repeat('a', 200);
    const res = await request(app).post('/api/tasks').send({ title });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe(title);
  });

  test('title exceeding maximum length (201 chars) is rejected', async () => {
    const title = repeat('a', 201);
    const res = await request(app).post('/api/tasks').send({ title });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('title');
  });

  test('empty title (after trim) is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('title');
  });

  test('non-string title is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('title');
  });

  test('description defaults to empty string when omitted', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task' });
    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe('');
  });

  test('description at maximum length (2000 chars) is accepted', async () => {
    const description = repeat('b', 2000);
    const res = await request(app).post('/api/tasks').send({ title: 'Task', description });
    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe(description);
  });

  test('description exceeding maximum length (2001 chars) is rejected', async () => {
    const description = repeat('b', 2001);
    const res = await request(app).post('/api/tasks').send({ title: 'Task', description });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('description');
  });

  test('non-string description is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', description: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('description');
  });

  test.each(['todo', 'in-progress', 'completed'])('status "%s" is individually accepted', async (status) => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', status });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(status);
  });

  test('invalid status enum value is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', status: 'pending' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('status');
  });

  test.each(['low', 'medium', 'high'])('priority "%s" is individually accepted', async (priority) => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', priority });
    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe(priority);
  });

  test('invalid priority enum value is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('priority');
  });

  test('assignee at minimum length (1 char) is accepted', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee: 'A' });
    expect(res.status).toBe(201);
    expect(res.body.data.assignee).toBe('A');
  });

  test('assignee at maximum length (100 chars) is accepted', async () => {
    const assignee = repeat('c', 100);
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee });
    expect(res.status).toBe(201);
    expect(res.body.data.assignee).toBe(assignee);
  });

  test('assignee exceeding maximum length (101 chars) is rejected', async () => {
    const assignee = repeat('c', 101);
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('assignee');
  });

  test('empty-string assignee (after trim) is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('assignee');
  });

  test('explicit null assignee is accepted (unassigned)', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee: null });
    expect(res.status).toBe(201);
    expect(res.body.data.assignee).toBeNull();
  });

  test('non-string, non-null assignee is rejected', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Task', assignee: 7 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('assignee');
  });

  test('all invalid fields at once are collected into a single 400 (fail-slow, not fail-fast)', async () => {
    const res = await request(app).post('/api/tasks').send({
      title: repeat('a', 201),
      description: repeat('b', 2001),
      status: 'bogus',
      priority: 'bogus',
      assignee: repeat('c', 101),
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['title', 'description', 'status', 'priority', 'assignee'])
    );
  });

  test('unrecognized keys are silently stripped, not treated as errors', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task', unknownField: 'whatever', id: 'client-supplied-id' });
    expect(res.status).toBe(201);
    expect(res.body.data.unknownField).toBeUndefined();
    expect(res.body.data.id).not.toBe('client-supplied-id');
  });
});

describe('PUT /api/tasks/:id — field validation boundary matrix (partial update)', () => {
  let id;

  beforeEach(async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Original title' });
    id = created.body.data.id;
  });

  test('title at minimum length (1 char) is accepted on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ title: 'A' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('A');
  });

  test('title at maximum length (200 chars) is accepted on update', async () => {
    const title = repeat('a', 200);
    const res = await request(app).put(`/api/tasks/${id}`).send({ title });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe(title);
  });

  test('title exceeding maximum length (201 chars) is rejected on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ title: repeat('a', 201) });
    expect(res.status).toBe(400);
  });

  test('empty title on update is rejected (present field still validated)', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('description at maximum length (2000 chars) is accepted on update', async () => {
    const description = repeat('b', 2000);
    const res = await request(app).put(`/api/tasks/${id}`).send({ description });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe(description);
    expect(res.body.data.title).toBe('Original title');
  });

  test('description exceeding maximum length (2001 chars) is rejected on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ description: repeat('b', 2001) });
    expect(res.status).toBe(400);
  });

  test.each(['todo', 'in-progress', 'completed'])('status "%s" is individually accepted on update', async (status) => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ status });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(status);
  });

  test('invalid status enum value is rejected on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'pending' });
    expect(res.status).toBe(400);
  });

  test.each(['low', 'medium', 'high'])('priority "%s" is individually accepted on update', async (priority) => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ priority });
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe(priority);
  });

  test('invalid priority enum value is rejected on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  test('assignee at maximum length (100 chars) is accepted on update', async () => {
    const assignee = repeat('c', 100);
    const res = await request(app).put(`/api/tasks/${id}`).send({ assignee });
    expect(res.status).toBe(200);
    expect(res.body.data.assignee).toBe(assignee);
  });

  test('assignee exceeding maximum length (101 chars) is rejected on update', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ assignee: repeat('c', 101) });
    expect(res.status).toBe(400);
  });

  test('assignee can be explicitly cleared back to null on update', async () => {
    await request(app).put(`/api/tasks/${id}`).send({ assignee: 'Someone' });
    const res = await request(app).put(`/api/tasks/${id}`).send({ assignee: null });
    expect(res.status).toBe(200);
    expect(res.body.data.assignee).toBeNull();
  });

  test('fields absent from the patch are left untouched', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Original title');
    expect(res.body.data.description).toBe('');
    expect(res.body.data.status).toBe('todo');
    expect(res.body.data.assignee).toBeNull();
  });

  test('empty body on update returns 400 "no updatable fields provided"', async () => {
    const res = await request(app).put(`/api/tasks/${id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no updatable fields/i);
  });
});
