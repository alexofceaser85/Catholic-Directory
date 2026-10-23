# Database

Every table and column in [`database/schema.sql`](../database/schema.sql). GitHub (and VS Code
with a Mermaid extension) draws the diagram below. **Update it whenever `schema.sql` changes**,
in the same commit as the schema and its migration.

How the tables are used: [architecture.md](architecture.md#data-model).

```mermaid
erDiagram
    listings ||--o{ listing_edits : "poster changes waiting for review"
    listings ||--o{ listing_photos : "has"
    listings ||--o{ reports : "reported as out of date"
    listings ||--o{ listing_history : "every action"

    listings {
        int id PK
        enum status "pending, approved, denied, removed"
        enum post_type "business, offering_services, help_wanted"
        varchar category "from post-options.js"
        varchar submitter_first_name "private"
        varchar submitter_last_name "private"
        varchar title
        varchar email
        varchar phone "nullable"
        varchar address "nullable"
        varchar parish
        smallint duration_days "nullable: days picked, from approval"
        text description
        varchar website "nullable"
        text links "newline-separated URLs"
        text photos "newline-separated photo keys, in order"
        text admin_notes "private, nullable"
        char manage_token_hash UK "SHA-256 of the poster's link token"
        datetime links_emailed_at "nullable: last 'email me my links'"
        datetime submitted_at
        datetime reviewed_at "nullable"
        datetime last_verified_at "nullable: approval or last renewal"
        date expires_on "nullable: last day shown; NULL for businesses"
        datetime updated_at
    }

    listing_edits {
        int id PK
        int listing_id FK
        json changes "the public fields the poster sent"
        enum status "pending, approved, rejected, replaced"
        varchar reviewed_by "admin email, nullable"
        datetime created_at
        datetime reviewed_at "nullable"
    }

    listing_photos {
        int id PK
        int listing_id FK
        char photo_key UK "random id in /photos/key.webp"
        mediumblob image "WebP, metadata stripped"
        smallint width
        smallint height
        datetime created_at
    }

    reports {
        int id PK
        int listing_id FK
        varchar reason
        enum status "open, resolved"
        varchar resolution "reverified, removed, dismissed"
        varchar resolved_by "admin email or poster"
        datetime created_at
        datetime resolved_at "nullable"
    }

    listing_history {
        int id PK
        int listing_id FK
        varchar actor "admin email or poster"
        varchar action "approved, renewed, edited, ..."
        varchar detail "nullable"
        datetime created_at
    }
```

Deleting a listing row deletes its edits, photos, reports and history (`ON DELETE CASCADE`).
The app itself never deletes listings: removing one only sets `status = 'removed'`.

## Migrations

`schema.sql` creates the tables in an empty database. A database created before a change
needs that change's file from [`database/migrations/`](../database/migrations/), run once, in
date order. Each file says which change it belongs to.
