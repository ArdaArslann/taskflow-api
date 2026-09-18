const crypto = require('crypto');

/**
 * Task shape/factory and enum constants.
 *
 * Stored Task objects are always built here via explicit field assignment, never by
 * spreading/Object.assign-ing a raw request body, to prevent prototype-pollution.
 */

const TASK_STATUS = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'completed',
});

const TASK_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

const STATUS_VALUES = Object.values(TASK_STATUS);
const PRIORITY_VALUES = Object.values(TASK_PRIORITY);
const SORT_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'title', 'priority', 'status']);

const FIELD_LIMITS = Object.freeze({
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 2000,
  ASSIGNEE_MAX: 100,
});

/**
 * Builds a brand-new Task record from sanitized create input.
 */
function createTaskRecord(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description !== undefined ? input.description : '',
    status: input.status !== undefined ? input.status : TASK_STATUS.TODO,
    priority: input.priority !== undefined ? input.priority : TASK_PRIORITY.MEDIUM,
    assignee: input.assignee !== undefined ? input.assignee : null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Merges sanitized partial update input onto an existing Task record.
 * Fields absent from `patch` are left untouched; `id`/`createdAt` are never mutated.
 */
function applyTaskPatch(existing, patch) {
  return {
    id: existing.id,
    title: patch.title !== undefined ? patch.title : existing.title,
    description: patch.description !== undefined ? patch.description : existing.description,
    status: patch.status !== undefined ? patch.status : existing.status,
    priority: patch.priority !== undefined ? patch.priority : existing.priority,
    assignee: patch.assignee !== undefined ? patch.assignee : existing.assignee,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  TASK_STATUS,
  TASK_PRIORITY,
  STATUS_VALUES,
  PRIORITY_VALUES,
  SORT_FIELDS,
  FIELD_LIMITS,
  createTaskRecord,
  applyTaskPatch,
};
