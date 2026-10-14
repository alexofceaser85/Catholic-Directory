# Deployment

Getting the directory online takes three steps: create a Google sign-in client, pick a
host, and set the environment variables.

## 1. Create the Google sign-in client

Admins sign in with Google. Google needs to know which website is allowed to use the
sign-in button. This takes about 10 minutes and is free.

1. Go to <https://console.cloud.google.com/> and sign in. Use the chapter's Google
   account (for example the atlantagaclm account) so it isn't tied to one person.
2. Create a project (top bar → project picker → **New project**), e.g. "CLM Directory".
3. **APIs & Services → OAuth consent screen** (may be shown as **Google Auth Platform → Branding**):
   - User type: **External**
   - App name: *CLM Business Directory*, plus a support email and developer email
   - No scopes need to be added. The button only asks for name and email.
   - Publish the app (**Audience → Publish app**), or add each admin as a *test user*.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add every address the site is opened from, e.g.
     - `http://localhost:3000` and `http://localhost` (local testing)
     - `https://directory.yourchapter.org` (live site)
   - Redirect URIs: leave empty, because the button uses a pop-up.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID`.

Google also shows a **Client secret**. This app doesn't use it, because the sign-in
button never needs one. Don't put it in `.env`, and don't paste it anywhere. If it
leaks, delete it in the client's settings and Google will issue a new one.

The client ID is not a secret. It's visible in the page. Security comes from the server
checking that tokens were issued for this ID and that the email is in `ADMIN_EMAILS`.

## 2. Choose where to host it

The app is one Node.js process plus a MySQL database. Any of these work. Pick the one
your chapter is most comfortable maintaining.

### Option A: Railway or Render (easiest, roughly $5–10/month)

These platforms run the app from a GitHub repo and handle HTTPS for you.

1. Push this folder to a **private** GitHub repository.
2. Create a new project from the repo. The platform detects Node.js and runs `npm start`.
3. Add a MySQL database (Railway has one built in. With Render, use an external MySQL
   such as Aiven's free tier or a Railway database).
4. Run `database/schema.sql` once against the new database using any MySQL client
   (MySQL Workbench, TablePlus, or the `mysql` command line).
5. Set the environment variables from the [checklist](#3-production-checklist).
6. Add your custom domain in the platform's settings, then add it to the Google
   client's **Authorized JavaScript origins**.

### Option B: A small Linux server (VPS) with Docker

Good if someone in the chapter is comfortable with SSH. About $5–6/month on DigitalOcean,
Linode or Lightsail.

```bash
# On the server, after installing Docker:
git clone <your private repo> clm-directory && cd clm-directory
cp .env.example .env && nano .env     # fill in the production values
# Edit docker-compose.yml and replace the two local-dev passwords with strong ones
NODE_ENV=production docker compose up -d --build
```

Put [Caddy](https://caddyserver.com/) in front for automatic HTTPS:

```
# /etc/caddy/Caddyfile
directory.yourchapter.org {
    reverse_proxy localhost:3000
}
```

Set `TRUST_PROXY=true` in `.env` so rate limits see visitors' real IP addresses.

Update to a new version: `git pull && NODE_ENV=production docker compose up -d --build`.

### Option C: Shared web hosting with cPanel

Many cheap hosts (Namecheap, A2 Hosting and others) offer **Setup Node.js App** and
**MySQL Databases** in cPanel.

1. Create a MySQL database and user in cPanel, then import `database/schema.sql` with phpMyAdmin.
2. Upload the project (everything except `node_modules` and `.env`).
3. In **Setup Node.js App**: Node 20+, startup file `server/index.js`, then add the
   environment variables and click **Run NPM Install**.
4. Turn on HTTPS for the domain (cPanel → SSL/TLS Status → AutoSSL).

## 3. Production checklist

| Setting | Value |
|---|---|
| `NODE_ENV` | `production`. HTTPS-only cookies, and the email-only test sign-in can't be turned on. Anything other than `development` counts as production. |
| `SESSION_SECRET` | A new random value: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | From step 1 |
| `ADMIN_EMAILS` | Real admin Google emails, comma-separated |
| `DEV_ADMIN_LOGIN` | `false` (or leave it out). It's ignored in production anyway. |
| Admin Google accounts | Turn on **2-Step Verification** for every account in `ADMIN_EMAILS` (myaccount.google.com → Security). |
| `TRUST_PROXY` | `true` on Railway, Render, cPanel or behind Caddy/nginx |
| `DB_*` | Your production database. Give the MySQL user access to this one database only. |

The site **must** use HTTPS in production. With `NODE_ENV=production` the admin cookie
is only sent over HTTPS, so sign-in won't stick on plain HTTP.

Never load `database/sample-data.sql` into the production database.

## 4. Backups

Everything worth keeping is in MySQL. Back it up at least weekly:

```bash
mysqldump -h <host> -u <user> -p --single-transaction clm_directory > clm-directory-$(date +%F).sql
```

Railway and most managed MySQL hosts also have automatic backups. Turn them on.

Restore: `mysql -h <host> -u <user> -p clm_directory < clm-directory-YYYY-MM-DD.sql`

## 5. Adding or removing an admin

Edit `ADMIN_EMAILS` and restart the app. Removing an email locks that person out on
their next click, even if they're signed in.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Google button doesn't appear, or "origin is not allowed" | Add the exact address (scheme + domain + port) to **Authorized JavaScript origins**. Changes can take a few minutes. |
| "is not on the admin list" | Add the email to `ADMIN_EMAILS` (any letter case) and restart. |
| Signed in but immediately signed out again | The site isn't on HTTPS while `NODE_ENV=production`. |
| "Missing required environment variable" on start | Compare `.env` with `.env.example`. |
| Every visitor seems to share one rate limit | Set `TRUST_PROXY=true`. |
