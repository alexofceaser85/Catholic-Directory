# Deployment

Getting the directory online takes four steps: create a Google sign-in client, set up
email, pick a host, and set the environment variables.

## 1. Create the Google sign-in client

Admins sign in with Google. Google needs to know which website is allowed to use the
sign-in button. This takes about 10 minutes and is free.

1. Go to <https://console.cloud.google.com/> and sign in with the Google account that
   will own the directory.
2. Create a project (top bar → project picker → **New project**), e.g. "Local Catholic Bulletin".
3. **APIs & Services → OAuth consent screen** (may be shown as **Google Auth Platform → Branding**):
   - User type: **External**
   - App name: *Local Catholic Bulletin*, plus a support email and developer email
   - No scopes need to be added. The button only asks for name and email.
   - Publish the app (**Audience → Publish app**), or add each admin as a *test user*.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add every address the site is opened from, e.g.
     - `http://localhost:3000` and `http://localhost` (local testing)
     - `https://directory.example.org` (live site)
   - Redirect URIs: leave empty, because the button uses a pop-up.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID`.

Google also shows a **Client secret**. This app doesn't use it, because the sign-in
button never needs one. Don't put it in `.env`, and don't paste it anywhere. If it
leaks, delete it in the client's settings and Google will issue a new one.

The client ID is not a secret. It's visible in the page. Security comes from the server
checking that tokens were issued for this ID and that the email is in `ADMIN_EMAILS`.

## 2. Set up email

Posters get their private "manage your post" link by email, so the live site needs a way
to send mail. There are three ways: **Resend** (from your own domain), the **Gmail API**
(from a Gmail account) or **SMTP** (simpler, but some hosts block it). Resend and the Gmail API
work everywhere. If more than one is set, Resend wins, then the Gmail API, then SMTP.

### Option A: Resend (use this on Railway)

Railway blocks outgoing SMTP on its Free, Trial and Hobby plans. Resend sends over normal HTTPS
from an address on the site's own domain (e.g. `hello@localcatholicbulletin.com`). The free tier
covers 3,000 emails a month, far more than the directory sends.

1. Sign up at <https://resend.com/> → **Domains → Add domain** → enter the site's domain.
2. Add the DNS records it lists (DKIM on `resend._domainkey`, plus an MX and SPF record on
   `send`). With Cloudflare, the **Auto configure** button adds them for you. Wait until the
   domain shows **Verified**.
3. **API Keys → Create API key**, permission **Sending access**, limited to that domain.
4. Put it into Railway without it appearing on screen:

   ```bash
   read -rsp "Resend API key: " KEY; echo
   railway variables --service Catholic-Directory --set "RESEND_API_KEY=$KEY"; unset KEY
   ```

5. Set `MAIL_FROM` to an address on that domain, e.g.
   `Local Catholic Bulletin <hello@localcatholicbulletin.com>`. Resend refuses any other domain.

On startup the log says "Sending email with Resend". To cut it off, delete the key in Resend.
Replies go to the domain's mail, so set up forwarding (e.g. Cloudflare **Email Routing**) if
you want to read them.

### Option B: Gmail API

Sends over HTTPS through Gmail's API, so it also works on Railway. It's free and needs no
domain. Use a Gmail account made just for the directory (not anyone's personal or chapter
account). About 15 minutes, all signed in as that account:

1. <https://console.cloud.google.com/> → create a project, e.g. "Directory mail".
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **OAuth consent screen** (or **Google Auth Platform → Branding**): User type **External**,
   app name e.g. *Local Catholic Bulletin mail*, the directory Gmail as both emails.
   Then **Audience → Publish app** so it's **In production**. In "Testing", Google expires
   the token after 7 days and email silently stops. Google will call the app "unverified":
   that's fine, since the only account that ever uses it is the directory's own.
4. **Credentials → Create credentials → OAuth client ID** → Application type **Desktop app**.
   Keep the page open with the **Client ID** and **Client secret**.
5. On your computer, in this folder, run the authorize script. It prints a link, you allow
   "Send email on your behalf" in the browser, and the token goes straight into Railway
   without being shown:

   ```bash
   read -rp "Client ID: " GMAIL_CLIENT_ID; read -rsp "Client secret: " GMAIL_CLIENT_SECRET; echo
   export GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET
   TOKEN=$(node tools/gmail-authorize.js) && railway variables --service Catholic-Directory \
     --set "GMAIL_CLIENT_ID=$GMAIL_CLIENT_ID" \
     --set "GMAIL_CLIENT_SECRET=$GMAIL_CLIENT_SECRET" \
     --set "GMAIL_REFRESH_TOKEN=$TOKEN"
   unset TOKEN GMAIL_CLIENT_SECRET
   ```

   Google's warning page ("Google hasn't verified this app"): click **Advanced → Go to …**.
   The script prints `Authorized: <address>`. Check it's the directory account.
6. Set `MAIL_FROM` to that same address, e.g. `Local Catholic Bulletin <directory@gmail.com>`.
   Gmail replaces any other From address with the account's own.

The app can only **send**: the token can't read, search or delete the account's mail. To cut
it off, remove the app at <https://myaccount.google.com/permissions> (signed in as the
directory account) and delete `GMAIL_REFRESH_TOKEN`. On startup the log says
"Sending email with the Gmail API" when it's set up.

### Option C: SMTP

Any SMTP service works on hosts that allow it (a VPS, cPanel, Railway Pro). Put its settings in `MAIL_*`:

| Option | Cost | Notes |
|---|---|---|
| **Brevo**, **Mailjet**, **SMTP2GO** | Free tiers of a few hundred emails a day | Easiest. Sign up, verify the sending address or domain, copy the SMTP host, user and password. |
| **Gmail** | Free, ~500 emails a day | Use a dedicated account, turn on 2-Step Verification, create an **App password** (Google Account → Security → App passwords), then `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USER=` the address, `MAIL_PASSWORD=` the app password. |
| **Postmark**, **Mailgun**, **Amazon SES** | Paid / pay as you go | Best delivery if you have your own domain. |

```env
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USER=you@example.org
MAIL_PASSWORD=the-smtp-key
MAIL_FROM=Local Catholic Bulletin <directory@example.org>
PUBLIC_URL=https://directory.example.org
```

`MAIL_FROM` should use an address or domain the provider has verified, or mail may land
in spam.

### Either way

`PUBLIC_URL` must be the real address, since it goes into every emailed link. Emails are sent
in the background, so a slow or unreachable mail service never holds up a poster.

To test: submit a post with your own email, or use **Manage your post → Email me my links**.
If nothing arrives, check the server log for "Could not send email".

## 3. Choose where to host it

The app is one Node.js process plus a MySQL database. Any of these work. Pick the one
you're most comfortable maintaining.

### Option A: Railway or Render (easiest, roughly $5–10/month)

These platforms run the app from a GitHub repo and handle HTTPS for you.

1. Push this folder to a **private** GitHub repository.
2. Create a new project from the repo. The platform detects Node.js and runs `npm start`.
3. Add a MySQL database (Railway has one built in. With Render, use an external MySQL
   such as Aiven's free tier or a Railway database).
4. Run `database/schema.sql` once against the new database using any MySQL client
   (MySQL Workbench, TablePlus, or the `mysql` command line).
5. Set the environment variables from the [checklist](#4-production-checklist).
6. Add your custom domain in the platform's settings, then add it to the Google
   client's **Authorized JavaScript origins**.

### Option B: A small Linux server (VPS) with Docker

Good if someone on the team is comfortable with SSH. About $5–6/month on DigitalOcean,
Linode or Lightsail.

```bash
# On the server, after installing Docker:
git clone <your private repo> directory && cd directory
cp .env.example .env && nano .env     # fill in the production values
# Edit docker-compose.yml and replace the two local-dev passwords with strong ones
NODE_ENV=production docker compose up -d --build
```

Put [Caddy](https://caddyserver.com/) in front for automatic HTTPS:

```
# /etc/caddy/Caddyfile
directory.example.org {
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

## 4. Production checklist

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
| `PUBLIC_URL` | The live `https://` address, no trailing slash |
| `GMAIL_*` or `MAIL_*`, plus `MAIL_FROM` | From [step 2](#2-set-up-email). Without them, posters never get their links. |

The site **must** use HTTPS in production. With `NODE_ENV=production` the admin cookie
is only sent over HTTPS, so sign-in won't stick on plain HTTP.

Never load `database/sample-data.sql` into the production database.

**Upgrading an existing database:** run each file in `database/migrations/` that's newer than the
database, oldest first, once: `2026-10-15-photos.sql` (photo uploads), `2026-10-17-parish.sql`
(parish field) and `2026-10-17-duration.sql` (poster-chosen post length). New databases get everything from `schema.sql`.

## 5. Backups

Everything worth keeping is in MySQL, including uploaded photos. Back it up at least weekly:

```bash
mysqldump -h <host> -u <user> -p --single-transaction directory > directory-$(date +%F).sql
```

Railway and most managed MySQL hosts also have automatic backups. Turn them on.

Restore: `mysql -h <host> -u <user> -p directory < directory-YYYY-MM-DD.sql`

## 6. Adding or removing an admin

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
| Posters say they never got their link | Check the log for "Could not send email" or "no mail settings". `invalid_grant` means the Gmail token was revoked or expired: rerun `tools/gmail-authorize.js`. `Connection timeout` with SMTP means the host blocks it: use Resend or the Gmail API. `Resend refused the email (403)` usually means `MAIL_FROM` isn't on the verified domain. Check `MAIL_FROM` is verified with your provider. Ask them to check spam, or use **Email poster**. |
| Links in emails point to localhost | Set `PUBLIC_URL` to the live address and restart. |
