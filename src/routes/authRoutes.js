const express = require('express');
const { success } = require('../utils/response');

function createAuthRoutes(authService) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    return success(res, result);
  });

  return router;
}

module.exports = createAuthRoutes;
