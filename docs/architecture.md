# Architecture

This document explains how a request moves through the code, how the data is stored,
and the security decisions. Read the [README](../README.md) first for the big picture.

## How a request flows

```
Browser (public/*.html + public/js/*.js)
   │  fetch('/api/...')  JSON in, JSON out
   ▼
server/app.js ── securityHeaders ── express.json
   │
   ├── /api/auth/*   routes/authRoutes.js     sign in / out
   ├── /api/admin/*  routes/adminRoutes.js    requireAdmin → dashboard & actions
   ├── /api/*        routes/publicRoutes.js   browse, submit, report
   └── everything else → files in public/
                │
                ▼
        validation/        check + clean the input (throws 400 with per-field messages)
                │
                ▼
        services/          the rules ("only a pending listing can be denied")
                │
                ▼
        repositories/      SQL only, one file per table
                │
                ▼
        presenters/        DB row → JSON shape (public shape hides private fields)
```

Each layer has one job, so a change usually touches one file:

| I want to… | Change |
|---|---|
| Add a field to the form | `database/schema.sql` → `repositories/listingRepository.js` (COLUMNS) → `validation/listingValidation.js` → `presenters/listingPresenter.js` → the HTML form(s) and card(s) |
| Change who can do what, or what an action does | `services/moderationService.js` (and the matching buttons in `public/admin/js/card-actions.js`) |
| Change wording or layout | The HTML file, or `public/css/styles.css` |
| Change the 90-day rule | `REVERIFY_AFTER_DAYS` in `.env`, no code change |

### Errors

Anything can `throw new HttpError(status, message)` (`server/lib/httpError.js`).
`middleware/errorHandler.js` turns it into `{ "error": message }` JSON. Unexpected errors
are logged on the server and the visitor gets a generic message, so internal details
never leak. Express 5 catches errors thrown in `async` route handlers automatically.

### Front end

No framework and no build step. Each page loads one entry script as an ES module
(`<script type="module">`), which imports small helpers:

| File | Purpose |
|---|---|
| `public/js/api.js` | `api.get/post/put`. Throws `ApiError` with per-field messages. |
| `public/js/dom.js` | `el()` builds elements with **textContent only** (never innerHTML), plus `safeHref()` so only http(s) links are clickable. |
| `public/js/form-errors.js` | Reads a form, and shows server validation messages under each field. |
| `public/admin/js/dashboard.js` | Tabs and loading. Tabs are defined as data in `tabs.js`. |
| `public/admin/js/admin-card.js` | One listing card. The buttons come from `card-actions.js`. |

## Data model

Three tables (see `database/schema.sql`):

```
listings ──< reports          "this listing is out of date" from the public
    │
    └────< admin_actions      audit trail of every admin action
```

### Listing status

```
            approve
 pending ───────────▶ approved ──remove──▶ removed
    │                 │   ▲                   │
    │ deny            └───┘ reverify          │ approve (restore)
    ▼                                         │
 denied ──── approve ─────────────────────────┘
```

The allowed starting statuses for each action are in `ALLOWED_FROM` in
`server/services/moderationService.js`. Trying anything else returns `409 Conflict`
(for example, two admins clicking at the same time).

### The verification counter

`listings.last_verified_at` is set when a listing is approved and every time it is
reverified. "Days since verified" is `DATEDIFF(NOW(), last_verified_at)`, calculated
on every query, so there is no counter to increment and no scheduled job.
A live listing appears in **Needs reverification** once that reaches `REVERIFY_AFTER_DAYS`.

Reverifying or removing a listing also closes its open reports. Dismissing a report
closes only that report and leaves the counter alone.

### Times

Everything is stored in UTC (`db/pool.js` sets the MySQL session time zone to `+00:00`).
The browser formats dates in the visitor's local time.

## How admin sign-in works

There are no passwords in this app, on purpose. Admins prove who they are to **Google**,
and the app trusts Google's answer only after checking it:

1. The admin clicks **Sign in with Google** and signs in on Google's own page, with their
   password plus 2-Step Verification (phone prompt, code or security key) if it's on.
2. Google gives the browser a signed token saying "this is jane@gmail.com".
3. The server checks Google's signature, that the token was made for *our* client ID,
   that it hasn't expired, and that Google has verified the email (`auth/googleSignIn.js`).
4. The server checks the email is in `ADMIN_EMAILS`, then sets an 8-hour signed cookie.
   The email is re-checked on every request after that.

So the strength of admin sign-in is the strength of the admins' Google accounts.
**Every admin should turn on 2-Step Verification** in their Google account. The app
can't force this for personal Gmail accounts. (A Google Workspace organization can.)

Typing an email address alone never works on the live site. The email-only form exists
for local testing, and the server only offers it when **both** `NODE_ENV=development`
and `DEV_ADMIN_LOGIN=true` are set. Any other `NODE_ENV`, including a missing one,
counts as production (`server/config.js`).

## Security

| Risk | Protection | Where |
|---|---|---|
| Someone reaches the admin API | Signed HTTP-only session cookie, and the email is re-checked against `ADMIN_EMAILS` on **every** request | `auth/adminSession.js`, `middleware/requireAdmin.js` |
| Test sign-in left on by mistake | Only possible with an explicit `NODE_ENV=development`; unset or anything else counts as production. A warning prints on startup when it's on. | `config.js`, `index.js` |
| Forged Google sign-in | Google's signature, audience (our client ID) and verified email are checked server-side | `auth/googleSignIn.js` |
| Cross-site request forgery | `SameSite=Strict` cookie, plus write requests must be JSON (HTML forms on other sites can't send JSON) | `adminSession.js`, `middleware/requireJson.js` |
| Script injection (XSS) through submitted text | Pages only ever set `textContent`. Links are limited to http(s) in validation **and** when rendering. A strict Content-Security-Policy blocks inline scripts. | `public/js/dom.js`, `validation/FieldValidator.js`, `middleware/securityHeaders.js` |
| SQL injection | Every query uses `?` placeholders. Column names come from a fixed map, never from input. | `repositories/*` |
| Spam submissions | Hidden honeypot field, 5 submissions and 10 reports per IP per hour, 20 KB body limit | `validation/listingValidation.js`, `middleware/rateLimit.js`, `app.js` |
| Private names leaking | The public JSON shape is built field by field (`toPublicListing`). Names, notes and status are never included. | `presenters/listingPresenter.js` |

Known limits, acceptable for a chapter-sized site:

- Rate-limit counters live in memory, so they reset on restart and aren't shared if you
  run several server copies.
- Signing out deletes the cookie, but a copied cookie stays valid until it expires
  (8 hours). To sign everyone out immediately, change `SESSION_SECRET`.
- The honeypot stops simple bots, not determined ones. If spam becomes a problem, add
  Cloudflare Turnstile or reCAPTCHA to `submit.html` and verify it in `publicRoutes.js`.
