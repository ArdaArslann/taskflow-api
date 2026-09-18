const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/task.service');

beforeEach(() => {
  taskService.resetStore();
});

async function seedFixture() {
  // 1: todo / low / Alice — description has "fix"
  await request(app)
    .post('/api/tasks')
    .send({ title: 'Alpha task', description: 'quick fix', status: 'todo', priority: 'low', assignee: 'Alice' });
  // 2: in-progress / medium / Bob — no "fix"
  await request(app)
    .post('/api/tasks')
    .send({ title: 'Bravo task', description: 'nothing special', status: 'in-progress', priority: 'medium', assignee: 'Bob' });
  // 3: completed / high / alice (lowercase) — description has "fix"
  await request(app)
    .post('/api/tasks')
    .send({ title: 'Charlie task', description: 'urgent fix needed', status: 'completed', priority: 'high', assignee: 'alice' });
  // 4: todo / medium / unassigned — description has "fix"
  await request(app)
    .post('/api/tasks')
    .send({ title: 'Delta task', description: 'fix bug in delta', status: 'todo', priority: 'medium' });
  // 5: in-progress / low / Bob — no "fix"
  await request(app)
    .post('/api/tasks')
    .send({ title: 'Echo task', description: 'quick echo test', status: 'in-progress', priority: 'low', assignee: 'Bob' });
}

