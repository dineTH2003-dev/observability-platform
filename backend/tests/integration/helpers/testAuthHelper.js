/**
 * Helper utility for generating valid JWT tokens in Supertest API Integration Tests.
 */

const jwt = require('jsonwebtoken');
const env = require('../../../src/config/env');

function generateTestToken(user = {}) {
  const payload = {
    userId: user.userId || user.id || 1,
    email: user.email || 'admin@example.com',
    role: user.role || 'admin',
  };

  return jwt.sign(payload, env.jwt.secret || 'jwt-secret-key-12345', { expiresIn: '1h' });
}

module.exports = {
  generateTestToken,
};
