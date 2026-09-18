const { AppError, ValidationError, InternalError } = require('../utils/AppError');

/**
 * Central error handler — maps AppError subclasses to their HTTP status/code, and never
 * leaks internal error details for anything else (mapped to a generic 500 InternalError).
 * Must keep the 4-arg (err, req, res, next) signature for Express to treat it as
 * error-handling middleware, even though `next` is unused.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // body-parser (express.json()) throws a plain SyntaxError when the request body is
  // malformed JSON. Normalize it to a ValidationError so it maps to a 400 response.
  let error = err;
  if (
    (err && err.type === 'entity.parse.failed') ||
    (err instanceof SyntaxError && err.status === 400)
  ) {
    error = new ValidationError('Malformed JSON in request body');
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      error: {
        code: error.code,
        message: error.message,
        details: error.details || [],
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err && err.stack ? err.stack : err);
  const internal = new InternalError();
  res.status(internal.statusCode).json({
    status: 'error',
    error: {
      code: internal.code,
      message: internal.message,
      details: [],
    },
  });
}

module.exports = errorHandler;
