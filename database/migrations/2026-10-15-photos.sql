-- Adds photo uploads to a database created before 2026-10-15.
-- New databases don't need this: schema.sql already includes it.
--   docker compose exec -T db mysql -udirectory -plocal-dev-password directory < database/migrations/2026-10-15-photos.sql

ALTER TABLE listings
  ADD COLUMN photos TEXT NULL COMMENT 'Newline-separated photo keys in display order (see listing_photos)' AFTER links;

CREATE TABLE IF NOT EXISTS listing_photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   INT UNSIGNED NOT NULL,
  photo_key    CHAR(32)     NOT NULL COMMENT 'Random id used in the photo URL: /photos/<key>.webp',
  image        MEDIUMBLOB   NOT NULL COMMENT 'WebP, longest side at most MAX_PHOTO_SIDE',
  width        SMALLINT UNSIGNED NOT NULL,
  height       SMALLINT UNSIGNED NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_listing_photos_key (photo_key),
  INDEX idx_listing_photos_listing (listing_id),
  CONSTRAINT fk_listing_photos_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);

SELE