# NSB Retreat — Setup Guide for New Installations

This repo is a complete Airbnb rental property website. It includes a public landing page, a guest house guide, an iPad control pad for the pool/spa, and a photo booth + guestbook. Fork or clone it, follow the steps below, and you'll have a fully working site for your own property.

---

## What's in the Repo

| Path | What it is |
|------|------------|
| `index.html` | Public landing page (hero, gallery, amenities, availability, reviews) |
| `guide/index.html` | Guest house manual with accordions, beach conditions, chatbot, photo booth |
| `pad/index.html` | iPad-only control page for the pool/hot tub (optional) |
| `admin.html` | Admin panel |
| `js/config.js` | **Your main configuration file — start here** |
| `assets/photos/` | All property photos |
| `api/` | Serverless API routes (Vercel) |
| `.env.local` | Secret keys — never committed to git |

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/jman700/nsbretreat.git my-airbnb
cd my-airbnb
npm install
```

---

## Step 2 — `js/config.js` (required)

This is the single most important file. Replace every value:

```js
const CONFIG = {
  ical_proxy_url:      '/api/ical',       // leave as-is
  ical_proxy_url_vrbo: '/api/ical-vrbo',  // leave as-is (or remove if no VRBO)
  airbnb_url: 'https://www.airbnb.com/rooms/YOUR_LISTING_ID',  // your Airbnb listing URL

  ga_measurement_id: 'G-XXXXXXXXXX',  // your Google Analytics 4 ID (or leave as placeholder to disable)

  quick_info: {
    wifi_name:     'YourNetworkName',
    wifi_password: 'yourpassword',
    checkout_time: '10:00 AM',
    host_phone:    '(555) 000-0000',
  },
};
```

---

## Step 3 — Photos

Replace all files in `assets/photos/` with your own property photos.

The filenames that are referenced in the HTML are:

| Filename | Used for |
|----------|----------|
| `hero.jpg` | Full-screen hero image on the landing page |
| `hosts.jpg` | Host profile photo in the Hosts section |
| `pool.jpg` | Pool highlight card |
| `gameroom.jpg` | Game room highlight card |
| `hottub.jpg` | Hot tub highlight card |
| `massage.jpg` | Massage chair highlight card |
| `bikes.jpg` | Beach bikes highlight card |
| `margaritaville.jpg` | Margaritaville maker highlight card |
| `interior-1.jpg` … `interior-N.jpg` | Gallery slideshow — add as many as you want |
| `pool-1.jpg` … `pool-N.jpg` | Pool gallery images |

You can add or remove gallery images — the gallery JS auto-discovers all `interior-*.jpg` and `pool-*.jpg` files referenced in the HTML.

---

## Step 4 — `index.html` — Landing Page Content

Search for and replace the following in `index.html`:

| What to find | What to change it to |
|---|---|
| `The New Smyrna Beach Retreat` | Your property name |
| `815 Carol Ave` | Your address |
| `5 Bedrooms · Sleeps 16 · 2,600 sq ft` | Your property stats |
| `New Smyrna Beach, Florida` | Your city/state |
| `5`, `4`, `16`, `3`, `2,600`, `7` (in the stat strip) | Your bedroom/bath/guest/walk-to-beach counts |
| The entire amenities section | Your amenities |
| The entire FAQ section | Your FAQ |
| Host name and bio in `#hosts` section | Your name and bio |
| The reviews carousel entries | Your actual reviews |
| Airbnb review count (`51 Reviews`) | Your review count |

---

## Step 5 — `guide/index.html` — Guest Manual

This file is the house manual your guests actually read. It contains all the property-specific instructions (parking, door codes, appliances, etc.). Go through it section by section and replace every instruction with your own.

