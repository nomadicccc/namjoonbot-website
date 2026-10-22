# Catalogue and Discord account setup

The pages are `catalogue.html` (public) and `account.html` (Discord sign-in). The catalogue and account endpoints are served by the existing bot API. No database migration is required.

## Update the bot

If running a separate bot copy, copy these two workspace files into it:
- `photocard_bot/cogs/web_stats.py`
- `photocard_bot/services/web_accounts.py` (new)

## Configure Discord login

1. Open the application's OAuth2 settings:
   https://discord.com/developers/applications/1540789930329120908/oauth2
2. Under Redirects, add and save this exact URI:
   `https://nomadicccc.github.io/namjoonbot-website/account.html`
3. Copy the OAuth2 Client Secret into your bot's private local `.env`:

```dotenv
DISCORD_OAUTH_CLIENT_ID=1540789930329120908
DISCORD_OAUTH_CLIENT_SECRET=YOUR_OAUTH_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URI=https://nomadicccc.github.io/namjoonbot-website/account.html
```

This client secret is NOT the bot token. Never commit it, paste it in chat, or put it in website files. Keep the existing WEB_STATS settings and restart your bot. Login remains disabled until a secret is configured.

The current workspace has the non-secret defaults and an empty secret entry added only where missing. Fill that entry rather than adding duplicates.

## Website API address

Edit only `site-config.js` if your tunnel changes. All pages share its `apiBase`.

The redirect URI stays on GitHub Pages; restarting a temporary tunnel does not require a new Discord callback registration. Bot restarts invalidate all sessions.

## What users can do

- Catalogue: search and filter designs; inspect rarities and total historical prints.
- Profile: view their equipped banner, avatar, titles, badges, XP, balances and statistics.
- Inventory: browse owned active copies, filter/sort/page through them, and inspect print numbers, codes and variant details.

Browsing is read-only. Opening packs, trading, purchasing and customising remain in Discord. Secret catalogue artwork appears after first discovery. Private images require a session.

## Verify

Once the bot is restarted, `/api/auth/status` should return `{"configured":true}`.
Open the catalogue, then My collection and complete Discord sign-in. Compare your profile and inventory with the bot. Sign out and confirm private account access ends.

The session is tab-scoped in sessionStorage, expires after six hours, and is invalidated by sign-out or bot restart. Only the identify scope is requested. No Discord access/refresh tokens are retained after identity verification.

Unit tests cover one-time browser-bound state, session expiry/revocation, ownership filtering, CORS and hidden Secret art. Actual OAuth and live browser testing still require owner configuration. Full local details are in `docs/website-accounts.md` in the bot project.
