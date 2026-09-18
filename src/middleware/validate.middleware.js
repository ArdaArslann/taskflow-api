const { ValidationError } = require('../utils/AppError');
const { STATUS_VALUES, PRIORITY_VALUES, FIELD_LIMITS } = require('../models/task.model');

/**
 * Validates and sanitizes the recognized subset of a request body
 * (title/description/status/priority/assignee), collecting ALL field errors instead of
 * failing fast. Unrecognized keys are silently ignored (never copied into `sanitized`)
 * to prevent prototype-pollution.
 */
function collectSanitized(body, { requireTitle }) {
  const errors = [];
  const sanitized = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (has('title')) {
    if (typeof body.title !== 'string') {
      errors.push({ field: 'title', message: 'title must be a string' });
    } else {
      const trimmed = body.title.trim();
      if (trimmed.length < 1 || trimmed.length > FIELD_LIMITS.TITLE_MAX) {
        errors.push({
          field: 'title',
          message: `title must be between 1 and ${FIELD_LIMITS.TITLE_MAX} characters`,
        });
      } else {
        sanitized.title = trimmed;
      }
    }
  } else if (requireTitle) {
    errors.push({ field: 'title', message: 'title is required' });
  }

  if (has('description')) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else {
      const trimmed = body.description.trim();
      if (trimmed.length > FIELD_LIMITS.DESCRIPTION_MAX) {
        errors.push({
          field: 'description',
          message: `description must be at most ${FIELD_LIMITS.DESCRIPTION_MAX} characters`,
        });
      } else {
        sanitized.description = trimmed;
      }
    }
  }

  if (has('priority')) {
    if (!PRIORITY_VALUES.includes(body.priority)) {
      errors.push({
        field: 'priority',
        message: `priority must be one of ${PRIORITY_VALUES.join(', ')}`,
      });
    } else {
      sanitized.priority = body.priority;
    }
  }

  if (has('status')) {
    if (!STATUS_VALUES.includes(body.status)) {
      errors.push({ field: 'status', message: `status must be one of ${STATUS_VALUES.join(', ')}` });
    } else {
      sanitized.status = body.status;
    }
  }

  if (has('assignee')) {
    if (body.assignee === null) {
      sanitized.assignee = null;
    } else if (typeof body.assignee !== 'string') {
      errors.push({ field: 'assignee', message: 'assignee must be a string or null' });
    } else {
      const trimmed = body.assignee.trim();
      if (trimmed.length < 1 || trimmed.length > FIELD_LIMITS.ASSIGNEE_MAX) {
        errors.push({
          field: 'assignee',
          message: `assignee must be between 1 and ${FIELD_LIMITS.ASSIGNEE_MAX} characters`,
        });
      } else {
        sanitized.assignee = trimmed;
      }
    }
  }

  return { sanitized, errors };
}

function validateCreateTask(req, res, next) {
  try {
    const { sanitized, errors } = collectSanitized(req.body || {}, { requireTitle: true });
    if (errors.length > 0) {
      throw new ValidationError('Invalid task payload', errors);
    }
    req.body = sanitized;
    next();
  } catch (err) {
    next(err);
  }
}

function validateUpdateTask(req, res, next) {
  try {
    const { sanitized, errors } = collectSanitized(req.body || {}, { requireTitle: false });
    if (errors.length > 0) {
      throw new ValidationError('Invalid task payload', errors);
    }
    if (Object.keys(sanitized).length === 0) {
      throw new ValidationError('no updatable fields provided', [
        { field: 'body', message: 'no updatable fields provided' },
      ]);
    }
    req.body = sanitized;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { validateCreateTask, validateUpdateTask };
