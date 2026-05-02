# NSB Retreat — Website + Interactive Guest Manual
**Date:** 2026-05-02
**Domain:** nsbretreat.com
**Property:** The New Smyrna Beach Retreat · 815 Carol Ave · New Smyrna Beach, FL 32169 · 5BR / 4BA / Sleeps 16

---

## Overview

Two-part static web project sharing one domain and one design language:

1. **Marketing site** — `nsbretreat.com` — public-facing property showcase for prospective guests
2. **Interactive guest manual** — `nsbretreat.com/guide` — functional tool for guests currently staying at the property

Guests in-house are directed to `/guide` via QR code (printed signage in the house) and via link in the Airbnb message thread. Prospective guests land on the homepage organically or via direct link.

---

## Stack

- **HTML / CSS / vanilla JS** — multi-file, no framework, no build step
- **Supabase** — guest book storage (one table, anonymous insert, public read)
- **ical.js** — parse Airbnb iCal feed for availability calendar
- **Fuse.js** — fuzzy search for chatbot FAQ matching
- **Cloudflare Worker (free tier)** — CORS proxy for fetching Airbnb iCal client-side
- **Hosting** — Netlify or GitHub Pages (free), custom domain, SSL included
- **Photos** — provided by owner from Google Drive, compressed/optimized at build time

---

## Design Language

Direct port of the existing PDF guide book aesthetic:

- **Colors:** Blush pink background (`~#f9ece8`), sand/tan card backgrounds (`~#e8ddd0`), dark charcoal text (`~#2d2926`)
- **Headings:** Cormorant Garamond or Playfair Display (serif, elegant)
- **Body:** Inter or similar sans-serif
- **Cards:** Soft rounded corners, light drop shadow, generous padding
- **Mobile-first:** All layouts designed for phone first, scale up to desktop
- **Tone:** Warm, personal, premium — matches the existing PDF voice

---

## File Structure

```
nsbretreat.com/
├── index.html              # Marketing homepage
├── css/
│   └── styles.css          # Shared design tokens + page styles
├── js/
│   └── main.js             # Homepage JS (calendar, lightbox)
├── assets/
│   └── photos/             # Optimized property photos
├── guide/
│   ├── index.html          # Interactive guest manual
│   ├── js/
│   │   ├── chatbot.js      # FAQ matcher (Fuse.js)
│   │   └── manual.js       # Manual interactions (copy, checklist, guestbook)
│   └── data/
│       └── knowledgebase.json  # Editable Q&A pairs for chatbot
└── CNAME                   # Custom domain config for Netlify/GitHub Pages
```

---

## Marketing Site (`index.html`)

### Sections (single scroll, anchor nav)

**1. Nav**
Fixed top nav: logo/name left, anchor links right (The House · Gallery · Amenities · Availability · Book Now). Collapses to hamburger on mobile.

**2. Hero**
Full-bleed property exterior photo. Centered overlay:
- Heading: "THE NEW SMYRNA BEACH RETREAT"
- Subtitle: "815 Carol Ave · New Smyrna Beach, FL"
- CTA button: "Book on Airbnb" (links to Airbnb listing)

**3. The Property**
Stat strip: `5 Bedrooms · 4 Bathrooms · Sleeps 16 · Minutes to Beach`
Short description paragraph (warm, conversational — matches PDF voice).
Horizontal scroll of highlight cards on mobile (pool, game room, beach gear, massage chair, hot tub, bikes). Each card: photo + 3-word label.

**4. Photo Gallery**
Masonry grid, all photos visible at once, lightbox on tap/click. Collapses to 2-column on mobile. Photos provided by owner from Google Drive.

**5. Amenities**
Icon grid grouped into four categories:
- **Indoors:** Game room (air hockey, retro arcade, Margaritaville maker), Smart TVs every room, massage chair, espresso machine, Nespresso
- **Outdoors:** Pool, hot tub, putting green, covered patio, front porch
- **Beach Gear:** Chairs, umbrella, towels, cart, beach toys, sporting equipment, bicycles
- **Kitchen:** Fully equipped, Margaritaville frozen drink maker, espresso machine, Nespresso, dishwasher

**6. Local Area**
Brief teaser section — 3 cards (Flagler Avenue, Smyrna Dunes Park, Canal Street). "See our full local guide →" links to `/guide#local`.

**7. Availability Calendar**
Monthly calendar view. Booked dates shaded in tan, available in white. Fed from Airbnb iCal export URL. Auto-syncs — no manual updates needed. Below calendar: "Book on Airbnb" button.

**8. Meet Your Hosts**
Photo of Antonio & Yani. Warm copy from existing PDF ("two brothers and Florida locals..."). Contact info.

**9. Footer**
Property name, address, "Book on Airbnb" button. Discreet link: "Current guests → House Manual"

---

## Guest Manual (`guide/index.html`)

Designed for mobile-first use by guests already at the property. All critical info reachable in ≤2 taps. No login required.

### Layout
Sticky top nav with icon tabs. Content sections scroll as one page, tabs jump to anchors.

### Sections

**1. Quick Info (above the fold, always first)**
2×2 tap-to-copy card grid:
- WiFi Network Name
- WiFi Password
- Door Code
- Check-out Time (10:00 AM)

