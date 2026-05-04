# NSBretreat — Handoff

Last updated: 2026-05-04

## Where We Left Off
Working on multi-language support (EN/ES/PT/FR/DE/IT) for both the main site and house manual. Not yet implemented — was about to start when user paused to check project structure.

## Immediate Next Steps
1. **Move FAQ to main site** — user asked to move FAQ section from guide/index.html to index.html. Also add FAQ to main site nav.
2. **Fix FAQ content:**
   - Pets: allowed, but $395 pet fee required; guests responsible for pet damages
   - Remove the line about "Additional guests beyond booked count require prior approval"
   - Pool heating: available for $40/day
   - Cancellation: set by hosts (not the platform), but we follow the policy set on the platform
3. **Multi-language support** — globe icon in nav, dropdown for EN/ES/PT(BR)/FR/DE/IT, JS-based i18n using data-i18n attributes, translations bundled in JS file
4. Commit and push

## Key Context
- Static site, no build step — edit HTML/CSS/JS directly
- Vercel auto-deploys from GitHub main branch
- Guide tabs are anchor-based (href="#section"), not separate pages
- All JS is vanilla, no frameworks
