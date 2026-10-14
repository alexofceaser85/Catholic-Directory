-- CLM Directory database schema (MySQL 8+).
-- Safe to run on an empty database. See docs/architecture.md for how the tables relate.

-- One row per business that asked to be listed.
-- `status` drives the whole workflow:
--   pending  -> waiting for an admin
--   approved -> live on the public directory
--   denied   -> rejected during review (never shown)
--   removed  -> taken down after being live (never shown)
CREATE TABLE IF NOT EXISTS listings (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status                ENUM('pending', 'approved', 'denied', 'removed') NOT NULL DEFAULT 'pending',

  -- Private: only admins ever see these. Used for approval, never published.
  submitter_first_name  VARCHAR(100) NOT NULL,
  submitter_last_name   VARCHAR(100) NOT NULL,

  -- Public business details.
  business_name         VARCHAR(200) NOT NULL,
  email                 VARCHAR(254) NOT NULL,
  phone                 VARCHAR(40)  NULL,
  address               VARCHAR(500) NULL,
  description           TEXT         NOT NULL,
  website               VARCHAR(500) NULL,
  links                 TEXT         NULL COMMENT 'Newline-separated list of URLs',

  -- Private admin notes.
  admin_notes           TEXT         NULL,

  submitted_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at           DATETIME     NULL COMMENT 'Last approve/deny/remove decision',
  last_verified_at      DATETIME     NULL COMMENT 'Approval or last reverification; the 90-day counter starts here',
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listings_status (status),
  INDEX idx_listings_last_verified (last_verified_at)
);

-- "This listing is out of date" reports from the public.
CREATE TABLE IF NOT EXISTS reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   INT UNSIGNED NOT NULL,
  reason       VARCHAR(1000) NOT NULL,
  status       ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  resolution   VARCHAR(30)  NULL COMMENT 'reverified, removed or dismissed',
  resolved_by  VARCHAR(254) NULL COMMENT 'Admin email',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME     NULL,

  INDEX idx_reports_status (status),
  CONSTRAINT fk_reports_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);

-- Audit trail: every admin action on a listing.
CREATE TABLE IF NOT EXISTS admin_actions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   INT UNSIGNED NOT NULL,
  admin_email  VARCHAR(254) NOT NULL,
  action       VARCHAR(30)  NOT NULL COMMENT 'approved, denied, removed, reverified, edited, report_dismissed',
  detail       VARCHAR(1000) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admin_actions_listing (listing_id),
  CONSTRAINT fk_admin_actions_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);
