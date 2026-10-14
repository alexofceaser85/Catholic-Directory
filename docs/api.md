# API reference

All endpoints take and return JSON. Write requests (POST/PUT) **must** send
`Content-Type: application/json`, otherwise they get `415`.

Errors always look like:

```json
{ "error": "Please fix the highlighted fields.", "fields": { "email": "Business email must be a valid email address." } }
```

`fields` is only present for validation errors (`400`).

## Listing shapes

**Public listing** (what anyone can see):

```json
{
  "id": 1,
  "businessName": "Peachtree Bookkeeping",
  "email": "hello@peachtreebooks.example",
  "phone": "404-555-0101",
  "address": "123 Peachtree St NE, Atlanta, GA",
  "description": "Bookkeeping and payroll…",
  "website": "https://peachtreebooks.example",
  "links": ["https://instagram.com/peachtreebooks"],
  "lastVerifiedAt": "2026-10-14T03:53:24.000Z"
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
  "needsReverification": false,
  "nameMatches": ["Email"]
}
```

## Public (no sign-in)

| Method & path | Body | Result |
|---|---|---|
| `GET /api/listings` | none | Live listings, A→Z |
| `POST /api/listings` | `submitterFirstName`, `submitterLastName`, `businessName`, `email`, `phone`, `address`, `description`, `website`, `links` (array or newline text), `consent: true` | `201 { ok: true }`. The listing is created as pending. Limited to 5 per IP per hour. |
| `POST /api/listings/:id/reports` | `reason` | `201 { ok: true }`. Only for live listings, otherwise 404. Limited to 10 per IP per hour. |

Both POSTs accept a hidden `companyFax` honeypot field. If it's filled in, the server
replies with success but saves nothing.

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
| `GET /api/admin/summary` | none | Counts: `{ pending, approved, denied, removed, needsReverification, openReports, reverifyAfterDays }` |
| `GET /api/admin/listings?status=pending\|approved\|denied\|removed` | none | Admin listings |
| `GET /api/admin/listings/needs-reverification` | none | Live listings at or past the reverify age, oldest first |
| `GET /api/admin/listings/:id/history` | none | `[{ action, adminEmail, detail, createdAt }]`, newest first |
| `GET /api/admin/reports` | none | `[{ listing, reports: [{ id, reason, createdAt }] }]`, open reports grouped by listing |
| `PUT /api/admin/listings/:id` | Public fields + `adminNotes` | Saves edits (submitter names can't be changed) |
| `POST /api/admin/listings/:id/approve` | `{ note? }` | pending/denied/removed → approved. Starts the counter at 0. |
| `POST /api/admin/listings/:id/deny` | `{ note? }` | pending → denied |
| `POST /api/admin/listings/:id/remove` | `{ note? }` | pending/approved → removed. Closes open reports. |
| `POST /api/admin/listings/:id/reverify` | `{ note? }` | Live only. Resets the counter to 0 and closes open reports. |
| `POST /api/admin/reports/:id/dismiss` | none | Closes one report without changing the listing |

An action that isn't allowed from the listing's current status returns `409`.
