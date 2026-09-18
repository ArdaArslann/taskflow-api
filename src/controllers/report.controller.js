const taskService = require('../services/task.service');

function getSummary(req, res, next) {
  try {
    const stats = taskService.getStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    next(err);
  }
}

function getCompleted(req, res, next) {
  try {
    const count = taskService.getCompletedCount();
    res.status(200).json({ status: 'success', data: { count } });
  } catch (err) {
    next(err);
  }
}

function getPending(req, res, next) {
  try {
    const count = taskService.getPendingCount();
    res.status(200).json({ status: 'success', data: { count } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getCompleted, getPending };
