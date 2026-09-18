const {
  createTaskRecord,
  applyTaskPatch,
  TASK_STATUS,
  STATUS_VALUES,
  PRIORITY_VALUES,
  SORT_FIELDS,
} = require('../models/task.model');
const { ValidationError } = require('../utils/AppError');

/**
 * In-memory task store — Map<id, Task> for O(1) get/update/delete by id.
 */
let tasks = new Map();

function createTask(input) {
  const task = createTaskRecord(input);
  tasks.set(task.id, task);
  return task;
}

function getTaskById(id) {
  return tasks.get(id);
}

function updateTask(id, patch) {
  const existing = tasks.get(id);
  if (!existing) {
    return undefined;
  }
  const updated = applyTaskPatch(existing, patch);
  tasks.set(id, updated);
  return updated;
}

function deleteTask(id) {
  return tasks.delete(id);
}

function resetStore() {
  tasks.clear();
}

function getStats() {
  const byStatus = Object.fromEntries(STATUS_VALUES.map((s) => [s, 0]));
  const byPriority = Object.fromEntries(PRIORITY_VALUES.map((p) => [p, 0]));
  const byAssignee = {};

  const items = Array.from(tasks.values());
  items.forEach((task) => {
    byStatus[task.status] += 1;
    byPriority[task.priority] += 1;
    const key = task.assignee === null || task.assignee === undefined ? 'unassigned' : task.assignee;
    byAssignee[key] = (byAssignee[key] || 0) + 1;
  });

  return { total: items.length, byStatus, byPriority, byAssignee };
}

function getCompletedCount() {
  return Array.from(tasks.values()).filter((task) => task.status === TASK_STATUS.DONE).length;
}

function getPendingCount() {
  return Array.from(tasks.values()).filter((task) => task.status !== TASK_STATUS.DONE).length;
}

/**
 * Validates and normalizes the query params for list/filter/search/sort endpoints.
 * Throws a single ValidationError with all field problems collected.
 */
function normalizeListParams(queryParams) {
  const {
    status,
    priority,
    assignee,
    search,
    sort = 'createdAt',
    order = 'desc',
    page = '1',
    limit = '10',
  } = queryParams;

  const errors = [];

  if (status !== undefined && !STATUS_VALUES.includes(status)) {
    errors.push({ field: 'status', message: `status must be one of ${STATUS_VALUES.join(', ')}` });
  }

  if (priority !== undefined && !PRIORITY_VALUES.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `priority must be one of ${PRIORITY_VALUES.join(', ')}`,
    });
  }

  if (!SORT_FIELDS.includes(sort)) {
    errors.push({ field: 'sort', message: `sort must be one of ${SORT_FIELDS.join(', ')}` });
  }

  if (!['asc', 'desc'].includes(order)) {
    errors.push({ field: 'order', message: 'order must be one of asc, desc' });
  }

  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    errors.push({ field: 'page', message: 'page must be an integer >= 1' });
  }

  const limitNum = Number(limit);
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push({ field: 'limit', message: 'limit must be an integer between 1 and 100' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid query parameters', errors);
  }

  return { status, priority, assignee, search, sort, order, page: pageNum, limit: limitNum };
}

function applyFilters(items, { status, priority, assignee }) {
  let result = items;
  if (status !== undefined) {
    result = result.filter((task) => task.status === status);
  }
  if (priority !== undefined) {
    result = result.filter((task) => task.priority === priority);
  }
  if (assignee !== undefined) {
    const target = String(assignee).toLowerCase();
    result = result.filter((task) => (task.assignee || '').toLowerCase() === target);
  }
  return result;
}

function applySearch(items, search) {
  if (!search) {
    return items;
  }
  const target = String(search).toLowerCase();
  return items.filter(
    (task) =>
      task.title.toLowerCase().includes(target) || task.description.toLowerCase().includes(target)
  );
}

function applySort(items, sort, order) {
  const sorted = [...items].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return order === 'desc' ? sorted.reverse() : sorted;
}

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);
  return { items: pageItems, pagination: { page, limit, total, totalPages } };
}

function listTasks(queryParams = {}) {
  const normalized = normalizeListParams(queryParams);
  let items = Array.from(tasks.values());
  items = applyFilters(items, normalized);
  items = applySearch(items, normalized.search);
  items = applySort(items, normalized.sort, normalized.order);
  return paginate(items, normalized.page, normalized.limit);
}

module.exports = {
  createTask,
  getTaskById,
  listTasks,
  updateTask,
  deleteTask,
  getStats,
  getCompletedCount,
  getPendingCount,
  resetStore,
};
