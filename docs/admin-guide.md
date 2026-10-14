# Admin guide

For chapter admins who review listings. No technical knowledge needed.

## Signing in

Go to **/admin/** on the directory site and click **Sign in with Google**. Use the
Google account the site maintainer added to the admin list. If you see "is not on the
admin list", ask them to add your email to `ADMIN_EMAILS`.

**Please turn on 2-Step Verification for that Google account** (Google Account →
Security → 2-Step Verification). The directory relies on Google to check that it's
really you, so a strong Google account keeps the directory safe too.

## The tabs

| Tab | What's in it | What to do |
|---|---|---|
| **Pending review** | New requests from the public form | Approve, deny, or edit then approve |
| **Needs reverification** | Live listings not confirmed in 90+ days | Contact the business, then reverify, edit or remove |
| **Reports** | Live listings a visitor flagged as out of date | Contact the business, then reverify, edit, remove or dismiss |
| **Live** | Everything on the public directory right now | Edit or remove when needed |
| **Denied** | Requests that were turned down | Can still be approved later |
| **Removed** | Listings taken down after being live | Can be restored |

Yellow numbers on a tab mean something is waiting for you.

## Reviewing a new request

Each card shows:

- **Private box**: who submitted it. Never shown publicly.
- **⚠ Name warning**: the submitter's first or last name appears in a public field,
  such as the business name, email or description. This is the same check as the
  "Name check" column in the Google Sheet. It's a helper, so still read the listing.
- **The public details**, exactly as visitors will see them.

Then choose:

- **Edit** to fix typos or remove personal names. Use **Admin notes** for private notes
  ("called 3/4, left a voicemail"). Notes are never shown publicly.
- **Approve** to publish it right away. Its verification counter starts at 0 days.
- **Deny** to keep it off the directory. You can approve it later from the Denied tab.

Every action asks for an optional note, which is saved in the card's **History**.

## Reverifying a listing (every 90 days)

1. Open **Needs reverification**.
2. Click **✉ Email business**. Your email app opens with a ready-to-send message
   listing the business's current details. You can also call the public phone number.
3. When they reply:
   - **Details are correct** → **Mark reverified**. The counter resets to 0 days.
   - **Something changed** → **Edit**, then **Mark reverified**.
   - **Closed / no longer wants to be listed / no reply after a reasonable time** → **Remove**.

## Handling a report

1. Open **Reports**. The red box shows what visitors said.
2. Contact the business the same way as above.
3. Then:
   - **Mark reverified** if it's still accurate (closes all reports on that listing).
   - **Edit** if something changed, then **Mark reverified**.
   - **Remove** if it's no longer valid (also closes the reports).
   - **Dismiss** next to a single report if that report is simply wrong. The listing
     stays live and its counter is not reset.

## Good to know

- If two admins act on the same listing at once, the second gets a message to refresh.
- Removing isn't permanent. Use **Restore & approve** from the Removed tab.
- The **History** link at the bottom of each card shows every action and who did it.
