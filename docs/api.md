# API reference

All endpoints take and return JSON. Write requests (POST/PUT) **must** send
`Content-Type: application/json`, otherwise they get `415`.

Errors always look like:

```json
{ "error": "Please fix the highlighted fields.", "fields": { "email": "Contact email must be a valid email address." } }
```

`fields` is only present for validation errors (`400`).

## Listing shapes

**Public listing** (what anyone can see):

```json
{
  "id": 4,
  "postType": "Help wanted",
  "category": "Farm & livestock",
  "title": "Farmhand for fall harvest, 2 days a week",
  "email": "jobs@sweetwatercreek.example",
  "phone": null,
  "address": "Douglasville, GA",
  "parish": "St. Peter Chanel, Roswell",
  "description": "Picking, washing and packing vegetables…",
  "website": null,
  "links": [],
  "photos": ["3f9c…e01a"],
  "lastVerified": "2026-10-12",
  "expires": "2026-11-11"
}
```

`postType` is the label from `public/js/post-options.js`; forms send the label too, and
the server stores the type's id. `expires` is `""` for businesses. `photos` are photo keys in
display order; each one is served at `GET /photos/<key>.webp`.

**Poster listing** (`/api/manage/post`) = public listing plus:

```json
{
  "status": "approved",
  "isExpired": false,
  "pendingEdit": { "submittedAt": "…", "changes": { "title": "…", "…": "…" } }
}
```

**Admin listing** = public listing plus:

```json
{
  "status": "approved",
  "submitterFirstName": "Jordan",
  "submitterLastName": "Rivera",
  "adminNotes": null,
  "submittedAt": "…",
  "reviewedAt": "…",
  "daysSinceVerified": 12,
  "isExpired": false,
  "needsReverification": false,
  "nameMatches": ["Email"]
}
```

## Public (no sign-in)

