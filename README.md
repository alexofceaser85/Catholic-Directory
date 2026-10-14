# CLM Business Directory

A small website where anyone can browse chapter businesses, ask to be listed, and
report a listing as out of date — and where chapter admins review every request
before it goes live.

It's the website version of the Google Form + Sheets workflow:

```
 Visitor submits ──▶ Pending ──▶ Admin approves / denies / edits ──▶ Live on the directory
                                                                      │
              ┌───────────────────────────────────────────────────────┤
              ▼                                                       ▼
   90+ days since last verified                       Visitor reports "out of date"
              │                                                       │
              └──────▶ Admin contacts the business (public email/phone) ◀┘
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
            Mark reverified        Edit details          Remove
          (counter back to 0)
```

- **No accounts for the public.** Browsing, submitting and reporting need no sign-in.
  Spam is limited with a hidden honeypot field and per-IP rate limits.
- **Admins sign in with Google.** Google checks the password (and 2-Step Verification,
  if it's on), and the site then checks the email is in `ADMIN_EMAILS`. The site never
  sees or stores a password. See [How admin sign-in works](docs/architecture.md#how-admin-sign-in-works).
- **Submitter names stay private.** Like the sheet, the form asks for a first and last
  name for approval only. The admin dashboard warns when a name shows up in any
  public field.
- **Everything is logged.** Each listing has a history of who approved, edited,
  reverified or removed it.

## Tech stack

| Part | What | Why |
|---|---|---|
| Pages | Plain HTML, CSS and JavaScript modules | No build step: edit a file, refresh the browser |
| Server | Node.js + [Express](https://expressjs.com/) | Small, well known, JavaScript on both sides |
| Database | MySQL 8 | As requested; any MySQL 8 / MariaDB 10.6+ host works |
| Admin sign-in | Google Identity Services | No passwords to store or reset |

Only four npm packages: `express`, `mysql2`, `google-auth-library`, `dotenv`.

## Quick start (local, with Docker)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env
# In .env set:  SESSION_SECRET=<any 32+ characters>   ADMIN_EMAILS=you@example.com
#               DEV_ADMIN_LOGIN=true   (Docker runs with NODE_ENV=development locally)
docker compose up --build
```

- Directory: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/> (with `DEV_ADMIN_LOGIN=true` you can sign in by typing an admin email; this test-only
  shortcut has no password and is impossible to turn on unless `NODE_ENV=development`)

Port 3000 already in use? Run `APP_PORT=3100 docker compose up --build` and use port 3100.

Load fake listings so every admin tab has something in it:

```bash
docker compose exec -T db mysql -uclm_directory -plocal-dev-password clm_directory < database/sample-data.sql
```

Start over with an empty database: `docker compose down -v`.

## Quick start (local, without Docker)

Requires Node.js 20+ and a MySQL 8 server.

```bash
npm install
mysql -u root -p -e "CREATE DATABASE clm_directory; CREATE USER 'clm_directory'@'localhost' IDENTIFIED BY 'change-me'; GRANT ALL ON clm_directory.* TO 'clm_directory'@'localhost';"
mysql -u clm_directory -p clm_directory < database/schema.sql
cp .env.example .env   # then edit the values; set NODE_ENV=development for local testing
npm run dev            # restarts automatically when you change a server file
```

## Tests

```bash
npm test
```

Covers the validation rules, the name check, session tokens and rate limiting.

## Configuration

All settings are environment variables (see [`.env.example`](.env.example)).

| Variable | Required | Meaning |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | MySQL connection |
| `SESSION_SECRET` | yes | 32+ random characters used to sign admin cookies. Changing it signs everyone out. |
| `GOOGLE_CLIENT_ID` | for Google sign-in | OAuth client ID ([how to get one](docs/deployment.md#1-create-the-google-sign-in-client)) |
| `ADMIN_EMAILS` | yes | Comma-separated Google emails allowed into `/admin` |
| `REVERIFY_AFTER_DAYS` | no (90) | When a live listing moves to "Needs reverification" |
| `NODE_ENV` | no | Leave as `production` on the live server. Anything other than `development` is treated as production. |
| `TRUST_PROXY` | no | `true` behind a hosting proxy (Render, Railway, nginx…) |
| `DEV_ADMIN_LOGIN` | no | `true` = email-only admin sign-in for local testing (no password). Only works when `NODE_ENV=development`. |
| `PORT` | no (3000) | Port the server listens on |

## Project layout

```
clm-directory/
├── server/                     Node.js back end
│   ├── index.js                Starts the server
│   ├── app.js                  Wires middleware + routes + static files
│   ├── config.js               Reads environment variables (only place that does)
│   ├── routes/                 URL → handler. Thin: validate, call a service, respond
│   │   ├── publicRoutes.js       /api/listings (browse, submit, report)
│   │   ├── adminRoutes.js        /api/admin/*  (dashboard + actions)
│   │   └── authRoutes.js         /api/auth/*   (Google sign-in, sign-out)
│   ├── services/               Business rules
│   │   ├── directoryService.js   What the public can do
│   │   ├── moderationService.js  Approve / deny / remove / reverify / edit (the workflow)
│   │   └── dashboardService.js   Read-only data for the admin tabs
│   ├── repositories/           All SQL, one file per table
│   ├── presenters/             Database rows → JSON (decides what's public vs admin-only)
│   ├── validation/             Form rules and the FieldValidator helper
│   ├── auth/                   Admin session cookie + Google token check
│   ├── middleware/             requireAdmin, rate limits, security headers, errors
│   ├── lib/                    Small helpers (name check, signed tokens, cookies…)
│   └── db/pool.js              MySQL connection pool
├── public/                     Everything the browser loads (served as-is)
│   ├── index.html              Public directory
│   ├── submit.html             "Add your business" form
│   ├── css/styles.css          Shared styles (colors are variables at the top)
│   ├── js/                     Public page scripts + shared helpers (api.js, dom.js…)
│   └── admin/                  Admin dashboard (index.html, admin.css, js/)
├── database/
│   ├── schema.sql              Creates the tables
│   └── sample-data.sql         Fake data for local testing only
├── tests/                      `npm test`
├── docs/                       Longer guides (below)
├── Dockerfile, docker-compose.yml
└── .env.example
```

## More documentation

- [docs/admin-guide.md](docs/admin-guide.md): how to review, reverify and handle reports (for chapter admins)
- [docs/architecture.md](docs/architecture.md): how the code fits together, the data model and security
- [docs/api.md](docs/api.md): every API endpoint
- [docs/deployment.md](docs/deployment.md): Google sign-in setup and putting the site online
