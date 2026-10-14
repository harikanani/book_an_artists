const express = require('express');
const createAuthService = require('./services/authService');
const createBookingService = require('./services/bookingService');
const createReviewService = require('./services/reviewService');
const createAuthRoutes = require('./routes/authRoutes');
const createBookingRoutes = require('./routes/bookingRoutes');
const createArtistRoutes = require('./routes/artistRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { success } = require('./utils/response');

function createApp(customServices = {}) {
  const app = express();
  const services = {
    auth: customServices.auth || createAuthService(),
    bookings: customServices.bookings || createBookingService(),
    reviews: customServices.reviews || createReviewService()
  };

  app.use(express.json());
  app.get('/health', (_req, res) => success(res, { status: 'ok' }));
  app.use('/auth', createAuthRoutes(services.auth));
  app.use('/bookings', createBookingRoutes(services.bookings));
  app.use('/artists', createArtistRoutes(services.reviews));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
