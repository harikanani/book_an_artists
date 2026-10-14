const express = require('express');
const requireAuth = require('../middleware/auth');
const { success } = require('../utils/response');

function createBookingRoutes(bookingService) {
  const router = express.Router();

  router.post('/', requireAuth, async (req, res) => {
    const booking = await bookingService.create(req.body, req.user);
    return success(res, booking, 201);
  });

  router.patch('/:id/status', requireAuth, async (req, res) => {
    const booking = await bookingService.changeStatus(
      Number(req.params.id),
      req.body.status,
      req.user
    );
    return success(res, booking);
  });

  return router;
}

module.exports = createBookingRoutes;
