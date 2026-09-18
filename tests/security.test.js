const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

describe('Logger middleware — never logs req.body', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('a POST body containing a secret marker never appears in any console.log call', async () => {
    const SECRET_MARKER = 'SECRET_MARKER_9f3a1c';
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task with secret', description: SECRET_MARKER, assignee: 'Alice' });

    expect(res.status).toBe(201);

    // Sanity check: the logger did run for this request.
    expect(logSpy).toHaveBeenCalled();
    const allLoggedText = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(allLoggedText).toContain('POST');
    expect(allLoggedText).toContain('/api/tasks');

    // The actual security assertion: the request body content never reaches the logger.
    expect(allLoggedText).not.toContain(SECRET_MARKER);
    expect(allLoggedText).not.toContain('Task with secret');
    expect(allLoggedText).not.toContain('Alice');
  });

  test('a PUT body containing a secret marker never appears in any console.log call', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Original' });
    const { id } = created.body.data;
    logSpy.mockClear();

    const SECRET_MARKER = 'SECRET_MARKER_update_7b2e';
    const res = await request(app).put(`/api/tasks/${id}`).send({ description: SECRET_MARKER });

    expect(res.status).toBe(200);
    const allLoggedText = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(allLoggedText).not.toContain(SECRET_MARKER);
  });
});

describe('Prototype pollution defense', () => {
  test('POST: a __proto__ key does not pollute Object.prototype or the stored task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send(JSON.parse('{"title": "Safe title", "__proto__": {"polluted": true}}'));

    expect(res.status).toBe(201);
    expect(res.body.data.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('PUT: a __proto__ key does not pollute Object.prototype or the stored task', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Original' });
    const { id } = created.body.data;

    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .send(JSON.parse('{"description": "Safe update", "__proto__": {"polluted": true}}'));

    expect(res.status).toBe(200);
    expect(res.body.data.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('POST: a constructor.prototype pollution attempt does not affect Object.prototype', async () => {
    const payload = JSON.parse(
      '{"title": "Safe title 2", "constructor": {"prototype": {"polluted2": true}}}'
    );
    const res = await request(app).post('/api/tasks').send(payload);

    expect(res.status).toBe(201);
    expect({}.polluted2).toBeUndefined();
    expect(Object.prototype.polluted2).toBeUndefined();
  });
});

describe('Malformed JSON request body handling', () => {
  // HTTP Status Code Rules define 400 as
  // "validation error, malformed request". A syntactically broken JSON body is a malformed
  // request, so it must surface as 400 VALIDATION_ERROR. errorHandler.middleware.js
  // normalizes body-parser's SyntaxError (entity.parse.failed) into a ValidationError before the
  // generic 500 branch, so this test pins down the fixed, contract-compliant behavior.
  test('a syntactically invalid JSON body surfaces as 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": "Broken JSON"'); // missing closing brace — invalid JSON

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
