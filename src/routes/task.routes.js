const express = require('express');
const controller = require('../controllers/task.controller');
const { validateCreateTask, validateUpdateTask } = require('../middleware/validate.middleware');

const router = express.Router();

// Registration order matters: literal sub-paths before the `:id` param route, or Express
// would swallow /search and /assignee/:name into GET /api/tasks/:id.
router.get('/search', controller.searchTasks);
router.get('/assignee/:name', controller.getTasksByAssignee);
router.get('/', controller.listTasks);
router.get('/:id', controller.getTaskById);
router.post('/', validateCreateTask, controller.createTask);
router.put('/:id', validateUpdateTask, controller.updateTask);
router.delete('/:id', controller.deleteTask);

module.exports = router;
