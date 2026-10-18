-- Lets posters choose how long a post shows. For databases created before 2026-10-17
-- (run after 2026-10-17-parish.sql). New databases don't need this: schema.sql includes it.
--   docker compose exec -T db mysql -udirectory -plocal-dev-password directory < database/migrations/2026-10-17-duration.sql
-- Existing posts keep the post type's default length (NULL).

ALTER TABLE listings
  ADD COLUMN duration_days SMALLINT UNSIGNED NULL COMMENT 'How long the poster asked it to show; NULL = the post type default' AFTER parish;
