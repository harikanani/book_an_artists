const pool = require('../db/mysql');

async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  return rows[0] || null;
}

module.exports = { findByEmail };
