# Website guide

## Publish with GitHub Pages

Open repository **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then **main** and **/ (root)**. Click **Save**. Once GitHub completes deployment, your website should be available at https://nomadicccc.github.io/namjoonbot-website/.

## Edit your site

Open `index.html` on GitHub, click the pencil icon, edit, and commit. Once Pages is configured, commits to main republish the site.

- Find `UPDATE POST` to edit the news article. Change its title, body, visible date and datetime attribute. The first entry is a website announcement; update its date to the actual launch date before publishing.
- Edit CSS variables in `:root` to change the colours.
- Edit `siteSettings` at the bottom to change invite links. Also update the matching HTML links, which serve as fallbacks when JavaScript is disabled.
- The purple NJ card is decorative artwork, not a real card preview.

## Optional Discord embed

The server invite card and join button already work. To add Discord's official live widget, enable Server Widget in your Discord server settings and choose its invite channel. Copy the server ID and put it inside the empty quotes for `discordServerId` in `siteSettings`. The embed appears below the join button. Keep the button as a fallback.

## Verification

JavaScript syntax and internal section links were checked. Desktop/mobile CSS layouts are included; visual browser testing is still needed.

The website is static and has no build dependencies. Google Fonts is optional and has system font fallbacks. Keep private bot files and tokens out of this public repository.
