const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const pool = require('../src/db/mysql');
const { connectMongo } = require('../src/db/mongo');
const ArtistProfile = require('../src/models/ArtistProfile');
const Review = require('../src/models/Review');
const initializeMySql = require('./initializeMySql');

async function upsertUser(email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.execute(
    `INSERT INTO users (email, password_hash, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
    [email, passwordHash, role]
  );
  const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  return users[0].id;
}

async function upsertCompletedBooking({ artistId, clientId, number }) {
  const notes = `Seed review booking ${number}`;
  const eventEnd = new Date(Date.now() - number * 24 * 60 * 60 * 1000);
  const eventStart = new Date(eventEnd.getTime() - 2 * 60 * 60 * 1000);

  const [existingBookings] = await pool.execute(
    `SELECT id FROM bookings
     WHERE artist_id = ? AND client_id = ? AND notes = ?
     LIMIT 1`,
    [artistId, clientId, notes]
  );

  if (existingBookings[0]) {
    await pool.execute(
      `UPDATE bookings
       SET status = 'completed', amount = ?, event_start = ?, event_end = ?
       WHERE id = ?`,
      [3000, eventStart, eventEnd, existingBookings[0].id]
    );
    return { bookingId: existingBookings[0].id, completedAt: eventEnd };
  }

  const [result] = await pool.execute(
    `INSERT INTO bookings
      (artist_id, client_id, status, amount, event_start, event_end, notes)
     VALUES (?, ?, 'completed', ?, ?, ?, ?)`,
    [artistId, clientId, 3000, eventStart, eventEnd, notes]
  );

  return { bookingId: result.insertId, completedAt: eventEnd };
}

async function seed() {
  const seedUserPassword = process.env.SEED_USER_PASSWORD;
  if (!seedUserPassword) {
    throw new Error('SEED_USER_PASSWORD is required. Add it to your .env file.');
  }

  await initializeMySql();
  await connectMongo();

  const artistUserId = await upsertUser('artist@example.com', seedUserPassword, 'artist');
  const clientEmails = [
    'client@example.com',
    'client2@example.com',
    'client3@example.com',
    'client4@example.com',
    'client5@example.com'
  ];
  const clientIds = [];

  for (const email of clientEmails) {
    clientIds.push(await upsertUser(email, seedUserPassword, 'client'));
  }

  await pool.execute(
    `INSERT INTO artists (user_id, name, category, hourly_rate)
     VALUES (?, 'Maya Sharma', 'Singer', 1500.00)
     ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category)`,
    [artistUserId]
  );
  const [artists] = await pool.execute('SELECT id FROM artists WHERE user_id = ?', [artistUserId]);
  const artistId = artists[0].id;

  await ArtistProfile.findOneAndUpdate(
    { artistId },
    { bio: 'Live singer for private and corporate events.', skills: ['vocals', 'acoustic'] },
    { upsert: true, new: true }
  );

  const reviewDetails = [
    { score: 5, comment: 'Excellent performance and very professional.' },
    { score: 4, comment: 'Great music and easy to work with.' },
    { score: 5, comment: 'The guests loved the performance.' },
    { score: 3, comment: 'Good performance with a small delay at the start.' },
    { score: 4, comment: 'A lovely acoustic set for our event.' }
  ];

  for (let index = 0; index < reviewDetails.length; index += 1) {
    const clientId = clientIds[index];
    const { bookingId, completedAt } = await upsertCompletedBooking({
      artistId,
      clientId,
      number: index + 1
    });

    await Review.findOneAndUpdate(
      { bookingId },
      {
        artistId,
        clientId,
        score: reviewDetails[index].score,
        comment: reviewDetails[index].comment,
        createdAt: completedAt,
        updatedAt: completedAt
      },
      { upsert: true, new: true, timestamps: false }
    );
  }

  console.log('Seed complete.');
  console.log('Client email: client@example.com');
  console.log('Artist email: artist@example.com');
  console.log('All users use the SEED_USER_PASSWORD value from your .env file.');
  console.log(`Sample artist id: ${artistId}`);
  console.log('Created 5 completed bookings with 5 matching reviews.');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await mongoose.disconnect();
  });
