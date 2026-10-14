const pool = require('../db/mysql');

async function createBooking({ artistId, clientId, eventStart, eventEnd, notes }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [artists] = await connection.execute(
      'SELECT id FROM artists WHERE id = ? FOR UPDATE',
      [artistId]
    );

    if (!artists[0]) {
      await connection.rollback();
      return { artistMissing: true };
    }

    const [overlapping] = await connection.execute(
      `SELECT id FROM bookings
       WHERE artist_id = ?
         AND status = 'confirmed'
         AND event_start < ?
         AND event_end > ?
       LIMIT 1`,
      [artistId, eventEnd, eventStart]
    );

    if (overlapping[0]) {
      await connection.rollback();
      return { conflict: true };
    }

    const [result] = await connection.execute(
      `INSERT INTO bookings
        (artist_id, client_id, status, event_start, event_end, notes)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      [artistId, clientId, eventStart, eventEnd, notes]
    );

    await connection.commit();
    return findById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT b.*, a.user_id AS artist_user_id
     FROM bookings b
     JOIN artists a ON a.id = b.artist_id
     WHERE b.id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function updateStatus(id, status, currentStatus) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const booking = await findByIdForUpdate(id, connection);

    if (!booking) {
      await connection.rollback();
      return null;
    }

    if (status === 'confirmed') {
      await connection.execute('SELECT id FROM artists WHERE id = ? FOR UPDATE', [booking.artist_id]);
      const [overlapping] = await connection.execute(
        `SELECT id FROM bookings
         WHERE artist_id = ?
           AND id <> ?
           AND status = 'confirmed'
           AND event_start < ?
           AND event_end > ?
         LIMIT 1`,
        [booking.artist_id, id, booking.event_end, booking.event_start]
      );

      if (overlapping[0]) {
        await connection.rollback();
        return { conflict: true };
      }
    }

    const [result] = await connection.execute(
      `UPDATE bookings
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = ?`,
      [status, id, currentStatus]
    );
    if (result.affectedRows !== 1) {
      await connection.rollback();
      return null;
    }
    await connection.commit();

    return { ...booking, status };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findByIdForUpdate(id, connection) {
  const [rows] = await connection.execute(
    `SELECT b.*, a.user_id AS artist_user_id
     FROM bookings b
     JOIN artists a ON a.id = b.artist_id
     WHERE b.id = ?
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function findCompletedIdsForArtist(artistId) {
  const [rows] = await pool.execute(
    `SELECT id FROM bookings
     WHERE artist_id = ? AND status = 'completed'`,
    [artistId]
  );

  return rows.map((row) => row.id);
}

module.exports = {
  createBooking,
  findById,
  updateStatus,
  findCompletedIdsForArtist
};
