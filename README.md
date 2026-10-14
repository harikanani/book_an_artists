# Book An Assistant API

A small Node.js API for artist bookings. The code is intentionally simple and split into routes, services, and repositories so each part has one clear job.

## Requirements

- Node.js 18 or newer
- MySQL 8 or newer
- MongoDB running locally

## Run locally

```bash
git clone <repository-url>
cd BookAnAssistant
npm install
```

Copy `.env.example` to `.env` and update the database values. Use a long random value for `JWT_SECRET` and choose a local `SEED_USER_PASSWORD`.

Start the API:

```bash
npm run start
```

The start command automatically:

1. Creates the configured MySQL database if it does not exist.
2. Creates any missing MySQL tables.
3. Seeds the local users and MongoDB artist profile.
4. Starts the API at `http://localhost:3000`.

The setup is safe to run again. Check the running API with `GET /health`.

## Test accounts

After seeding:

- Client email: `client@example.com`
- Artist email: `artist@example.com`
- Password: the `SEED_USER_PASSWORD` value from local `.env` file

Login first, then send the returned token as `Authorization: Bearer <token>`.

The seed creates `client@example.com` plus `client2@example.com` through `client5@example.com`. All seeded users use the `SEED_USER_PASSWORD` value from your local `.env` file. It also creates five completed bookings and five matching reviews for the sample artist, so the reviews endpoint returns useful data immediately.

## Endpoints

- `POST /auth/login`
- `POST /bookings`
- `PATCH /bookings/:id/status`
- `GET /artists/:id/reviews?page=1&limit=10`

Example booking body:

```json
{
  "artist_id": 1,
  "event_start": "2026-12-20T10:00:00.000Z",
  "event_end": "2026-12-20T12:00:00.000Z",
  "notes": "Acoustic music for a small company event"
}
```

Every response uses the same fields:

```json
{ "success": true, "data": {}, "error": null }
```

## Tests

```bash
npm test
```

The integration test sends a real HTTP request through the Express route and JWT middleware. Its repository is kept in memory, so the test does not need local databases.

## Decisions and trade-offs

- MySQL stores users, artists, bookings, and payments because these records need relations and transactions.
- MongoDB stores flexible artist profiles and reviews.
- A transaction locks the artist row while a booking is checked and created. This prevents two overlapping confirmed-booking checks from racing for the same artist.
- Review results use completed booking IDs from MySQL before reading MongoDB. This is easy to understand, but a large system should copy booking status into a read model instead of passing a large ID list between databases.
- The app connects to MongoDB before starting. MySQL connections are opened only when a request needs one.

The SQL exercise is in `TASK3.md`, and the system design answer is in `TASK4.md`.
