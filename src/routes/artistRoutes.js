const express = require('express');
const requireAuth = require('../middleware/auth');
const HttpError = require('../utils/httpError');
const { success } = require('../utils/response');

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
}

function createArtistRoutes(reviewService) {
  const router = express.Router();

  router.get('/:id/reviews', requireAuth, async (req, res) => {
    const artistId = positiveInteger(req.params.id, null);
    const page = positiveInteger(req.query.page, 1);
    const limit = positiveInteger(req.query.limit, 10, 100);

    if (!artistId) throw new HttpError(400, 'Artist id must be a positive integer');
    if (!page || !limit) {
      throw new HttpError(400, 'page and limit must be positive integers; limit cannot exceed 100');
    }

    const result = await reviewService.listForArtist(artistId, page, limit);
    return success(res, result);
  });

  return router;
}

module.exports = createArtistRoutes;
