const mongoose = require('mongoose');

const artistProfileSchema = new mongoose.Schema(
  {
    artistId: { type: Number, required: true, unique: true, index: true },
    bio: { type: String, default: '' },
    skills: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ArtistProfile', artistProfileSchema);