Key things to find and replace:
- All phone numbers (Antonio's number appears several times)
- `815 Carol Ave` and any address references
- Appliance-specific instructions (espresso machine model, TV brand, etc.)
- Pool/hot tub instructions (or remove the Hot Tub section entirely if you don't have one)
- Emergency contacts and utility locations (circuit breaker, water main)
- Trash pickup days
- Check-in/check-out times (also set in `config.js`)

---

## Step 6 — Environment Variables (`.env.local`)

Create a `.env.local` file in the project root (it's gitignored — never commit this):

```
# Airbnb iCal feed (enables the availability calendar on the landing page)
# Get this from: Airbnb → Listings → Your Listing → Pricing & Availability → Availability → Export Calendar
AIRBNB_ICAL_URL=https://www.airbnb.com/calendar/ical/YOUR_LISTING_ID.ics?s=YOUR_SECRET

# VRBO iCal feed (optional — remove if you don't list on VRBO)
VRBO_ICAL_URL=https://www.vrbo.com/icalendar/...

# Supabase (for guestbook + photo booth — see Step 8)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# iAqualink pool controller (OPTIONAL — only if you have a Pentair/iAqualink pool system)
IAQUALINK_EMAIL=youremail@example.com
IAQUALINK_PASSWORD=yourpassword
IAQUALINK_DEVICE_SERIAL=your-device-serial
```

---

## Step 7 — Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all your `.env.local` values as Environment Variables in the Vercel dashboard
4. Deploy
5. Add your custom domain in Vercel → Settings → Domains

The `vercel.json` is already configured correctly — no changes needed.

---

## Step 8 — Supabase Setup (Guestbook + Photo Booth)

This is optional. If you want the guestbook and photo booth to work:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the following SQL in the Supabase SQL editor:

```sql
-- Guestbook
create table public.guestbook (
  id bigserial primary key,
  name text not null,
  month text,
  message text not null,
  created_at timestamptz default now()
);
alter table public.guestbook enable row level security;
create policy "anon_select" on public.guestbook for select to anon using (true);
create policy "anon_insert" on public.guestbook for insert to anon with check (true);

-- Photo booth
create table public.photobooth (
  id bigserial primary key,
  photo_url text not null,
  created_at timestamptz default now()
);
alter table public.photobooth enable row level security;
create policy "anon_select" on public.photobooth for select to anon using (true);
create policy "anon_insert" on public.photobooth for insert to anon with check (true);

-- Also create a storage bucket named "photobooth" for photo uploads.
```

3. Get your project URL and service role key from Supabase → Settings → API
4. Add them to your `.env.local` (see Step 6)

---

## Step 9 — Pool/Spa Control (Optional — iAqualink only)

The `pad/index.html` and `api/pool-*.js` files are built for a **Pentair pool system with iAqualink** integration. If you don't have an iAqualink-compatible pool controller, remove or hide the pad page — it won't work for other systems.

If you do have iAqualink:
- Add your iAqualink credentials to `.env.local`
- Navigate to `/pad/` on your deployed site to verify the pool widget connects

---

## Step 10 — Remove What You Don't Need

If your property doesn't have some of these features, just delete the relevant sections from the HTML:

- No hot tub → delete the `#hottub` section from `guide/index.html` and the "HOT TUB" nav tab
- No pool → remove pool references throughout
- No game room → remove that highlight card and guide section
- No VRBO listing → remove `ical-vrbo.js` from `api/` and the VRBO env var
- Don't want multi-language → remove the language switcher from the nav

---

## Quick Checklist

- [ ] `js/config.js` — WiFi, phone, Airbnb URL, GA ID
- [ ] `assets/photos/` — All photos replaced
- [ ] `index.html` — Property name, address, stats, amenities, FAQ, host bio, reviews
- [ ] `guide/index.html` — All instructions updated for your property
- [ ] `.env.local` — iCal URL(s), Supabase keys
- [ ] Vercel project created with env vars set
- [ ] Custom domain configured in Vercel

---

## Questions

Built by Antonio Concha. The original site runs at [nsbretreat.com](https://nsbretreat.com).
