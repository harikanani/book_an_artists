const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: Number, required: true, unique: true },
    artistId: { type: Number, required: true, index: true },
    clientId: { type: Number, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  { timestamps: true }
);

reviewSchema.index({ artistId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