| Method & path | Body | Result |
|---|---|---|
| `GET /api/listings` | none | Live listings (approved and not expired), A→Z |
| `POST /api/listings` | `postType` (label), `category`, `submitterFirstName`, `submitterLastName`, `title`, `email`, `phone`, `address`, `parish`, `description`, `website`, `links` (array or newline text), `photos` (optional, see below), `durationDays` (optional: one of the post type's `durationChoices`, otherwise its default), `consent: true` | `201 { ok: true }`. Created as pending; the poster is emailed their manage link. 5 per IP per hour. |
| `POST /api/listings/:id/reports` | `reason` | `201 { ok: true }`. Only for live listings, otherwise 404. 10 per IP per hour. |

### Photos

Forms that save a post (`POST /api/listings`, `POST /api/manage/edit`, `PUT /api/admin/listings/:id`)
may send `photos`: the full, ordered list the post should have, at most `MAX_PHOTOS` (4).
Each entry is either `{ "keep": "<key>" }` for a photo the post already has, or
`{ "upload": "<base64 JPEG/PNG/WebP>" }` for a new one (at most 2.5 MB each). New posts can only
upload. Leaving `photos` out keeps the post's photos as they are. The server re-encodes every
upload as WebP (max 1600px, all metadata including GPS removed); anything that isn't a real
photo gets a `400` with `fields.photos`. These three routes accept bodies up to about 14 MB;
every other route is limited to 20 KB.

On a live post, a poster's photo change waits in their pending edit like any other field.
Photos no longer used by the post or its pending edit are deleted.

`GET /photos/<key>.webp` serves a stored photo (`404` if unknown). Keys are random, so photos
of posts that aren't public yet can only be found by the poster and admins.

Both POSTs accept a hidden `companyFax` honeypot field. If it's filled in, the server
replies with success but saves nothing.

## Poster (token from the emailed link)

Every request sends `token`, the part after `#token=` in the link, in the JSON body.
An unknown, malformed or denied post's token gets `404` with "This link doesn't work anymore".
60 requests per IP per 15 minutes.

| Method & path | Body | Result |
|---|---|---|
| `POST /api/manage/post` | `token` | Poster listing |
| `POST /api/manage/edit` | `token` + `title`, `category`, `email`, `phone`, `address`, `parish`, `description`, `website`, `links`, `photos` | `{ needsReview }`. Pending posts change right away (`false`). Live posts get a pending edit for an admin (`true`); a newer edit replaces an older one. Removed posts: `409`. |
| `POST /api/manage/renew` | `token` | Approved only. Restarts the shelf life: businesses' "last verified" becomes today; other posts show for another full period. Otherwise `409`. |
| `POST /api/manage/remove` | `token` | Pending or approved → removed. Closes open reports and drops a pending edit. |
| `POST /api/manage/send-links` | `email` | Always `{ ok: true }`. Emails a fresh link for each pending or live post with that contact email; older links stop working. 5 per IP per hour. Accepts the `companyFax` honeypot. |

Posters can't change the post type, their name, the status or admin notes.

## Auth

| Method & path | Body | Result |
|---|---|---|
| `GET /api/auth/config` | none | `{ googleClientId, devLogin }` for the sign-in page |
| `GET /api/auth/me` | none | `{ email }`, where `email` is `null` when signed out |
| `POST /api/auth/google` | `credential` (from Google's button) | Sets the session cookie. Returns `{ email }`, `401` if the token is invalid, or `403` if the email isn't an admin. |
| `POST /api/auth/dev-login` | `email` | Local testing only: needs `NODE_ENV=development` and `DEV_ADMIN_LOGIN=true`. Returns 404 otherwise. |
| `POST /api/auth/logout` | none | Clears the cookie |

## Admin (signed-in admin required, otherwise `401`)

| Method & path | Body | Result |
|---|---|---|
| `GET /api/admin/summary` | none | Counts: `{ pending, approved, denied, removed, needsReverification, expired, editRequests, openReports, reverifyAfterDays }` |
| `GET /api/admin/listings?status=pending\|approved\|denied\|removed` | none | Admin listings |
| `GET /api/admin/listings/needs-reverification` | none | Live businesses at or past the reverify age, oldest first |
| `GET /api/admin/listings/expired` | none | Approved posts past their expiry date (already hidden publicly) |
| `GET /api/admin/listings/:id/history` | none | `[{ actor, action, detail, createdAt }]`, newest first. `actor` is an admin email or `"poster"`. |
| `GET /api/admin/reports` | none | `[{ listing, reports: [{ id, reason, createdAt }] }]`, open reports grouped by listing |
| `GET /api/admin/edits` | none | `[{ listing, edit: { id, submittedAt, changes, changedFields } }]`, pending poster edits |
| `PUT /api/admin/listings/:id` | Public fields (including `photos`) + `postType` (label) + `adminNotes` | Saves edits (submitter names can't be changed) |
| `POST /api/admin/listings/:id/approve` | `{ note? }` | pending/denied/removed → approved. Starts the shelf life. |
| `POST /api/admin/listings/:id/deny` | `{ note? }` | pending → denied |
| `POST /api/admin/listings/:id/remove` | `{ note? }` | pending/approved → removed. Closes open reports and drops a pending edit. |
| `POST /api/admin/listings/:id/reverify` | `{ note? }` | Live only. Restarts the shelf life (reverify a business, renew other posts) and closes open reports. |
| `POST /api/admin/listings/:id/check-in` | `{ note? }` | Live only. Emails the poster a fresh manage link asking them to confirm/renew, edit or remove. |
| `POST /api/admin/edits/:id/approve` | `{ note? }` | Applies a pending poster edit to the live listing |
| `POST /api/admin/edits/:id/reject` | `{ note? }` | Discards a pending poster edit |
| `POST /api/admin/reports/:id/dismiss` | none | Closes one report without changing the listing |

An action that isn't allowed from the listing's current status returns `409`.
