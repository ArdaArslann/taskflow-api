/**
 * Typed error hierarchy for centralized error handling.
 * errorHandler.middleware.js maps these to HTTP responses.
 */

class AppError extends Error {
  constructor(message, statusCode, code, details = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND', []);
  }
}

class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', []);
  }
}

module.exports = { AppError, ValidationError, NotFoundError, InternalError };
