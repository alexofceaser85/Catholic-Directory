# Catholic Business Directory (database version)

A website where anyone can browse Catholic farms, businesses and tradespeople, post their
own listing, offer their skills, or ask for help, and where admins review every post
before it goes live. Posters can edit, renew or remove their own posts through a private
emailed link, with no account needed.

This is the `sql` branch. The `sheets` branch runs the same workflow on Google Sheets
with no server, but posters can't manage their own posts there.

| Post type | Example | Shelf life |
|---|---|---|
| Business | A farm, shop or small business | Stays up; rechecked every 90 days |
| Offering services | A carpenter or fencer looking for work | Hidden 60 days after approval, unless renewed |
| Help wanted | A farm needing harvest help | Hidden 30 days after approval, unless renewed |

Every post also has a category (Farm & livestock, Trades & construction, …). The
directory filters by type, category and search text.

```
 Someone posts ──▶ Pending ──▶ Admin approves / denies / edits ──▶ Live
      │                                                            │
      └─ emailed a private "manage your post" link                 │
                                                                   ▼
   Poster, with their link:          Admin dashboard:
   • edit (live posts: admin approves the change; live version stays meanwhile)
   • renew / "still current"         • Needs reverification (businesses, 90+ days)
   • remove                          • Expired (services / help wanted past their date)
   • lost it? "Email me my links"    • Reports ("out of date" from visitors)
                                     • Edit requests (poster changes to approve)
                                     • "Email poster": sends a fresh link to confirm, renew or remove
```

- **No accounts for the public.** Browsing, posting and reporting need no sign-in.
  Spam is limited with a hidden honeypot field and per-IP rate limits.
