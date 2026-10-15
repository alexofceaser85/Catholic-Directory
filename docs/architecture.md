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
   ├── /api/manage/* routes/manageRoutes.js   poster's private link: view, edit, renew, remove
   ├── /api/*        routes/publicRoutes.js   browse, post, report
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
        presenters/        DB row → JSON shape (public / poster / admin shapes)
```

Each layer has one job, so a change usually touches one file:

| I want to… | Change |
|---|---|
| Add a field to the form | `database/schema.sql` → `repositories/listingRepository.js` (COLUMNS) → `validation/listingValidation.js` → `presenters/listingPresenter.js` → the HTML form(s) and card(s) |
| Change who can do what, or what an action does | `services/moderationService.js` (and the matching buttons in `public/admin/js/card-actions.js`) |
| Change wording or layout | The HTML file, or `public/css/styles.css` |
| Change the 90-day rule | `REVERIFY_AFTER_DAYS` in `.env`, no code change |
| Change a shelf life, add a post type or category | `public/js/post-options.js` (read by both browser and server). A new post type id also needs adding to the `post_type` ENUM in `schema.sql`. |
| Change what emails say | `server/services/posterEmails.js` |

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
| `public/admin/js/edit-request-card.js` | A poster's requested changes, "now" vs "requested". |
| `public/js/post-options.js` | Post types, shelf lives and categories. Also imported by the server. |
| `public/js/manage-page.js` | "Manage your post": reads the token from the link, then summary, edit form, renew/remove. |

## Data model

Four tables (see `database/schema.sql`):

```
listings ──< reports          "this listing is out of date" from the public
    │
    ├────< listing_edits      changes a poster asked for on a live post (at most one pending)
    │
    └────< listing_history    every admin and poster action ("actor" = admin email or "poster")
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

### Shelf life: reverification and expiry

Approving, reverifying and renewing all call `restartShelfLife` (in `listingRepository.js`):

- `last_verified_at` becomes now.
- `expires_on` becomes today + the type's `expiresAfterDays` for services and help-wanted
  posts, and stays `NULL` for businesses.

Nothing runs on a schedule. Every query works it out from those two columns:

- **Public list:** `status = 'approved' AND (expires_on IS NULL OR expires_on >= CURRENT_DATE())`.
  An expired post disappears at midnight UTC after its expiry date, with no job to run.
- **Needs reverification:** approved businesses with `last_verified_at` at least
  `REVERIFY_AFTER_DAYS` old.
- **Expired tab:** approved posts with `expires_on` in the past. They keep status
  `approved`, so renewing brings them straight back.

Reverifying or removing a listing also closes its open reports. Dismissing a report
closes only that report and leaves the counter alone.

### Times

Everything is stored in UTC (`db/pool.js` sets the MySQL session time zone to `+00:00`).
The browser formats dates in the visitor's local time. Expiry dates roll over at midnight
UTC, which is 7 or 8 pm in Atlanta, so a post leaves a few hours before the end of its
last day.

## Poster links (no accounts)

Posters never create an account. Instead, the post's contact email gets a private link:

```
https://directory.example.org/manage#token=Qm9vb…   (43 random characters)
```

1. On submission, `lib/manageToken.js` makes a token from 32 random bytes (256 bits, so it
   can't be guessed) and stores only its **SHA-256 hash** in `listings.manage_token_hash`.
   Someone who reads the database still can't build a working link.
2. The token sits after `#`. Browsers never send that part to the server or to other
   sites, so it doesn't end up in server logs or `Referer` headers. `manage-page.js` reads
   it and sends it in the JSON body of each `/api/manage/*` request.
3. The server hashes what it receives and looks the post up by the hash.
4. **Lost link:** `/manage` asks for the contact email and emails a fresh link for each
   pending or live post with that address. Since only hashes are stored, a new token is
   made each time, and the old link stops working. The answer is always the same, so the
   form can't be used to find out who has posted. **Email poster** in the admin
   dashboard does the same for one post.

What a link can do is limited (`services/posterService.js`):

| Post status | View | Edit | Renew | Remove |
|---|---|---|---|---|
| pending | yes | applies right away (not public yet) | no | yes |
| approved | yes | saved as a pending edit for an admin; live version unchanged | yes | yes |
| removed | yes | no | no | no |
| denied | "link doesn't work" | | | |

Posters can't change the post type, their name, the status or admin notes
(`validatePosterEdit`). Edits to live posts go through admin review, because otherwise
an approved post could be swapped for anything, including personal names.

The link proves someone can read that inbox. That's the same trust as "reply to this
email to change your listing", without an admin in the loop. If a contact email is
shared (say, a family address), anyone who can read it can manage the post.

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
| Private names leaking | The public JSON shape is built field by field (`toPublicListing`). Names, notes and status are never included. Emails to posters never include names. | `presenters/listingPresenter.js`, `services/posterEmails.js` |
| Someone else editing a post | Only the 256-bit token from the emailed link works; the database stores its hash; edits to live posts need admin approval | `lib/manageToken.js`, `services/posterService.js` |
| Finding out who posted ("is this email in the directory?") | "Email me my links" always gives the same answer and is rate limited (5/hour/IP) | `routes/manageRoutes.js` |

Known limits, acceptable for a community-sized site:

- Rate-limit counters live in memory, so they reset on restart and aren't shared if you
  run several server copies.
- Signing out deletes the cookie, but a copied cookie stays valid until it expires
  (8 hours). To sign everyone out immediately, change `SESSION_SECRET`.
- The honeypot stops simple bots, not determined ones. If spam becomes a problem, add
  Cloudflare Turnstile to `submit.html` and verify it in `publicRoutes.js` (the `sheets`
  branch has working Turnstile code to borrow).
- Manage links don't expire on their own. "Email me my links" or **Email poster**
  replaces a link; removing the post makes it read-only.
- A failed email is logged, not retried. The post is still saved; the poster can use
  "Email me my links" later.
