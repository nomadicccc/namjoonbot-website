# Connect live statistics

The website's Live Stats section supports a public read-only API served by the running bot. It currently shows a disconnected message until an API address is configured.

## Website settings

All pages now use `site-config.js`. Set `window.NAMJOON_SITE.apiBase` to the public API base address, without `/api/stats`. The homepage, catalogue and account pages share it. Never add a bot token, database string or OAuth client secret to website files.

The homepage uses polling by default; its `statsTransport` setting remains in `index.html`. Quick Tunnels require polling. A streaming-capable permanent connection can use `sse`.

For Discord login configuration, see `ACCOUNT-SETUP.md`.

## Bot setup

The local bot project now includes `photocard_bot/cogs/web_stats.py`. Add these to the bot's existing `.env` and restart:

```dotenv
WEB_STATS_ENABLED=true
WEB_STATS_HOST=127.0.0.1
WEB_STATS_PORT=8080
WEB_STATS_ORIGIN=https://nomadicccc.github.io
```

Check `http://127.0.0.1:8080/api/stats` locally first, then expose that local service through an HTTPS tunnel. Keep the bot, database and tunnel running.

The shared feed refreshes approximately once a second while requested, not once per visitor. It reuses Discord's global leaderboard calculations and Halloween community progress. First-version categories: total earned coins, packs opened, unique collected variants, mythicals, longest daily streak, cards gifted and cards traded. Names come from the Discord cache; uncached players appear as Collector. No raw user IDs are included.

Events come from the bot's event catalogue. Challenge progress is earned Candy, not remaining balances. The website shows the feed's actual timestamp and labels delayed results. It pauses requests in hidden tabs and reconnects on return.

The full local setup guide is `docs/website-live-stats.md` in the bot project. The connection is not yet configured or tested end-to-end with the running production bot.
