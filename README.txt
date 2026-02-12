# JobsDrops (Static Site)

This is a multi-page, mobile-first static website.

## Quick edit workflow (no coding)
- To add new listings: open `data/listings.html`
- Copy one `<article class="card"> ... </article>`
- Paste it under the others, edit text + link.
- Re-upload the folder to Cloudflare Pages.

## Cloudflare Pages re-upload (no Git)
1. Cloudflare Dashboard → Workers & Pages → Pages → your project (jobsdrops)
2. Go to **Deployments**
3. Click **Upload assets** / **Create new deployment** (wording may vary)
4. Drag & drop the ENTIRE folder contents (keep the same structure)

Tip: always upload the *contents* of the site folder (index.html at the top level), not a parent folder.

## Files
- `index.html` home
- `weekly.html` weekly drops
- `students.html` students hub
- `graduates.html` grads hub
- `learnerships.html` learnerships hub
- `bursaries.html` bursaries hub
- `jobs.html` jobs hub
- `learn.html` learning hub
- `cv.html` CV builder
- `about.html`, `contact.html`, `privacy.html`, `terms.html`
- `assets/css/styles.css`, `assets/js/app.js`

## AdSense
- Put your AdSense script in the `<head>` of each page (or use a Pages build step later).
- Replace `ads.txt` with the exact line AdSense gives you.
