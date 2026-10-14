const jwt = require('jsonwebtoken');
const config = require('../config');
const HttpError = require('../utils/httpError');

function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization || '';
  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Authentication is required'));
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (_error) {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

module.exports = requireAuth;
