# Task 3 — SQL and Database

## Task A — Artist leaderboard

This query calculates review scores from the last 90 days. The completed booking count is kept in a separate CTE so joining reviews cannot accidentally count the same booking more than once.

```sql
WITH recent_reviews AS (
  SELECT
    artist_id,
    ROUND(AVG(score), 2) AS average_score,
    COUNT(*) AS review_count
  FROM reviews
  WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL 90 DAY
  GROUP BY artist_id
  HAVING COUNT(*) >= 5
),
completed_bookings AS (
  SELECT
    artist_id,
    COUNT(*) AS completed_booking_count
  FROM bookings
  WHERE status = 'completed'
  GROUP BY artist_id
)
SELECT
  a.name AS artist_name,
  a.category,
  rr.average_score,
  rr.review_count,
  COALESCE(cb.completed_booking_count, 0) AS completed_booking_count
FROM recent_reviews rr
JOIN artists a ON a.id = rr.artist_id
LEFT JOIN completed_bookings cb ON cb.artist_id = rr.artist_id
ORDER BY rr.average_score DESC, completed_booking_count DESC
LIMIT 10;
```

Indexes I would add:

```sql
CREATE INDEX idx_reviews_created_artist_score
  ON reviews (created_at, artist_id, score);

CREATE INDEX idx_bookings_status_artist
  ON bookings (status, artist_id);
```

The review index makes the 90-day range smaller before grouping. Including `artist_id` and `score` also lets MySQL read the needed review values from the index. The booking index helps filter completed rows and group them by artist. I would confirm both choices with `EXPLAIN ANALYZE` on production-like data.

At tens of millions of rows, I would calculate leaderboard rows in a scheduled background job and store the top results in a small summary table or Redis. Requests would read that prepared result. The trade-off is that the leaderboard becomes slightly delayed instead of being calculated live.

## Task B — Five schema problems

### 1. Important columns allow `NULL`

Names, categories, dates, booking owners, statuses, and review scores are required business data. Allowing them to be empty creates incomplete records.

```sql
ALTER TABLE artists
  MODIFY name VARCHAR(255) NOT NULL,
  MODIFY category VARCHAR(255) NOT NULL,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE bookings
  MODIFY artist_id INT NOT NULL,
  MODIFY client_id INT NOT NULL,
  MODIFY status VARCHAR(50) NOT NULL,
  MODIFY event_start DATETIME NOT NULL,
  MODIFY event_end DATETIME NOT NULL,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reviews
  MODIFY booking_id INT NOT NULL,
  MODIFY artist_id INT NOT NULL,
  MODIFY score INT NOT NULL,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

### 2. Money uses `FLOAT`

Floating-point values can introduce rounding errors. Money should use an exact decimal type.

```sql
ALTER TABLE artists MODIFY hourly_rate DECIMAL(10, 2) NOT NULL;
ALTER TABLE bookings MODIFY amount DECIMAL(10, 2) NULL;
```

### 3. Booking status accepts any text

A free-text status allows spelling mistakes and impossible values. A constrained value keeps the state consistent.

```sql
ALTER TABLE bookings
  MODIFY status ENUM(
    'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  ) NOT NULL DEFAULT 'pending';
```

### 4. Relationships have no foreign keys

Without foreign keys, a booking can refer to an artist or client that does not exist, and a review can refer to a missing booking.

```sql
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id),
  ADD CONSTRAINT fk_bookings_client
    FOREIGN KEY (client_id) REFERENCES users(id);

ALTER TABLE reviews
  ADD CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
  ADD CONSTRAINT fk_reviews_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id);
```

This assumes a `users` table exists and clients are stored there.

### 5. Review scores and booking dates have no integrity rules

Scores outside 1–5 are invalid, one booking should not be reviewed twice, and an event cannot end before it starts.

```sql
ALTER TABLE reviews
  ADD CONSTRAINT chk_reviews_score CHECK (score BETWEEN 1 AND 5),
  ADD CONSTRAINT uq_reviews_booking UNIQUE (booking_id);

ALTER TABLE bookings
  ADD CONSTRAINT chk_booking_dates CHECK (event_end > event_start);
```