- **Posters prove a post is theirs with a secret link,** emailed to the post's contact
  address. The link holds a random 256-bit token; the database stores only its hash.
  See [Poster links](docs/architecture.md#poster-links-no-accounts).
- **Admins sign in with Google.** Google checks the password (and 2-Step Verification,
  if it's on), and the site then checks the email is in `ADMIN_EMAILS`.
- **Submitter names stay private.** The form asks for a first and last name for admins
  only. The dashboard warns when a name shows up in a public field, including in
  poster edits.
- **Everything is logged.** Each listing has a history of what admins and the poster did.

## Tech stack

| Part | What | Why |
|---|---|---|
| Pages | Plain HTML, CSS and JavaScript modules | No build step: edit a file, refresh the browser |
| Server | Node.js + [Express](https://expressjs.com/) | Small, well known, JavaScript on both sides |
| Database | MySQL 8 | Any MySQL 8 / MariaDB 10.6+ host works |
| Admin sign-in | Google Identity Services | No passwords to store or reset |
| Email | Any SMTP provider, via `nodemailer` | Sends posters their private links |

Five npm packages: `express`, `mysql2`, `google-auth-library`, `dotenv`, `nodemailer`.

## Quick start (local, with Docker)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env
# In .env set:  NODE_ENV=development   SESSION_SECRET=<any 32+ characters>
#               ADMIN_EMAILS=you@example.com   DEV_ADMIN_LOGIN=true
docker compose up --build
```

- Directory: <http://localhost:3000>
- Manage a post: <http://localhost:3000/manage>
- Admin: <http://localhost:3000/admin/> (with `DEV_ADMIN_LOGIN=true` you can sign in by
  typing an admin email; this test-only shortcut only works when `NODE_ENV=development`)

With `MAIL_HOST` empty, emails aren't sent: they're printed in the server log
(`docker compose logs -f app`), so you can click the "manage your post" links.

Port 3000 already in use? Run `APP_PORT=3100 docker compose up --build`, and set
`PUBLIC_URL=http://localhost:3100` in `.env` so emailed links use that port.

Load fake listings so every admin tab has something in it:

```bash
docker compose exec -T db mysql -udirectory -plocal-dev-password directory < database/sample-data.sql
```

Start over with an empty database: `docker compose down -v`. Do this too if you ran the
older version of this branch: the tables changed, and the schema only loads into an
empty database.

## Quick start (local, without Docker)

Requires Node.js 20+ and a MySQL 8 server.

```bash
npm install
mysql -u root -p -e "CREATE DATABASE directory; CREATE USER 'directory'@'localhost' IDENTIFIED BY 'change-me'; GRANT ALL ON directory.* TO 'directory'@'localhost';"
mysql -u directory -p directory < database/schema.sql
cp .env.example .env   # then edit the values; set NODE_ENV=development for local testing
npm run dev            # restarts automatically when you change a server file
```

## Tests

```bash
npm test
# or, without Node 20+: docker run --rm -v "$PWD":/app -w /app node:22-alpine node --test tests/*.test.js
```

Covers validation (including what posters may and may not change), the name check, the
manage-link tokens, the poster emails, what each JSON shape exposes, session tokens and
rate limiting.

## Configuration

All settings are environment variables (see [`.env.example`](.env.example)).

| Variable | Required | Meaning |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | MySQL connection |
| `SESSION_SECRET` | yes | 32+ random characters used to sign admin cookies. Changing it signs everyone out. |
| `GOOGLE_CLIENT_ID` | for Google sign-in | OAuth client ID ([how to get one](docs/deployment.md#1-create-the-google-sign-in-client)) |
| `ADMIN_EMAILS` | yes | Comma-separated Google emails allowed into `/admin` |
| `PUBLIC_URL` | yes in production | The site's address, e.g. `https://directory.example.org`. Used in emailed links. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | yes in production | SMTP settings for poster emails ([setup](docs/deployment.md#2-set-up-email)) |
| `REVERIFY_AFTER_DAYS` | no (90) | When a live business moves to "Needs reverification" |
| `NODE_ENV` | no | Leave as `production` on the live server. Anything other than `development` is treated as production. |
| `TRUST_PROXY` | no | `true` behind a hosting proxy (Render, Railway, nginx…) |
| `DEV_ADMIN_LOGIN` | no | `true` = email-only admin sign-in for local testing. Only works when `NODE_ENV=development`. |
| `PORT` | no (3000) | Port the server listens on |

Post types, their shelf lives and the categories are in `public/js/post-options.js`.
Both the browser and the server read that one file.

## Project layout

```
server/                     Node.js back end
├── index.js                Starts the server
├── app.js                  Wires middleware + routes + static files
├── config.js               Reads environment variables (only place that does)
├── routes/                 URL → handler. Thin: validate, call a service, respond
│   ├── publicRoutes.js       /api/listings (browse, post, report)
│   ├── manageRoutes.js       /api/manage/* (poster: view, edit, renew, remove, lost link)
│   ├── adminRoutes.js        /api/admin/*  (dashboard + actions)
│   └── authRoutes.js         /api/auth/*   (Google sign-in, sign-out)
├── services/               Business rules
│   ├── directoryService.js   What the public can do
│   ├── posterService.js      What a poster can do with their link
│   ├── posterEmails.js       The emails posters get (welcome, lost link, check-in)
│   ├── moderationService.js  Approve / deny / remove / reverify / edits / check-ins
│   └── dashboardService.js   Read-only data for the admin tabs
├── repositories/           All SQL, one file per table
├── presenters/             Database rows → JSON (decides what's public, poster-only, admin-only)
├── validation/             Form rules and the FieldValidator helper
├── auth/                   Admin session cookie + Google token check
├── middleware/             requireAdmin, rate limits, security headers, errors
├── lib/                    Small helpers (name check, manage tokens, mailer, shelf life…)
└── db/pool.js              MySQL connection pool
public/                     Everything the browser loads (served as-is)
├── index.html              Public directory (filters by type and category)
├── submit.html             "Add a listing" form
├── manage.html             "Manage your post" (from the emailed link)
├── css/styles.css          Shared styles (colors are variables at the top)
├── js/                     Page scripts + shared helpers; post-options.js has the lists
└── admin/                  Admin dashboard (index.html, admin.css, js/)
database/
├── schema.sql              Creates the tables
└── sample-data.sql         Fake data for local testing only
tests/                      `npm test`
docs/                       Longer guides (below)
```

## More documentation

- [docs/admin-guide.md](docs/admin-guide.md): reviewing posts, edit requests, reverifying, reports
- [docs/architecture.md](docs/architecture.md): how the code fits together, the data model and security
- [docs/api.md](docs/api.md): every API endpoint
- [docs/deployment.md](docs/deployment.md): Google sign-in, email, and putting the site online
- [docs/logo.md](docs/logo.md): how the logo is built and how to swap the crucifix picture
