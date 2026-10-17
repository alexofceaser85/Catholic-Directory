-- Adds the parish field to a database created before 2026-10-17.
-- New databases don't need this: schema.sql already includes it.
--   docker compose exec -T db mysql -udirectory -plocal-dev-password directory < database/migrations/2026-10-17-parish.sql
-- Existing posts get an empty parish; it's filled in when the poster or an admin next edits the post.

ALTER TABLE listings
  ADD COLUMN parish VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'The parish the poster belongs to (free text)' AFTER address;
