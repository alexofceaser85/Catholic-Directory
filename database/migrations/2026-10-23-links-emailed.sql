-- Adds links_emailed_at to a database created before 2026-10-23.
-- New databases don't need this: schema.sql already includes it.
--   docker compose exec -T db mysql -udirectory -plocal-dev-password directory < database/migrations/2026-10-23-links-emailed.sql
-- It limits "Email me my links" to once per POSTER_EMAIL_LIMIT_HOURS per email address.

ALTER TABLE listings
  ADD COLUMN links_emailed_at DATETIME NULL COMMENT 'Last "Email me my links" email; limits how often it is sent' AFTER manage_token_hash;
