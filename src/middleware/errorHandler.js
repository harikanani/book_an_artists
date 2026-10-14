const { failure } = require('../utils/response');

function notFound(req, res) {
  return failure(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const message = status === 500 ? 'Something went wrong' : error.message;

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  return failure(res, message, status);
}

module.exports = { notFound, errorHandler };
