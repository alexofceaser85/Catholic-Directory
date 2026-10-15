-- Catholic Business Directory database schema (MySQL 8+).
-- Safe to run on an empty database. See docs/architecture.md for how the tables relate.

-- One row per post: a business, someone offering services, or a help-wanted request.
-- `status` drives the whole workflow:
--   pending  -> waiting for an admin
--   approved -> live on the public directory (unless its expires_on date has passed)
--   denied   -> rejected during review (never shown)
--   removed  -> taken down after being live, by an admin or by the poster (never shown)
CREATE TABLE IF NOT EXISTS listings (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status                ENUM('pending', 'approved', 'denied', 'removed') NOT NULL DEFAULT 'pending',
  post_type             ENUM('business', 'offering_services', 'help_wanted') NOT NULL DEFAULT 'business'
                        COMMENT 'Ids from public/js/post-options.js',
  category              VARCHAR(60)  NOT NULL COMMENT 'One of CATEGORIES in public/js/post-options.js',

  -- Private: only admins ever see these. Used for approval, never published.
  submitter_first_name  VARCHAR(100) NOT NULL,
  submitter_last_name   VARCHAR(100) NOT NULL,

  -- Public details.
  title                 VARCHAR(200) NOT NULL COMMENT 'Business name, or what is offered / needed',
  email                 VARCHAR(254) NOT NULL,
  phone                 VARCHAR(40)  NULL,
  address               VARCHAR(500) NULL,
  description           TEXT         NOT NULL,
  website               VARCHAR(500) NULL,
  links                 TEXT         NULL COMMENT 'Newline-separated list of URLs',

  -- Private admin notes.
  admin_notes           TEXT         NULL,

  -- The poster's private "manage my post" link holds a random token. Only its SHA-256 hash
  -- is stored, so a database leak doesn't hand out working links.
  manage_token_hash     CHAR(64)     NULL,

  submitted_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at           DATETIME     NULL COMMENT 'Last approve/deny/remove decision',
  last_verified_at      DATETIME     NULL COMMENT 'Approval or last reverification/renewal; the 90-day counter starts here',
  expires_on            DATE         NULL COMMENT 'Last day a services/help-wanted post shows. NULL for businesses.',
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listings_status (status),
  INDEX idx_listings_last_verified (last_verified_at),
  INDEX idx_listings_email (email),
  UNIQUE INDEX idx_listings_manage_token (manage_token_hash)
);

-- Changes a poster asked for on a live post. The live version stays up until an admin
-- approves the change. Each listing has at most one pending edit; a newer one replaces it.
CREATE TABLE IF NOT EXISTS listing_edits (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id    INT UNSIGNED NOT NULL,
  changes       JSON         NOT NULL COMMENT 'The full set of public fields the poster submitted',
  status        ENUM('pending', 'approved', 'rejected', 'replaced') NOT NULL DEFAULT 'pending',
  reviewed_by   VARCHAR(254) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at   DATETIME     NULL,

  INDEX idx_listing_edits_status (status),
  CONSTRAINT fk_listing_edits_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);

-- "This listing is out of date" reports from the public.
CREATE TABLE IF NOT EXISTS reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   INT UNSIGNED NOT NULL,
  reason       VARCHAR(1000) NOT NULL,
  status       ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  resolution   VARCHAR(30)  NULL COMMENT 'reverified, removed or dismissed',
  resolved_by  VARCHAR(254) NULL COMMENT 'Admin email, or "poster"',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME     NULL,

  INDEX idx_reports_status (status),
  CONSTRAINT fk_reports_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);

-- History: every admin or poster action on a listing.
CREATE TABLE IF NOT EXISTS listing_history (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   INT UNSIGNED NOT NULL,
  actor        VARCHAR(254) NOT NULL COMMENT 'Admin email, or "poster" for the person who posted it',
  action       VARCHAR(30)  NOT NULL COMMENT 'approved, denied, removed, reverified, renewed, edited, edit_requested, edit_approved, edit_rejected, check_in_sent, report_dismissed',
  detail       VARCHAR(1000) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_listing_history_listing (listing_id),
  CONSTRAINT fk_listing_history_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
);
