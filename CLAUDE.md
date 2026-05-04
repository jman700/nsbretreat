# NSBretreat — Project Context

## What This Is
Static website for **The New Smyrna Beach Retreat** — a short-term vacation rental at 815 Carol Ave, New Smyrna Beach, FL 32169. Owned and operated by Antonio & Yani (brothers).

## Live URLs
- **Main site:** https://nsbretreat.com
- **House manual:** https://nsbretreat.com/guide/
- **Admin inbox:** https://nsbretreat.com/admin.html
- **GitHub:** https://github.com/jman700/nsbretreat.git

## SESSION START
Read `.claude/memory/project-state.md` and `HANDOFF.md` before doing anything.

## Stack
- Pure static HTML + vanilla JS + CSS — no framework, no build step
- Hosted on Vercel (auto-deploy from GitHub `main` branch)
- **Supabase** for guest feedback form (`guest_feedback` table) and admin login
- Supabase project ref: `xittuxwilxmzzawjdivd`
- Supabase anon key: `sb_publishable_AxzdizEiC3FOPYdzS3lPWA_H1aH9hSV`

## Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main public website |
| `guide/index.html` | House manual (for guests) |
| `admin.html` | Admin feedback inbox (Supabase Auth login) |
| `css/styles.css` | Shared styles for main site |
| `css/manual.css` | Styles for house manual |
| `js/main.js` | Gallery carousel, nav, lightbox, reviews carousel |
| `js/config.js` | CONFIG object: Airbnb URL, WiFi, quick info |
| `js/calendar.js` | iCal availability calendar |
| `guide/js/manual.js` | Manual-specific JS (tabs, accordion, copy, etc.) |
| `guide/js/chatbot.js` | Floating chat widget with FAQ responses |
| `assets/photos/` | All property photos (pool-1..10, interior-1..50, etc.) |
| `supabase/migrations/` | SQL migration files |

## Design System
- Fonts: Cormorant Garamond (headings) + Inter (body)
- Colors: `--blush: #f9ece8`, `--sand: #e8ddd0`, `--tan: #d4c4b0`, `--accent: #b8967e`, `--charcoal: #2d2926`
- Card-based, mobile-first, no dark mode

## Supabase Tables
- `guest_feedback` — id, created_at, guest_name (text), message (text)
  - RLS: anon INSERT only; authenticated (admin) full access
- Admin logins: antoniofconcha@gmail.com, jman700@gmail.com

## Workflow
- All changes → commit → push → Vercel auto-deploys
- No build step needed — edit files directly

## Airbnb Listing
https://www.airbnb.com/rooms/925287223019649070

## Property Details
- 5 bedrooms, 4 bathrooms, sleeps 16, 2,600 sq ft
- 3 min walk to beach, 7 min walk to Flagler Ave
- Amenities: private pool, hot tub, covered pergola, outdoor kitchen, outdoor bar, putting green, hammock, game room (air hockey + arcade), massage chair, Margaritaville maker, beach bikes, beach gear, kids amenities
- Pool heating available ($40/day); pet fee $395 required for pets
- Check-in 4 PM, check-out 10 AM
