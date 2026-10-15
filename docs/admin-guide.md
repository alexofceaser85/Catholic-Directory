# Admin guide

For admins who review posts. No technical knowledge needed.

## Signing in

Go to **/admin/** on the directory site and click **Sign in with Google**. Use the
Google account the site maintainer added to the admin list. If you see "is not on the
admin list", ask them to add your email to `ADMIN_EMAILS`.

**Please turn on 2-Step Verification for that Google account** (Google Account →
Security → 2-Step Verification). The directory relies on Google to check that it's
really you, so a strong Google account keeps the directory safe too.

## Post types and shelf life

| Post type | What it is | How long it stays up |
|---|---|---|
| **Business** | A farm, shop or small business | Stays up. After 90 days it lands in **Needs reverification**. |
| **Offering services** | Someone with a skill or trade looking for work | **60 days** from approval, then it's hidden automatically |
| **Help wanted** | Someone who needs a hand: farm help, a tradesperson, a tutor | **30 days** from approval, then it's hidden automatically |

Approving a post starts its clock. Posters can renew their own posts from their private
link. You can renew one too (**Renew** button), which restarts the full period from today.

## The tabs

| Tab | What's in it | What to do |
|---|---|---|
| **Pending review** | New posts | Approve, deny, or edit then approve |
| **Edit requests** | Posters asked to change their live post | Approve or reject the changes |
| **Needs reverification** | Live businesses not confirmed in 90+ days | **Email poster**, or contact them and **Mark reverified** |
| **Expired** | Services / help-wanted posts past their date (already hidden) | Nothing needed. **Renew** if the poster asks, or **Remove** to tidy up. |
| **Reports** | Live posts a visitor flagged as out of date | Email the poster, then reverify, edit, remove or dismiss |
| **Live** | Everything on the public directory right now | Edit or remove when needed |
| **Denied** | Posts that were turned down | Can still be approved later |
| **Removed** | Posts taken down by an admin or by the poster | Can be restored |

Yellow numbers on a tab mean something is waiting for you.

## Reviewing a new post

Each card shows:

- **Post type and category** above the title. Fix them with **Edit** if they don't fit
  (for example a one-off job posted as a Business).
- **Private box**: who submitted it. Never shown publicly.
- **⚠ Name warning**: the submitter's first or last name appears in a public field.
  It's a helper, so still read the post.
- **The public details**, exactly as visitors will see them.

Then choose:

- **Edit** to fix typos or remove personal names. Use **Admin notes** for private notes
  ("called 3/4, left a voicemail"). Notes are never shown publicly or to the poster.
- **Approve** to publish it right away and start its shelf life.
- **Deny** to keep it off the directory. You can approve it later from the Denied tab.

Every action asks for an optional note, which is saved in the card's **History**.

## Edit requests

When someone edits a post that's already live, the change waits for you. The live post
keeps showing the old version meanwhile. (Edits to a post still waiting for review go
straight in; you'll see the new version when you review it.)

The card shows each changed field as **Now** (crossed out) and **Requested** (green).
Check for personal names, then **Approve changes** or **Reject changes**. If the poster
sends another edit before you get to it, the newer one replaces the older one.

## Reverifying a business (every 90 days)

1. Open **Needs reverification**.
2. Click **✉ Email poster**. The site emails the business a private link where they can
   confirm the listing is still right, edit it, or remove it. Whatever they do shows up
   in the card's History, and confirming takes the listing off this tab by itself.
3. Or contact them yourself (phone, your own email) and then:
   - **Details are correct** → **Mark reverified**. The counter resets to 0 days.
   - **Something changed** → **Edit**, then **Mark reverified**.
   - **Closed, or no reply after a reasonable time** → **Remove**.

## Handling a report

1. Open **Reports**. The red box shows what visitors said.
2. **✉ Email poster**, or contact them yourself.
3. Then:
   - **Mark reverified** / **Renew** if it's still accurate (closes all reports on that post).
   - **Edit** if something changed, then reverify.
   - **Remove** if it's no longer valid (also closes the reports). For a filled job, remove it.
   - **Dismiss** next to a single report if that report is simply wrong. The post
     stays live and its clock is not reset.

## When a poster loses their link

They can go to **/manage**, type the post's contact email, and get fresh links. You
don't need to do anything. (**Email poster** also sends one.) A new link replaces the
old one, so the old link stops working.

## Good to know

- If two admins act on the same post at once, the second gets a message to refresh.
- Removing isn't permanent. Use **Restore & approve** from the Removed tab.
- The **History** link at the bottom of each card shows every action and who did it;
  "the poster" means the person who posted it, using their private link.