Each card: tap copies value to clipboard, shows "Copied!" toast confirmation.

**2. Ask a Question (chatbot)**
Simple chat UI — text input + send button, response displayed as chat bubble.
- Powered by Fuse.js fuzzy matching against `knowledgebase.json`
- Knowledgebase covers ~30 most common guest questions (WiFi, hot tub, parking, bike code, trash day, checkout steps, appliances, etc.)
- No match fallback: "Great question! Text Antonio at [number]"
- Zero API cost, works offline after first load
- `knowledgebase.json` is a plain editable file — update without redeployment

**3. The House**
Accordion-style expandable sections. Each section: brief instructions + YouTube embed where relevant.
- Heating & Cooling (thermostat instructions, keep windows closed note)
- Kitchen Appliances (Margaritaville maker, super-auto espresso machine, Nespresso, dishwasher, oven)
- Laundry (washer/dryer, detergent location, load size note)
- Smart TVs (streaming apps, how to sign in with own account)
- Game Room (air hockey, retro arcade games — how to operate)
- Massage Chair (how to use)
- Outdoor Spaces (pool, hot tub, putting green, patio)
- Cleaning Supplies (location)
- Trash & Recycling (bin locations, bags location)

**4. Getting Around**
Three tap-friendly cards:
- **Bicycle** — "Code: 81518" (tap to copy), brief note
- **Golf Cart Rental** — Salty Rentals, tap-to-call phone number (386-410-5558)
- **Car** — brief note (grocery, downtown across the bridge)

**5. Hot Tub**
Dedicated section — most-asked question for STRs with hot tubs.
Numbered step-by-step instructions with icons. Clear, scannable.

**6. Local Guide**
Filter tabs: `Eat · Drink · See · Do · Coffee`
Cards per place: photo, name, vibe tag, one-line description, "Directions" button (opens Google Maps).
Places from existing PDF:
- **Eat:** The Breakers, The Garlic, Outriggers Tiki Bar & Grille, The Spott
- **Drink:** (from PDF)
- **See:** Flagler Avenue, Smyrna Dunes Park, Canal Street Historic District
- **Coffee:** (from PDF)
- **Do:** (from PDF — things to do section)

**7. Beach Tips**
Scannable card list of beach rules and tips from the existing PDF content.

**8. Checkout Checklist**
Interactive tap-to-check list before departure:
- Start a load of linens/towels in washer
- Start a load of pool towels separately from white linens
- Run dishwasher
- Take out all trash
- Remove personal belongings
- Close and lock all windows and doors
- Return beach gear to garage
- Return bikes to garage

Progress bar fills as items are checked. No data saved — purely client-side. Resets on page reload.

**9. Guest Book**
Simple form: Name, Home City, Message (required), Star rating (optional).
Submissions stored in Supabase `guestbook` table (anonymous insert, no login).
Past entries displayed below in chronological card feed.
Hosts can delete entries via Supabase dashboard.

---

## Technical Components

### iCal Calendar Sync
- Airbnb exports a private iCal URL from host dashboard (Settings → Availability → Export Calendar)
- A Cloudflare Worker (free tier) acts as CORS proxy to fetch the iCal from client-side JS
- `ical.js` parses the feed and marks dates as booked/available
- Calendar re-fetches on each page load — always current
- One-time setup: owner provides iCal URL, it goes in a config variable

### Chatbot Knowledgebase
- `guide/data/knowledgebase.json` — array of `{ question, answer, tags }` objects
- Fuse.js searches question text + tags with fuzzy matching
- Owner can edit the JSON directly to add/update answers
- Suggested initial Q&A pairs (~30): WiFi password, door code, checkout time, hot tub startup, bike lock code, parking spots, trash day, laundry instructions, pool heat, AC thermostat, coffee machine, where is X, what time quiet hours, etc.

### Supabase Guest Book
```sql
create table guestbook (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text,
  message text not null,
  rating int check (rating between 1 and 5),
  created_at timestamptz default now()
);

alter table guestbook enable row level security;
create policy "Anyone can insert" on guestbook for insert with check (true);
create policy "Anyone can read" on guestbook for select using (true);
```

### Hosting & Domain
- Deploy to Netlify (free tier) — drag-and-drop or GitHub auto-deploy
- Point nsbretreat.com DNS to Netlify — SSL auto-provisioned
- No server, no monthly cost beyond the domain itself

---

## Out of Scope

- Direct booking / payment processing (guests book through Airbnb)
- Guest login or authentication
- Real-time chat with host (chatbot fallback points to phone/text)
- Dynamic pricing display
- Multilingual support

---

## Open Items for Owner

1. **Airbnb iCal URL** — needs to be pulled from Airbnb host dashboard
2. **Photos** — share Google Drive folder link
3. **Airbnb listing URL** — for "Book on Airbnb" buttons
4. **WiFi credentials + door code** — for Quick Info cards (kept in a separate config, not hardcoded in public repo)
5. **Full restaurant/bar/coffee/activities list** — confirm all places from PDF are still current and add any new favorites
6. **Hot tub startup steps** — confirm exact sequence for the knowledgebase
7. **Phone number** — for chatbot fallback ("text Antonio at...")
8. **YouTube video links** — for any appliance guides you want embedded (espresso machine, Margaritaville, arcade, etc.)
