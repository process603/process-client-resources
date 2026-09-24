# Process Client Resource Hub

Mobile-first client resource site for The Process Recovery Center. The site has no forms, analytics, cookies, or client-data storage.

## Staff source

Staff maintain the work-owned **Process Client Resource Hub TPRC** Google Sheet.

- **Start here** explains the editing workflow and privacy rule.
- **Resources** has one labeled block per category, with 70 open rows for Housing & Sober Living and Treatment Programs, and 50 in other blocks. Category and audience are prefilled; staff add a resource name and public details, then check Active. The block also has public map type, address, latitude, and longitude fields. Leave location blank for directory-only links or private housing addresses.
- **Categories** defines the site topics. Staff can activate another category, and the live feed will include it without a site rebuild.
- **Updates & Review** lists active rows with missing links or overdue verification dates. It also has a manual change log.
- **Archive V1** and **Resources backup 2026-09-24** preserve earlier tables and are hidden.

## Resource map

`map.html` is a separate mobile-friendly page. It filters active, geocoded resources by Programs, Sober Living, Medication, Respite, or Other, and shows a matching list with directions, website, and phone links. A pin needs a public provider address, map type, latitude, and longitude. The map never requests a visitor's location. Leaflet uses OpenStreetMap tiles with visible attribution; the list remains usable if map tiles cannot load. The saved preview begins with The Process Recovery Center location, verified from its official contact page on September 24, 2026.

The Rise Above respondent form link was supplied by Kevin and checked on September 23, 2026. The page shows a staff-help message for missing links and a review badge when verification is missing or older than 180 days. The six NH court PDFs, duplicate DMV form, and BFA 800 remain marked for a staff browser check because automated access to these government PDFs returned 403; their titles came from official government listings.

## Public data feed

`apps-script/Code.gs` is ready to bind to the Sheet. It returns only active, approved resources as JSON or JSONP. `Staff Notes` is never returned. The deployed public feed is configured in `src/config.js`. Anyone with the endpoint can read its public resource fields. Never enter client information in the Sheet. Once the feed is connected, the site checks it at each visit and while a tab stays open.

To replace the feed, open the Sheet's **Extensions → Apps Script**, paste `Code.gs`, and deploy a web app that executes as the owner and allows anyone to access it. Put the resulting `/exec` URL into `src/config.js`, run `npm run build`, and republish. The page loads `resources.json` as a usable fallback if the feed is unavailable.

## GitHub Pages

Run `npm test` and `npm run build`. The build refreshes `dist/` and `docs/`. The static files in `dist/` use relative paths and work in a GitHub Pages project repository, such as `process603.github.io/process-client-resources/`. Configure Pages to deploy from `main` and `/docs`. Public publication was approved by the project owner.

The owner-only Sites page is a temporary review preview. GitHub Pages is the intended final home. The site uses the supplied Process and King logo assets and the navy and bright blue palette from the Process staff card page.
