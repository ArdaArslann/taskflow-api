/**
 * Global request logger — logs method, endpoint and timestamp.
 * Never logs req.body for security reasons.
 */
function loggerMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
}

module.exports = loggerMiddleware;
