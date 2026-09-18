const taskService = require('../services/task.service');
const { NotFoundError, ValidationError } = require('../utils/AppError');

function listTasks(req, res, next) {
  try {
    const result = taskService.listTasks(req.query);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

function searchTasks(req, res, next) {
  try {
    const { q, ...rest } = req.query;
    if (!q || !String(q).trim()) {
      throw new ValidationError('q query parameter is required', [
        { field: 'q', message: 'q is required and cannot be empty' },
      ]);
    }
    const result = taskService.listTasks({ ...rest, search: q });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

function getTasksByAssignee(req, res, next) {
  try {
    const { name } = req.params;
    const result = taskService.listTasks({ ...req.query, assignee: name });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

function getTaskById(req, res, next) {
  try {
    const task = taskService.getTaskById(req.params.id);
    if (!task) {
      throw new NotFoundError(`Task ${req.params.id} not found`);
    }
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function createTask(req, res, next) {
  try {
    const task = taskService.createTask(req.body);
    res.status(201).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function updateTask(req, res, next) {
  try {
    const task = taskService.updateTask(req.params.id, req.body);
    if (!task) {
      throw new NotFoundError(`Task ${req.params.id} not found`);
    }
    res.status(200).json({ status: 'success', data: task });
  } catch (err) {
    next(err);
  }
}

function deleteTask(req, res, next) {
  try {
    const deleted = taskService.deleteTask(req.params.id);
    if (!deleted) {
      throw new NotFoundError(`Task ${req.params.id} not found`);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTasks,
  searchTasks,
  getTasksByAssignee,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
