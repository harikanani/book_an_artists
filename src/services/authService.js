const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/userRepository');
const HttpError = require('../utils/httpError');

function createAuthService(users = userRepository) {
  return {
    async login(email, password) {
      if (!email || !password) {
        throw new HttpError(400, 'Email and password are required');
      }

      const user = await users.findByEmail(email);
      const passwordMatches = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

      if (!user || !passwordMatches) {
        throw new HttpError(401, 'Invalid email or password');
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return {
        token,
        user: { id: user.id, email: user.email, role: user.role }
      };
    }
  };
}

module.exports = createAuthService;
