const express = require('express');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const taskRoutes = require('./routes/task.routes');
const reportRoutes = require('./routes/report.routes');
const { NotFoundError } = require('./utils/AppError');

const app = express();

app.use(express.json());
app.use(loggerMiddleware);

app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);

// Catch-all for unmapped routes — must be registered after all routes so the API always
// responds with the standard JSON error envelope instead of Express's default HTML 404 page.
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized error mapping — must be registered last.
app.use(errorHandler);

module.exports = app;
