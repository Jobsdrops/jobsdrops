JobsDrops Website (Static)

Editing listings
- Open: data/listings.html
- Each listing is one <article class="card"> block.
- Update: title, summary, location, closing date, and Pay.
- Pay format: "Pay: Rxxxx/month" or "Pay: Stipend: Rxxxx/month". If unknown use "Pay: Unspecified".
- After edits: re-upload the site to Cloudflare Pages.

Making pages different
- The template currently includes sample listings across the site.
- Replace or remove cards on each page by editing data/listings.html and/or the page itself.
- Suggested approach: keep data/listings.html as your main list, and use the Type filter attributes to control what appears.

CV Builder
- Open cv.html
- Users fill fields and click "Generate PDF".
- PDF includes bottom-right branding: Powered by JOBSDROPS + Opportunities, simplified.
- Works on modern browsers (Chrome, Edge, Firefox). Needs internet for the jsPDF library (CDN).

Contact
- Email: jobsdropsofficial@gmail.com (mailto link). Opens the user's email app.

AdSense
- Replace ads.txt with the exact line AdSense provides.
- Replace "Coming soon" blocks with your AdSense ad code after approval.

Cloudflare Pages re-upload
- Cloudflare Dashboard -> Workers & Pages -> Pages -> your project
- Deployments -> Upload new deployment
- Upload the site contents so index.html is at the top level (not inside another folder).


CV Builder update
- The CV Builder now supports: Add qualification, Add experience, optional Projects and Certificates (collapsible).
- PDF generation runs in-browser using jsPDF from a CDN; the first load needs internet access.

PDF download
- Generate PDF triggers a file download on most devices. If a phone blocks downloads, it opens the PDF in a new tab for saving/sharing.

Renumbering
- Education and Experience sections auto-renumber after removing items, so numbering always stays 1, 2, 3...

Read more modal
- Edit data/listings.html. Each listing now contains hidden detail blocks:
  - data-detail="summary"
  - data-detail="description" (write 200+ original words)
  - data-detail="requirements" (list items)
  - data-detail="how"
- The blue “Read more” button opens a modal with blur + animation. Apply button uses the listing’s Apply link.
