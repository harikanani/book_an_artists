const bookingRepository = require('../repositories/bookingRepository');
const HttpError = require('../utils/httpError');

const allowedTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed']
};

function createBookingService(bookings = bookingRepository) {
  return {
    async create(input, user) {
      if (user.role !== 'client') {
        throw new HttpError(403, 'Only clients can create bookings');
      }

      const { artist_id: artistId, event_start: start, event_end: end, notes } = input;
      if (!start || !end || typeof notes !== 'string' || !notes.trim()) {
        throw new HttpError(400, 'artist_id, event_start, event_end, and notes are required');
      }
      if (!Number.isInteger(Number(artistId)) || Number(artistId) < 1) {
        throw new HttpError(400, 'artist_id must be a positive integer');
      }

      const eventStart = new Date(start);
      const eventEnd = new Date(end);
      if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) {
        throw new HttpError(400, 'event_start and event_end must be valid dates');
      }
      if (eventStart <= new Date()) {
        throw new HttpError(422, 'event_start must be in the future');
      }
      if (eventEnd <= eventStart) {
        throw new HttpError(422, 'event_end must be after event_start');
      }

      const result = await bookings.createBooking({
        artistId: Number(artistId),
        clientId: user.id,
        eventStart,
        eventEnd,
        notes: notes.trim()
      });

      if (result.artistMissing) throw new HttpError(404, 'Artist not found');
      if (result.conflict) {
        throw new HttpError(409, 'Artist already has a confirmed booking in this time window');
      }
      return result;
    },

    async changeStatus(bookingId, nextStatus, user) {
      if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new HttpError(400, 'Booking id must be a positive integer');
      }
      if (!nextStatus) throw new HttpError(400, 'status is required');

      const booking = await bookings.findById(bookingId);
      if (!booking) throw new HttpError(404, 'Booking not found');

      const isClientOwner = user.role === 'client' && booking.client_id === user.id;
      const isAssignedArtist = user.role === 'artist' && booking.artist_user_id === user.id;
      if (!isClientOwner && !isAssignedArtist) {
        throw new HttpError(403, 'You cannot update this booking');
      }

      const validNextStatuses = allowedTransitions[booking.status] || [];
      if (!validNextStatuses.includes(nextStatus)) {
        throw new HttpError(
          422,
          `Cannot change booking status from ${booking.status} to ${nextStatus}`
        );
      }

      if (user.role === 'client' && nextStatus !== 'cancelled') {
        throw new HttpError(403, 'Clients can only cancel bookings');
      }

      const now = new Date();
      if (nextStatus === 'in_progress' && now < new Date(booking.event_start)) {
        throw new HttpError(422, 'The booking cannot start before the event_start time');
      }
      if (nextStatus === 'completed' && now < new Date(booking.event_end)) {
        throw new HttpError(422, 'The booking cannot complete before the event_end time');
      }

      const updatedBooking = await bookings.updateStatus(bookingId, nextStatus, booking.status);
      if (updatedBooking && updatedBooking.conflict) {
        throw new HttpError(409, 'Artist already has a confirmed booking in this time window');
      }
      if (!updatedBooking) {
        throw new HttpError(409, 'Booking status changed; refresh and try again');
      }
      return updatedBooking;
    }
  };
}

module.exports = createBookingService;
