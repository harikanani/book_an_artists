process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const createBookingService = require('../src/services/bookingService');
const config = require('../src/config');

describe('PATCH /bookings/:id/status', () => {
  test('returns 422 with an error message for an invalid transition', async () => {
    const bookingRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 42,
        artist_user_id: 7,
        client_id: 9,
        status: 'pending',
        event_start: new Date(Date.now() + 60_000),
        event_end: new Date(Date.now() + 120_000)
      }),
      updateStatus: jest.fn()
    };
    const bookings = createBookingService(bookingRepository);
    const app = createApp({ bookings });
    const token = jwt.sign({ id: 7, role: 'artist' }, config.jwtSecret);

    const response = await request(app)
      .patch('/bookings/42/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: {},
      error: 'Cannot change booking status from pending to completed'
    });
    expect(bookingRepository.updateStatus).not.toHaveBeenCalled();
  });
});