describe('GET /api/tasks — filters (independent)', () => {
  beforeEach(seedFixture);

  test('filter by status alone', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'todo' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Alpha task', 'Delta task']);
  });

  test('filter by priority alone', async () => {
    const res = await request(app).get('/api/tasks').query({ priority: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Bravo task', 'Delta task']);
  });

  test('filter by assignee alone is case-insensitive exact match', async () => {
    const res = await request(app).get('/api/tasks').query({ assignee: 'bob' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Bravo task', 'Echo task']);
  });

  test('filter by assignee is exact match, not substring', async () => {
    const res = await request(app).get('/api/tasks').query({ assignee: 'Ali' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('GET /api/tasks — filters combined', () => {
  beforeEach(seedFixture);

  test('status + priority combined (AND)', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'todo', priority: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title)).toEqual(['Delta task']);
  });

  test('status + assignee combined (AND)', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'in-progress', assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Bravo task', 'Echo task']);
  });

  test('priority + assignee combined (AND)', async () => {
    const res = await request(app).get('/api/tasks').query({ priority: 'low', assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title)).toEqual(['Echo task']);
  });

  test('status + priority + assignee combined (AND, no matches)', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .query({ status: 'completed', priority: 'low', assignee: 'alice' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('GET /api/tasks — search alone and combined with filters', () => {
  beforeEach(seedFixture);

  test('search alone matches title OR description substring, case-insensitively', async () => {
    const res = await request(app).get('/api/tasks').query({ search: 'FIX' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual([
      'Alpha task',
      'Charlie task',
      'Delta task',
    ]);
  });

  test('search combined with a filter (AND)', async () => {
    const res = await request(app).get('/api/tasks').query({ search: 'fix', status: 'todo' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Alpha task', 'Delta task']);
  });

  test('search with no matches returns 200 + empty items', async () => {
    const res = await request(app).get('/api/tasks').query({ search: 'nonexistentterm' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('GET /api/tasks/search — dedicated search route', () => {
  beforeEach(seedFixture);

  test('missing q returns 400', async () => {
    const res = await request(app).get('/api/tasks/search');
    expect(res.status).toBe(400);
  });

  test('blank/whitespace-only q returns 400', async () => {
    const res = await request(app).get('/api/tasks/search').query({ q: '   ' });
    expect(res.status).toBe(400);
  });

  test('q with no matches returns 200 + empty items (not 404)', async () => {
    const res = await request(app).get('/api/tasks/search').query({ q: 'zzz-no-match' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  test('q combined with status filter', async () => {
    const res = await request(app).get('/api/tasks/search').query({ q: 'fix', status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title)).toEqual(['Charlie task']);
  });

  test('q combined with priority filter', async () => {
    const res = await request(app).get('/api/tasks/search').query({ q: 'fix', priority: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title)).toEqual(['Delta task']);
  });
});

describe('GET /api/tasks/assignee/:name — dedicated assignee route', () => {
  beforeEach(seedFixture);

  test('matches are returned', async () => {
    const res = await request(app).get('/api/tasks/assignee/Bob');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((t) => t.title).sort()).toEqual(['Bravo task', 'Echo task']);
  });

  test('no matches returns 200 + empty items, not 404', async () => {
    const res = await request(app).get('/api/tasks/assignee/nobody-at-all');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  test('match is case-insensitive', async () => {
    const res = await request(app).get('/api/tasks/assignee/BOB');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
  });
});

describe('GET /api/tasks — sort asc/desc on every sortable field', () => {
  // Known deviation (confirmed acceptable): sort on priority/status is plain alphabetical
  // string comparison, not severity-weighted (high > medium > low). The architecture contract
  // only names the allowed sort fields, not a comparator, so this reading is accepted here.
  let ids;

  beforeEach(async () => {
    ids = {};
    const bravo = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bravo', status: 'in-progress', priority: 'medium' });
    ids.bravo = bravo.body.data.id;
    await new Promise((r) => setTimeout(r, 10));

    const alpha = await request(app)
      .post('/api/tasks')
      .send({ title: 'Alpha', status: 'completed', priority: 'high' });
    ids.alpha = alpha.body.data.id;
    await new Promise((r) => setTimeout(r, 10));

    const charlie = await request(app)
      .post('/api/tasks')
      .send({ title: 'Charlie', status: 'todo', priority: 'low' });
    ids.charlie = charlie.body.data.id;
    await new Promise((r) => setTimeout(r, 10));

    // Touch bravo last so its updatedAt is the newest, while createdAt order stays bravo/alpha/charlie.
    // Update description (not priority/status/title) so the other per-field sort assertions
    // below stay unaffected by this timestamp-bumping update.
    await request(app).put(`/api/tasks/${ids.bravo}`).send({ description: 'touched to bump updatedAt' });
  });

  test('sort by createdAt asc/desc', async () => {
    const asc = await request(app).get('/api/tasks').query({ sort: 'createdAt', order: 'asc' });
    expect(asc.body.data.items.map((t) => t.title)).toEqual(['Bravo', 'Alpha', 'Charlie']);

    const desc = await request(app).get('/api/tasks').query({ sort: 'createdAt', order: 'desc' });
    expect(desc.body.data.items.map((t) => t.title)).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });

  test('sort by updatedAt asc/desc (bravo was updated last)', async () => {
    const asc = await request(app).get('/api/tasks').query({ sort: 'updatedAt', order: 'asc' });
    expect(asc.body.data.items.map((t) => t.title)).toEqual(['Alpha', 'Charlie', 'Bravo']);

    const desc = await request(app).get('/api/tasks').query({ sort: 'updatedAt', order: 'desc' });
    expect(desc.body.data.items.map((t) => t.title)).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  test('sort by title asc/desc', async () => {
    const asc = await request(app).get('/api/tasks').query({ sort: 'title', order: 'asc' });
    expect(asc.body.data.items.map((t) => t.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);

    const desc = await request(app).get('/api/tasks').query({ sort: 'title', order: 'desc' });
    expect(desc.body.data.items.map((t) => t.title)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  test('sort by priority asc/desc is alphabetical (high < low < medium), not severity-weighted', async () => {
    const asc = await request(app).get('/api/tasks').query({ sort: 'priority', order: 'asc' });
    expect(asc.body.data.items.map((t) => t.priority)).toEqual(['high', 'low', 'medium']);

    const desc = await request(app).get('/api/tasks').query({ sort: 'priority', order: 'desc' });
    expect(desc.body.data.items.map((t) => t.priority)).toEqual(['medium', 'low', 'high']);
  });

  test('sort by status asc/desc is alphabetical (completed < in-progress < todo)', async () => {
    const asc = await request(app).get('/api/tasks').query({ sort: 'status', order: 'asc' });
    expect(asc.body.data.items.map((t) => t.status)).toEqual(['completed', 'in-progress', 'todo']);

    const desc = await request(app).get('/api/tasks').query({ sort: 'status', order: 'desc' });
    expect(desc.body.data.items.map((t) => t.status)).toEqual(['todo', 'in-progress', 'completed']);
  });
});

describe('GET /api/tasks — invalid query params return 400', () => {
  test('invalid sort field', async () => {
    const res = await request(app).get('/api/tasks').query({ sort: 'bogusField' });
    expect(res.status).toBe(400);
  });

  test('invalid order value', async () => {
    const res = await request(app).get('/api/tasks').query({ order: 'sideways' });
    expect(res.status).toBe(400);
  });

  test('non-integer page', async () => {
    const res = await request(app).get('/api/tasks').query({ page: 'abc' });
    expect(res.status).toBe(400);
  });

  test('page zero', async () => {
    const res = await request(app).get('/api/tasks').query({ page: '0' });
    expect(res.status).toBe(400);
  });

  test('negative page', async () => {
    const res = await request(app).get('/api/tasks').query({ page: '-1' });
    expect(res.status).toBe(400);
  });

  test('non-integer limit', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: 'abc' });
    expect(res.status).toBe(400);
  });

  test('invalid status filter value', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'bogus' });
    expect(res.status).toBe(400);
  });

  test('invalid priority filter value', async () => {
    const res = await request(app).get('/api/tasks').query({ priority: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tasks — limit boundary values', () => {
  beforeEach(seedFixture);

  test('limit = 0 is rejected (below the 1-100 range)', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: '0' });
    expect(res.status).toBe(400);
  });

  test('limit = 1 is accepted and returns exactly one item', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pagination.limit).toBe(1);
  });

  test('limit = 100 (upper bound) is accepted', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: '100' });
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
    expect(res.body.data.items).toHaveLength(5); // fixture has only 5 tasks
  });

  test('limit = 101 is rejected (exceeds the 100 cap)', async () => {
    const res = await request(app).get('/api/tasks').query({ limit: '101' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tasks — pagination metadata and empty-page behavior', () => {
  beforeEach(async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/tasks').send({ title: `Task ${i}` });
    }
  });

  test('page 1 of 3 (limit 2) returns 2 items with correct metadata', async () => {
    const res = await request(app).get('/api/tasks').query({ page: '1', limit: '2' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  test('last partial page (page 3 of 3, limit 2) returns exactly 1 item', async () => {
    const res = await request(app).get('/api/tasks').query({ page: '3', limit: '2' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({ page: 3, limit: 2, total: 5, totalPages: 3 });
  });

  test('page beyond range returns 200 with empty items, not an error', async () => {
    const res = await request(app).get('/api/tasks').query({ page: '10', limit: '2' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pagination).toMatchObject({ page: 10, limit: 2, total: 5, totalPages: 3 });
  });

  test('empty store returns 200 with empty items and totalPages 0', async () => {
    taskService.resetStore();
    const res = await request(app).get('/api/tasks').query({ page: '1', limit: '10' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });
});
