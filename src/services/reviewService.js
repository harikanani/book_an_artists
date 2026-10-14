const Review = require('../models/Review');
const bookingRepository = require('../repositories/bookingRepository');

function emptyResult(page, limit) {
  return {
    reviews: [],
    summary: {
      average_score: '0.00',
      total_count: 0,
      score_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    },
    pagination: { page, limit, total_pages: 0 }
  };
}

function createReviewService(reviews = Review, bookings = bookingRepository) {
  return {
    async listForArtist(artistId, page, limit) {
      const completedBookingIds = await bookings.findCompletedIdsForArtist(artistId);
      if (completedBookingIds.length === 0) return emptyResult(page, limit);

      const match = { artistId, bookingId: { $in: completedBookingIds } };
      const [items, summaryRows] = await Promise.all([
        reviews.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        reviews.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              average: { $avg: '$score' },
              total: { $sum: 1 },
              scores: { $push: '$score' }
            }
          }
        ])
      ]);

      if (!summaryRows[0]) return emptyResult(page, limit);

      const summary = summaryRows[0];
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      summary.scores.forEach((score) => { distribution[score] += 1; });

      return {
        reviews: items,
        summary: {
          average_score: summary.average.toFixed(2),
          total_count: summary.total,
          score_distribution: distribution
        },
        pagination: {
          page,
          limit,
          total_pages: Math.ceil(summary.total / limit)
        }
      };
    }
  };
}

module.exports = createReviewService;
