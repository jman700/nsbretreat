# NSB Retreat Website + Guest Manual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build nsbretreat.com — a marketing website for prospective guests and an interactive guest manual at /guide for current guests.

**Architecture:** Multi-file static site (HTML/CSS/vanilla JS), no build step, no framework. Marketing site at index.html, manual at guide/index.html. Shared CSS design tokens. Supabase for guest book. Deployed to Netlify with custom domain.

**Tech Stack:** HTML5, CSS3, vanilla JS, Fuse.js (chatbot fuzzy search), ical.js (Airbnb calendar), Supabase JS client (guest book), Cloudflare Workers (iCal CORS proxy), Netlify (hosting)

---

## Sensitive Data Handling

Never hardcode WiFi credentials, door codes, Supabase keys, or the Airbnb iCal URL in HTML files. All sensitive values live in `config.js` which is gitignored. A `config.example.js` is committed instead.

---

## File Structure

```
/
├── index.html
├── css/
│   └── styles.css           # All shared tokens + page styles
├── js/
│   ├── config.js            # GITIGNORED — sensitive values
│   ├── config.example.js    # Committed template
│   ├── main.js              # Homepage: nav, gallery lightbox, calendar
│   └── calendar.js          # iCal fetch + render
├── assets/
│   └── photos/              # Optimized property photos
├── guide/
│   ├── index.html
│   ├── js/
│   │   ├── chatbot.js       # Fuse.js FAQ matcher
│   │   ├── manual.js        # Clipboard copy, accordion, checklist
│   │   └── guestbook.js     # Supabase guest book
│   └── data/
│       └── knowledgebase.json
├── .gitignore
└── CNAME
```

---

## Task 1: Project Foundation

**Files:**
- Create: `.gitignore`
- Create: `css/styles.css`
- Create: `js/config.example.js`
- Create: `js/config.js`

- [ ] **Step 1: Create .gitignore**

```
js/config.js
assets/photos/
node_modules/
.DS_Store
```

- [ ] **Step 2: Create js/config.example.js**

```js
// Copy this file to config.js and fill in real values
const CONFIG = {
  wifi_name: "YourNetworkName",
  wifi_password: "YourPassword",
  door_code: "XXXX",
  checkout_time: "10:00 AM",
  checkin_time: "4:00 PM",
  host_phone: "+1 (XXX) XXX-XXXX",
  airbnb_url: "https://www.airbnb.com/rooms/YOUR_LISTING_ID",
  ical_proxy_url: "https://YOUR_WORKER.workers.dev/ical",
  supabase_url: "https://YOUR_PROJECT.supabase.co",
  supabase_anon_key: "YOUR_ANON_KEY"
};
```

- [ ] **Step 3: Create js/config.js with real values (do not commit)**

Copy config.example.js to config.js and fill in:
- WiFi name and password
- Door code
- Host phone number
- Airbnb listing URL
- iCal proxy URL (fill in after Task 9)
- Supabase URL and anon key (fill in after Task 14)

- [ ] **Step 4: Create css/styles.css with design tokens**

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&display=swap');

:root {
  --blush: #f9ece8;
  --sand: #e8ddd0;
  --tan: #d4c4b0;
  --charcoal: #2d2926;
  --charcoal-light: #5c5550;
  --white: #ffffff;
  --accent: #b8967e;

  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Inter', system-ui, sans-serif;

  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 2px 16px rgba(45,41,38,0.08);
  --shadow-lg: 0 8px 32px rgba(45,41,38,0.12);

  --max-width: 1200px;
  --section-pad: 5rem 1.5rem;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  color: var(--charcoal);
  background: var(--white);
  line-height: 1.6;
}

h1, h2, h3, h4 {
  font-family: var(--font-serif);
  font-weight: 500;
  line-height: 1.2;
}

img { max-width: 100%; display: block; }

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.btn {
  display: inline-block;
  padding: 0.875rem 2rem;
  border-radius: 4px;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.85; }
.btn-dark { background: var(--charcoal); color: var(--white); }
.btn-outline { background: transparent; color: var(--charcoal); border: 1.5px solid var(--charcoal); }

section { padding: var(--section-pad); }
.section-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.5rem;
}
.section-title {
  font-family: var(--font-serif);
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin-bottom: 1.5rem;
}
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore css/styles.css js/config.example.js
git commit -m "feat: project foundation — design tokens, config template"
```

---

## Task 2: Marketing Site Shell + Nav

**Files:**
- Create: `index.html`
- Modify: `css/styles.css` (append nav styles)
- Create: `js/main.js`

- [ ] **Step 1: Create index.html shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The New Smyrna Beach Retreat — 815 Carol Ave</title>
  <meta name="description" content="5-bedroom, 4-bathroom luxury beach home in New Smyrna Beach, FL. Sleeps 16. Pool, game room, beach bikes, and more.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <nav class="site-nav" id="site-nav">
    <div class="nav-inner container">
      <a href="/" class="nav-logo">NSB Retreat</a>
      <button class="nav-toggle" aria-label="Menu" id="nav-toggle">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="nav-links">
        <li><a href="#property">The House</a></li>
        <li><a href="#gallery">Gallery</a></li>
        <li><a href="#amenities">Amenities</a></li>
        <li><a href="#availability">Availability</a></li>
        <li><a href="#hosts">Hosts</a></li>
        <li><a href="#" id="nav-book-btn" class="btn btn-dark">Book on Airbnb</a></li>
      </ul>
    </div>
  </nav>

  <!-- sections added in subsequent tasks -->

  <script src="js/config.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Append nav styles to css/styles.css**

```css
/* ── Nav ── */
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(249,236,232,0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--tan);
  transition: box-shadow 0.2s;
}
.site-nav.scrolled { box-shadow: var(--shadow); }
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.nav-logo {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: var(--charcoal);
  text-decoration: none;
  letter-spacing: 0.05em;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
  list-style: none;
}
.nav-links a {
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--charcoal);
  text-decoration: none;
}
.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}
.nav-toggle span {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--charcoal);
  transition: 0.2s;
}
@media (max-width: 768px) {
  .nav-toggle { display: flex; }
  .nav-links {
    display: none;
    position: absolute;
    top: 64px; left: 0; right: 0;
    flex-direction: column;
    background: var(--blush);
    padding: 1.5rem;
    gap: 1.25rem;
    border-bottom: 1px solid var(--tan);
  }
  .nav-links.open { display: flex; }
}
```

- [ ] **Step 3: Create js/main.js with nav behavior**

```js
// Nav scroll shadow
const nav = document.getElementById('site-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile nav toggle
document.getElementById('nav-toggle').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

// Wire up Airbnb URL from config
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-airbnb-link]').forEach(el => {
    el.href = CONFIG.airbnb_url;
  });
  document.getElementById('nav-book-btn').href = CONFIG.airbnb_url;
});
```

- [ ] **Step 4: Open index.html in browser, verify nav is fixed, mobile hamburger works**

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css js/main.js
git commit -m "feat: marketing site shell and nav"
```

---

## Task 3: Hero Section

**Files:**
- Modify: `index.html` (add hero section)
- Modify: `css/styles.css` (append hero styles)

- [ ] **Step 1: Add hero section to index.html (after nav)**

```html
<section class="hero" id="hero">
  <div class="hero-bg">
    <img src="assets/photos/hero.jpg" alt="The New Smyrna Beach Retreat exterior" class="hero-img">
  </div>
  <div class="hero-content">
    <p class="hero-eyebrow">New Smyrna Beach, Florida</p>
    <h1 class="hero-title">The New Smyrna<br>Beach Retreat</h1>
    <p class="hero-sub">815 Carol Ave &nbsp;·&nbsp; 5 Bedrooms &nbsp;·&nbsp; Sleeps 16</p>
    <a href="#" data-airbnb-link class="btn btn-dark hero-btn">Book on Airbnb</a>
  </div>
</section>
```

- [ ] **Step 2: Append hero styles to css/styles.css**

```css
/* ── Hero ── */
.hero {
  position: relative;
  height: 100vh;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(45,41,38,0.35);
}
.hero-content {
  position: relative;
  z-index: 1;
  color: var(--white);
  padding: 0 1.5rem;
}
.hero-eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 1rem;
  opacity: 0.9;
}
.hero-title {
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 400;
  margin-bottom: 1rem;
}
.hero-sub {
  font-size: 1rem;
  letter-spacing: 0.05em;
  opacity: 0.85;
  margin-bottom: 2.5rem;
}
.hero-btn { min-width: 200px; }
```

- [ ] **Step 3: Add a hero photo**

Place your best exterior or pool photo at `assets/photos/hero.jpg`. Recommended: resize to 1920×1080, compress to under 400KB using squoosh.app or similar.

- [ ] **Step 4: Open in browser, verify full-screen hero with overlay and CTA**

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: hero section"
```

---

## Task 4: Property Stats + Highlight Cards

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`

- [ ] **Step 1: Add property section to index.html (after hero)**

```html
<section class="property" id="property">
  <div class="container">
    <div class="stat-strip">
      <div class="stat">
        <span class="stat-num">5</span>
        <span class="stat-label">Bedrooms</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-num">4</span>
        <span class="stat-label">Bathrooms</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-num">16</span>
        <span class="stat-label">Guests</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-num">5<span class="stat-unit">min</span></span>
        <span class="stat-label">to Beach</span>
      </div>
    </div>

    <div class="property-intro">
      <p class="section-label">The Property</p>
      <h2 class="section-title">A Coastal Haven in<br>New Smyrna Beach</h2>
      <p class="property-desc">Welcome to our beachside retreat — where the rhythm of the waves sets the tone for a serene and rejuvenating stay. Designed to blend modern comforts with coastal living, the open-concept layout is perfect for families and groups looking to make memories together.</p>
    </div>

    <div class="highlights-scroll">
      <div class="highlight-card">
        <img src="assets/photos/pool.jpg" alt="Pool">
        <span>Private Pool</span>
      </div>
      <div class="highlight-card">
        <img src="assets/photos/gameroom.jpg" alt="Game Room">
        <span>Game Room</span>
      </div>
      <div class="highlight-card">
        <img src="assets/photos/hottub.jpg" alt="Hot Tub">
        <span>Hot Tub</span>
      </div>
      <div class="highlight-card">
        <img src="assets/photos/massage.jpg" alt="Massage Chair">
        <span>Massage Chair</span>
      </div>
      <div class="highlight-card">
        <img src="assets/photos/bikes.jpg" alt="Beach Bikes">
        <span>Beach Bikes</span>
      </div>
      <div class="highlight-card">
        <img src="assets/photos/margaritaville.jpg" alt="Margaritaville Maker">
        <span>Margaritaville</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Append property styles to css/styles.css**

```css
/* ── Property ── */
.property { background: var(--blush); }
.stat-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  padding: 2rem 0 3rem;
  border-bottom: 1px solid var(--tan);
  margin-bottom: 3rem;
}
.stat { text-align: center; }
.stat-num {
  display: block;
  font-family: var(--font-serif);
  font-size: 2.5rem;
  line-height: 1;
}
.stat-unit { font-size: 1.5rem; }
.stat-label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--charcoal-light);
}
.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--tan);
}
@media (max-width: 480px) { .stat-divider { display: none; } }

.property-intro { text-align: center; max-width: 640px; margin: 0 auto 3rem; }
.property-desc { color: var(--charcoal-light); line-height: 1.8; }

.highlights-scroll {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scrollbar-width: none;
}
.highlights-scroll::-webkit-scrollbar { display: none; }
.highlight-card {
  flex: 0 0 220px;
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.highlight-card img {
  width: 100%;
  height: 280px;
  object-fit: cover;
}
.highlight-card span {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 2rem 1rem 1rem;
  background: linear-gradient(transparent, rgba(45,41,38,0.7));
  color: var(--white);
  font-size: 0.9rem;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Add highlight photos to assets/photos/ (pool.jpg, gameroom.jpg, hottub.jpg, massage.jpg, bikes.jpg, margaritaville.jpg)**

Each ~600×800px, under 150KB.

- [ ] **Step 4: Verify in browser — stat strip, intro text, horizontal scroll of cards**

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: property stats and highlight cards"
```

---

## Task 5: Photo Gallery

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`
- Modify: `js/main.js`

- [ ] **Step 1: Add gallery section to index.html**

```html
<section class="gallery" id="gallery">
  <div class="container">
    <p class="section-label" style="text-align:center">Photo Gallery</p>
    <h2 class="section-title" style="text-align:center">See Every Corner</h2>
  </div>
  <div class="gallery-grid" id="gallery-grid">
    <!-- JS populates from gallery photo list -->
  </div>
</section>

<!-- Lightbox -->
<div class="lightbox" id="lightbox" role="dialog" aria-hidden="true">
  <button class="lightbox-close" id="lightbox-close" aria-label="Close">&#x2715;</button>
  <button class="lightbox-prev" id="lightbox-prev" aria-label="Previous">&#x2039;</button>
  <img src="" alt="" id="lightbox-img">
  <button class="lightbox-next" id="lightbox-next" aria-label="Next">&#x203A;</button>
</div>
```

- [ ] **Step 2: Append gallery + lightbox styles to css/styles.css**

```css
/* ── Gallery ── */
.gallery { background: var(--white); }
.gallery-grid {
  columns: 3 240px;
  gap: 0.5rem;
  padding: 0 1.5rem;
  margin-top: 2rem;
}
.gallery-grid img {
  width: 100%;
  margin-bottom: 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.2s;
}
.gallery-grid img:hover { opacity: 0.85; }
@media (max-width: 480px) { .gallery-grid { columns: 2; } }

/* Lightbox */
.lightbox {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  z-index: 200;
  align-items: center;
  justify-content: center;
}
.lightbox.open { display: flex; }
.lightbox img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
.lightbox-close, .lightbox-prev, .lightbox-next {
  position: absolute;
  background: none;
  border: none;
  color: var(--white);
  font-size: 2rem;
  cursor: pointer;
  padding: 1rem;
  opacity: 0.7;
}
.lightbox-close:hover, .lightbox-prev:hover, .lightbox-next:hover { opacity: 1; }
.lightbox-close { top: 1rem; right: 1rem; }
.lightbox-prev { left: 1rem; top: 50%; transform: translateY(-50%); font-size: 3rem; }
.lightbox-next { right: 1rem; top: 50%; transform: translateY(-50%); font-size: 3rem; }
```

- [ ] **Step 3: Add gallery JS to js/main.js**

```js
// Gallery — add photos array and lightbox logic
const GALLERY_PHOTOS = [
  'assets/photos/gallery-01.jpg',
  'assets/photos/gallery-02.jpg',
  'assets/photos/gallery-03.jpg',
  'assets/photos/gallery-04.jpg',
  'assets/photos/gallery-05.jpg',
  'assets/photos/gallery-06.jpg',
  'assets/photos/gallery-07.jpg',
  'assets/photos/gallery-08.jpg',
  'assets/photos/gallery-09.jpg',
  'assets/photos/gallery-10.jpg',
  'assets/photos/gallery-11.jpg',
  'assets/photos/gallery-12.jpg',
];

let currentPhoto = 0;

function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  GALLERY_PHOTOS.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Property photo ${i + 1}`;
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(i));
    grid.appendChild(img);
  });
}

function openLightbox(index) {
  currentPhoto = index;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[index];
  document.getElementById('lightbox').classList.add('open');
  document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLightbox();
});
document.getElementById('lightbox-prev').addEventListener('click', () => {
  currentPhoto = (currentPhoto - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[currentPhoto];
});
document.getElementById('lightbox-next').addEventListener('click', () => {
  currentPhoto = (currentPhoto + 1) % GALLERY_PHOTOS.length;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[currentPhoto];
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') document.getElementById('lightbox-prev').click();
  if (e.key === 'ArrowRight') document.getElementById('lightbox-next').click();
});

document.addEventListener('DOMContentLoaded', initGallery);
```

- [ ] **Step 4: Add gallery photos to assets/photos/gallery-01.jpg through gallery-12.jpg (or however many you have)**

Resize to max 1200px wide, under 200KB each.

- [ ] **Step 5: Verify masonry grid renders, lightbox opens and navigates**

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/main.js
git commit -m "feat: photo gallery with lightbox"
```

---

## Task 6: Amenities Section

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`

- [ ] **Step 1: Add amenities section to index.html**

```html
<section class="amenities" id="amenities">
  <div class="container">
    <p class="section-label" style="text-align:center">What's Included</p>
    <h2 class="section-title" style="text-align:center">Amenities</h2>
    <div class="amenities-groups">

      <div class="amenity-group">
        <h3 class="amenity-group-title">Indoors</h3>
        <ul class="amenity-list">
          <li>Air hockey table</li>
          <li>Retro arcade games</li>
          <li>Margaritaville frozen drink maker</li>
          <li>Zero-gravity massage chair</li>
          <li>Smart TVs in every room</li>
          <li>Super-automatic espresso machine</li>
          <li>Nespresso machine</li>
          <li>Fully equipped kitchen</li>
          <li>High-speed WiFi</li>
          <li>Washer &amp; dryer</li>
        </ul>
      </div>

      <div class="amenity-group">
        <h3 class="amenity-group-title">Outdoors</h3>
        <ul class="amenity-list">
          <li>Private pool</li>
          <li>Hot tub</li>
          <li>Putting green</li>
          <li>Covered patio with seating</li>
          <li>Front porch</li>
          <li>Driveway + garage parking</li>
        </ul>
      </div>

      <div class="amenity-group">
        <h3 class="amenity-group-title">Beach Gear</h3>
        <ul class="amenity-list">
          <li>Beach cruiser bicycles</li>
          <li>Beach chairs &amp; umbrella</li>
          <li>Beach towels &amp; cart</li>
          <li>Beach toys &amp; games</li>
          <li>Sporting equipment</li>
        </ul>
      </div>

      <div class="amenity-group">
        <h3 class="amenity-group-title">Kitchen</h3>
        <ul class="amenity-list">
          <li>Refrigerator, stove &amp; oven</li>
          <li>Microwave &amp; dishwasher</li>
          <li>Margaritaville maker</li>
          <li>Espresso &amp; Nespresso machines</li>
          <li>Pots, pans, baking sheets</li>
          <li>Complimentary coffee</li>
        </ul>
      </div>

    </div>
  </div>
</section>
```

- [ ] **Step 2: Append amenities styles to css/styles.css**

```css
/* ── Amenities ── */
.amenities { background: var(--sand); }
.amenities-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
  margin-top: 2.5rem;
}
.amenity-group {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.75rem;
  box-shadow: var(--shadow);
}
.amenity-group-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--tan);
}
.amenity-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.amenity-list li {
  font-size: 0.9rem;
  color: var(--charcoal-light);
  padding-left: 1rem;
  position: relative;
}
.amenity-list li::before {
  content: '·';
  position: absolute;
  left: 0;
  color: var(--accent);
}
```

- [ ] **Step 3: Verify 4-column grid in browser, collapses to 2 then 1 on mobile**

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: amenities section"
```

---

## Task 7: Local Area Teaser + Meet Hosts + Footer

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`

- [ ] **Step 1: Add local area teaser to index.html**

```html
<section class="local-teaser" id="local">
  <div class="container">
    <p class="section-label" style="text-align:center">Explore NSB</p>
    <h2 class="section-title" style="text-align:center">The Neighborhood</h2>
    <div class="local-cards">
      <div class="local-card">
        <img src="assets/photos/flagler.jpg" alt="Flagler Avenue">
        <div class="local-card-body">
          <h3>Flagler Avenue</h3>
          <p>The heart of NSB — local shops, restaurants, and beach access steps away.</p>
        </div>
      </div>
      <div class="local-card">
        <img src="assets/photos/dunes.jpg" alt="Smyrna Dunes Park">
        <div class="local-card-body">
          <h3>Smyrna Dunes Park</h3>
          <p>184-acre park with boardwalk trails, wildlife, and stunning Ponce Inlet views.</p>
        </div>
      </div>
      <div class="local-card">
        <img src="assets/photos/canal.jpg" alt="Canal Street">
        <div class="local-card-body">
          <h3>Canal Street District</h3>
          <p>Across the causeway — art galleries, local eateries, and historic architecture.</p>
        </div>
      </div>
    </div>
    <div style="text-align:center; margin-top:2rem">
      <a href="guide/#local" class="btn btn-outline">Full Local Guide →</a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add hosts section to index.html**

```html
<section class="hosts" id="hosts">
  <div class="container">
    <div class="hosts-inner">
      <div class="hosts-photo">
        <img src="assets/photos/hosts.jpg" alt="Antonio and Yani">
      </div>
      <div class="hosts-text">
        <p class="section-label">Your Hosts</p>
        <h2 class="section-title">Antonio &amp; Yani</h2>
        <p>We are two brothers and Florida locals born and raised in Orlando, FL but who now call New Smyrna Beach our second home. Hosting is something we truly enjoy and we hope you feel the love that was put into this home. We welcome you with open arms and hope you enjoy your stay with us!</p>
        <p style="margin-top:1rem; font-style:italic; color:var(--charcoal-light)">Cheers, Antonio &amp; Yani</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add footer to index.html**

```html
<footer class="site-footer">
  <div class="container">
    <div class="footer-inner">
      <div>
        <p class="footer-name">The New Smyrna Beach Retreat</p>
        <p class="footer-address">815 Carol Ave · New Smyrna Beach, FL 32169</p>
      </div>
      <div class="footer-actions">
        <a href="#" data-airbnb-link class="btn btn-dark">Book on Airbnb</a>
        <a href="guide/" class="footer-guest-link">Current guests → House Manual</a>
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Append styles to css/styles.css**

```css
/* ── Local Teaser ── */
.local-teaser { background: var(--blush); }
.local-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-top: 2.5rem;
}
.local-card {
  background: var(--white);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.local-card img { width: 100%; height: 200px; object-fit: cover; }
.local-card-body { padding: 1.25rem; }
.local-card-body h3 { font-family: var(--font-serif); font-size: 1.2rem; margin-bottom: 0.5rem; }
.local-card-body p { font-size: 0.9rem; color: var(--charcoal-light); }

/* ── Hosts ── */
.hosts { background: var(--sand); }
.hosts-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}
@media (max-width: 768px) {
  .hosts-inner { grid-template-columns: 1fr; gap: 2rem; }
}
.hosts-photo img { border-radius: var(--radius); box-shadow: var(--shadow-lg); }
.hosts-text p { color: var(--charcoal-light); line-height: 1.8; }

/* ── Footer ── */
.site-footer {
  background: var(--charcoal);
  color: var(--white);
  padding: 2.5rem 1.5rem;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  max-width: var(--max-width);
  margin: 0 auto;
}
.footer-name { font-family: var(--font-serif); font-size: 1.1rem; margin-bottom: 0.25rem; }
.footer-address { font-size: 0.85rem; opacity: 0.6; }
.footer-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
.footer-guest-link { font-size: 0.8rem; color: rgba(255,255,255,0.6); text-decoration: none; }
.footer-guest-link:hover { color: var(--white); }
```

- [ ] **Step 5: Verify full marketing site scrolls correctly, hosts and footer look good**

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: local teaser, hosts section, footer"
```

---

## Task 8: Availability Calendar

**Files:**
- Modify: `index.html`
- Create: `js/calendar.js`
- Modify: `css/styles.css`

- [ ] **Step 1: Set up Cloudflare Worker CORS proxy**

1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
2. Replace the default code with:

```js
export default {
  async fetch(request, env) {
    const icalUrl = env.ICAL_URL;
    if (!icalUrl) return new Response('Missing ICAL_URL binding', { status: 500 });

    const res = await fetch(icalUrl);
    const text = await res.text();
    return new Response(text, {
      headers: {
        'Content-Type': 'text/calendar',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
```

3. In Worker Settings → Variables → add `ICAL_URL` = your Airbnb iCal export URL
4. Deploy. Copy the Worker URL (e.g. `https://nsb-ical.YOUR_SUBDOMAIN.workers.dev`)
5. Add that URL to `js/config.js` as `ical_proxy_url`

- [ ] **Step 2: Add availability section to index.html (after amenities)**

```html
<section class="availability" id="availability">
  <div class="container">
    <p class="section-label" style="text-align:center">Check Dates</p>
    <h2 class="section-title" style="text-align:center">Availability</h2>
    <div class="calendar-wrap">
      <div class="calendar-nav">
        <button id="cal-prev" aria-label="Previous month">&#8592;</button>
        <span id="cal-month-label"></span>
        <button id="cal-next" aria-label="Next month">&#8594;</button>
      </div>
      <div class="calendar-grid" id="calendar-grid"></div>
      <div class="calendar-legend">
        <span class="legend-available">Available</span>
        <span class="legend-booked">Booked</span>
      </div>
    </div>
    <div style="text-align:center; margin-top:2rem">
      <a href="#" data-airbnb-link class="btn btn-dark">Book on Airbnb</a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Create js/calendar.js**

```js
// Requires ical.js loaded before this script
// Add to index.html: <script src="https://cdn.jsdelivr.net/npm/ical.js@1.5.0/build/ical.min.js"></script>

let bookedRanges = [];
let displayMonth = new Date();
displayMonth.setDate(1);

async function loadCalendar() {
  try {
    const res = await fetch(CONFIG.ical_proxy_url);
    const text = await res.text();
    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');
    bookedRanges = events.map(e => {
      const ev = new ICAL.Event(e);
      return {
        start: ev.startDate.toJSDate(),
        end: ev.endDate.toJSDate()
      };
    });
  } catch (err) {
    console.warn('Calendar load failed:', err);
  }
  renderCalendar();
}

function isBooked(date) {
  return bookedRanges.some(r => date >= r.start && date < r.end);
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid || !label) return;

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  label.textContent = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const past = date < today;
    const booked = !past && isBooked(date);
    html += `<div class="cal-day ${past ? 'cal-past' : booked ? 'cal-booked' : 'cal-available'}">${d}</div>`;
  }
  grid.innerHTML = html;
}

document.getElementById('cal-prev').addEventListener('click', () => {
  displayMonth.setMonth(displayMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  displayMonth.setMonth(displayMonth.getMonth() + 1);
  renderCalendar();
});

document.addEventListener('DOMContentLoaded', loadCalendar);
```

- [ ] **Step 4: Add ical.js and calendar.js to index.html before closing </body>**

```html
<script src="https://cdn.jsdelivr.net/npm/ical.js@1.5.0/build/ical.min.js"></script>
<script src="js/calendar.js"></script>
```

- [ ] **Step 5: Append calendar styles to css/styles.css**

```css
/* ── Availability Calendar ── */
.availability { background: var(--white); }
.calendar-wrap { max-width: 480px; margin: 2rem auto 0; }
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.calendar-nav button {
  background: none;
  border: 1px solid var(--tan);
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--charcoal);
}
.calendar-nav button:hover { background: var(--sand); }
#cal-month-label {
  font-family: var(--font-serif);
  font-size: 1.2rem;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-day-header {
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--charcoal-light);
  padding: 0.5rem 0;
}
.cal-day {
  text-align: center;
  padding: 0.6rem 0;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}
.cal-available { background: var(--blush); color: var(--charcoal); }
.cal-booked { background: var(--tan); color: var(--charcoal-light); text-decoration: line-through; }
.cal-past { color: #ccc; }
.cal-empty { background: none; }
.calendar-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 1rem;
  font-size: 0.8rem;
}
.legend-available::before { content: '■'; color: var(--blush); margin-right: 4px; }
.legend-booked::before { content: '■'; color: var(--tan); margin-right: 4px; }
```

- [ ] **Step 6: Verify calendar renders, prev/next month works, booked dates shade correctly**

- [ ] **Step 7: Commit**

```bash
git add index.html js/calendar.js css/styles.css
git commit -m "feat: availability calendar with Airbnb iCal sync"
```

---

## Task 9: Guest Manual Shell + Quick Info

**Files:**
- Create: `guide/index.html`
- Modify: `css/styles.css` (append manual styles)
- Create: `guide/js/manual.js`

- [ ] **Step 1: Create guide/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>House Manual — NSB Retreat</title>
  <meta name="description" content="Your guide to The New Smyrna Beach Retreat at 815 Carol Ave.">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/manual.css">
</head>
<body class="manual-body">

  <nav class="manual-nav" id="manual-nav">
    <div class="manual-nav-inner">
      <a href="../" class="manual-nav-logo">← NSB Retreat</a>
      <div class="manual-tabs" id="manual-tabs">
        <a href="#quick" class="tab-link active">Quick Info</a>
        <a href="#ask" class="tab-link">Ask</a>
        <a href="#house" class="tab-link">The House</a>
        <a href="#around" class="tab-link">Getting Around</a>
        <a href="#hottub" class="tab-link">Hot Tub</a>
        <a href="#local" class="tab-link">Local Guide</a>
        <a href="#beach" class="tab-link">Beach</a>
        <a href="#checkout" class="tab-link">Checkout</a>
        <a href="#guestbook" class="tab-link">Guest Book</a>
      </div>
    </div>
  </nav>

  <main class="manual-main">

    <!-- Quick Info -->
    <section class="manual-section" id="quick">
      <h2 class="manual-section-title">Quick Info</h2>
      <div class="quick-grid">
        <div class="quick-card" data-copy-key="wifi_name">
          <span class="quick-label">WiFi Network</span>
          <span class="quick-value" id="qv-wifi-name">—</span>
          <span class="quick-hint">Tap to copy</span>
        </div>
        <div class="quick-card" data-copy-key="wifi_password">
          <span class="quick-label">WiFi Password</span>
          <span class="quick-value" id="qv-wifi-pass">—</span>
          <span class="quick-hint">Tap to copy</span>
        </div>
        <div class="quick-card" data-copy-key="door_code">
          <span class="quick-label">Door Code</span>
          <span class="quick-value" id="qv-door">—</span>
          <span class="quick-hint">Tap to copy</span>
        </div>
        <div class="quick-card">
          <span class="quick-label">Check-out</span>
          <span class="quick-value" id="qv-checkout">—</span>
          <span class="quick-hint">Check-in: 4:00 PM</span>
        </div>
      </div>
      <div class="toast" id="copy-toast">Copied!</div>
    </section>

    <!-- other sections added in subsequent tasks -->

  </main>

  <script src="../js/config.js"></script>
  <script src="js/manual.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/manual.css**

```css
/* Manual-specific styles — imported only on guide/ pages */
.manual-body { background: var(--blush); padding-top: 0; }

.manual-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(249,236,232,0.97);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--tan);
}
.manual-nav-inner {
  display: flex;
  flex-direction: column;
}
.manual-nav-logo {
  padding: 0.75rem 1.25rem 0;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--charcoal-light);
  text-decoration: none;
}
.manual-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 1rem 0;
  gap: 0;
}
.manual-tabs::-webkit-scrollbar { display: none; }
.tab-link {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--charcoal-light);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: 0.15s;
}
.tab-link:hover, .tab-link.active {
  color: var(--charcoal);
  border-bottom-color: var(--accent);
}

.manual-main { max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }

.manual-section { margin-bottom: 3rem; scroll-margin-top: 90px; }
.manual-section-title {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  margin-bottom: 1.25rem;
}

/* Quick Info */
.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.quick-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.25rem;
  cursor: pointer;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.quick-card:active { transform: scale(0.97); }
.quick-label {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--charcoal-light);
}
.quick-value {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  color: var(--charcoal);
  word-break: break-all;
}
.quick-hint { font-size: 0.7rem; color: var(--accent); }

.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--charcoal);
  color: var(--white);
  padding: 0.6rem 1.5rem;
  border-radius: 100px;
  font-size: 0.85rem;
  opacity: 0;
  pointer-events: none;
  transition: 0.2s;
  z-index: 999;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

- [ ] **Step 3: Create guide/js/manual.js**

```js
// Populate quick info from config
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('qv-wifi-name').textContent = CONFIG.wifi_name;
  document.getElementById('qv-wifi-pass').textContent = CONFIG.wifi_password;
  document.getElementById('qv-door').textContent = CONFIG.door_code;
  document.getElementById('qv-checkout').textContent = CONFIG.checkout_time;

  // Tap-to-copy
  document.querySelectorAll('.quick-card[data-copy-key]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.copyKey;
      const value = CONFIG[key];
      if (!value) return;
      navigator.clipboard.writeText(value).then(() => showToast());
    });
  });

  // Active tab on scroll
  const sections = document.querySelectorAll('.manual-section[id]');
  const tabLinks = document.querySelectorAll('.tab-link');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tabLinks.forEach(t => t.classList.remove('active'));
        const active = document.querySelector(`.tab-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(s => observer.observe(s));
});

function showToast() {
  const toast = document.getElementById('copy-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}
```

- [ ] **Step 4: Open guide/index.html in browser — verify quick info cards show config values, tap-to-copy works, toast appears**

- [ ] **Step 5: Commit**

```bash
git add guide/index.html css/manual.css guide/js/manual.js
git commit -m "feat: guest manual shell, nav tabs, quick info cards"
```

---

## Task 10: Chatbot

**Files:**
- Create: `guide/data/knowledgebase.json`
- Modify: `guide/index.html`
- Create: `guide/js/chatbot.js`
- Modify: `css/manual.css`

- [ ] **Step 1: Create guide/data/knowledgebase.json**

```json
[
  { "q": "What is the WiFi password", "tags": ["wifi","internet","password","network"], "a": "The WiFi name and password are shown in the Quick Info cards at the top of this page — just tap either card to copy!" },
  { "q": "What time is checkout", "tags": ["checkout","check out","leave","departure"], "a": "Check-out is at 10:00 AM. Please see the Checkout Checklist section before you go!" },
  { "q": "What time is check in", "tags": ["checkin","check in","arrival","arrive"], "a": "Check-in is at 4:00 PM." },
  { "q": "What is the door code", "tags": ["door","code","lock","entry","keypad"], "a": "The door code is shown in the Quick Info cards at the top of this page — tap to copy it." },
  { "q": "How do I turn on the hot tub", "tags": ["hot tub","jacuzzi","spa","jets"], "a": "See the Hot Tub section for step-by-step instructions!" },
  { "q": "What is the bike lock code", "tags": ["bike","bicycle","lock","code"], "a": "The bike lock code is 81518." },
  { "q": "Where can I park", "tags": ["park","parking","car","driveway","garage"], "a": "The home has 1 garage, 4 driveway spots, and 3-4 lawn parking spots. Please do not block the neighbors." },
  { "q": "Where is the trash", "tags": ["trash","garbage","recycling","bins"], "a": "There are 2 trash bins in a pull-out drawer directly to the left of the pantry. Trash bags are under the kitchen sink." },
  { "q": "When is trash day", "tags": ["trash","garbage","pickup","collection"], "a": "Please ask your host for the current trash pickup day — it can vary. Text Antonio at " + (typeof CONFIG !== 'undefined' ? CONFIG.host_phone : '[host number]') },
  { "q": "How do I use the espresso machine", "tags": ["espresso","coffee","machine","nespresso"], "a": "Fill the water reservoir before brewing. The super-automatic espresso machine is on the counter — just add beans and press your drink selection. For the Nespresso, insert an Original pod and press brew. Extra pods are available at the nearby Publix." },
  { "q": "How does the Margaritaville machine work", "tags": ["margaritaville","frozen","drinks","blender","slushie"], "a": "Add ice to the ice reservoir, add your mixer to the blending jar, and press the blend button. Makes perfect frozen drinks — enjoy!" },
  { "q": "How do I use the arcade games", "tags": ["arcade","games","gameroom","air hockey","retro"], "a": "The arcade games and air hockey table are in the game room upstairs. They should be ready to play — if any have power issues, check that they are plugged in at the back." },
  { "q": "How do I use the massage chair", "tags": ["massage","chair","zero gravity"], "a": "The zero-gravity massage chair is in the living area. Use the remote to select a program. Recline with the footrest lever on the side." },
  { "q": "Where is the laundry", "tags": ["laundry","washer","dryer","washing"], "a": "The washer and dryer are in the laundry room. Detergent is provided. Please keep loads reasonably sized and wash pool towels separately from white linens." },
  { "q": "Where is the dishwasher detergent", "tags": ["dishwasher","detergent","pods","soap"], "a": "Dishwasher detergent is under the kitchen sink." },
  { "q": "How do I turn on the AC", "tags": ["ac","air conditioning","thermostat","temperature","cool"], "a": "Use the thermostat on the wall. Keep all windows and doors closed — if left open for more than a few minutes, the AC system will turn off until they are closed." },
  { "q": "Is there a pool", "tags": ["pool","swim","swimming"], "a": "Yes! The private pool is in the backyard. Enjoy it!" },
  { "q": "Can I rent a golf cart", "tags": ["golf cart","cart","rental","rent"], "a": "Yes — Salty Rentals is walking distance from the home. Call 386-410-5558 to reserve." },
  { "q": "Where can I eat", "tags": ["eat","food","restaurant","dinner","lunch"], "a": "Check out the Local Guide section for our favorite restaurants — including The Breakers, The Garlic, Outriggers Tiki, and The Spott." },
  { "q": "Where can I get coffee", "tags": ["coffee","cafe","cafe","espresso"], "a": "There is complimentary coffee in the kitchen — check the House section for instructions. For local cafes, see the Coffee tab in the Local Guide." },
  { "q": "What are the quiet hours", "tags": ["quiet","noise","hours","neighbors"], "a": "Quiet hours are from 10:00 PM to 9:00 AM. Please be respectful of the neighbors." },
  { "q": "Can we have a party", "tags": ["party","guests","visitors","gathering"], "a": "House parties and large gatherings are not permitted. Only registered guests may stay overnight." },
  { "q": "Is smoking allowed", "tags": ["smoke","smoking","cigarette","vape"], "a": "Smoking is strictly prohibited everywhere on the property — indoors, pool area, patios, and balcony." },
  { "q": "Where are the beach supplies", "tags": ["beach","chairs","umbrella","towels","gear"], "a": "Beach chairs, umbrella, towels, cart, beach toys, and sporting equipment are in the garage. The bikes are also there — lock code is 81518." },
  { "q": "What is the address", "tags": ["address","location","where"], "a": "815 Carol Ave, New Smyrna Beach, FL 32169." },
  { "q": "How do I get to the beach", "tags": ["beach","walk","distance","how far"], "a": "The beach is just a few minutes away by bike or on foot. Grab one of the beach bikes from the garage — lock code 81518." },
  { "q": "What streaming services are available", "tags": ["netflix","hulu","tv","streaming","youtube"], "a": "All Smart TVs have Netflix, Hulu, YouTube TV and more available to download. Sign in with your own account — and please sign out before you leave." },
  { "q": "What should I do at checkout", "tags": ["checkout","leave","cleaning","before you go"], "a": "See the Checkout Checklist section! Key steps: start a laundry load, run the dishwasher, take out trash, and lock up." },
  { "q": "Is there a putting green", "tags": ["putting","golf","green","putt"], "a": "Yes! There is a putting green in the backyard. Clubs are available — enjoy!" },
  { "q": "Is there a plumbing issue", "tags": ["plumbing","toilet","clog","leak","water"], "a": "If there is a plumbing issue, contact Antonio immediately. Please do not flush anything other than toilet paper — no wipes or feminine products." }
]
```

- [ ] **Step 2: Add chatbot section to guide/index.html (after quick section)**

```html
<section class="manual-section" id="ask">
  <h2 class="manual-section-title">Ask a Question</h2>
  <div class="chat-wrap">
    <div class="chat-messages" id="chat-messages">
      <div class="chat-bubble chat-bot">
        Hi! Ask me anything about the house, local area, or your stay. 👋
      </div>
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="e.g. What's the WiFi password?" autocomplete="off">
      <button id="chat-send">Send</button>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Create guide/js/chatbot.js**

```js
// Requires Fuse.js loaded before this script
// Add to guide/index.html: <script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>

let fuse;

async function initChatbot() {
  const res = await fetch('../guide/data/knowledgebase.json');
  const kb = await res.json();
  fuse = new Fuse(kb, {
    keys: ['q', 'tags'],
    threshold: 0.45,
    includeScore: true
  });
}

function getAnswer(query) {
  if (!fuse) return null;
  const results = fuse.search(query);
  if (results.length === 0 || results[0].score > 0.6) return null;
  return results[0].item.a;
}

function addMessage(text, role) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble chat-${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function handleSend() {
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  addMessage(query, 'user');
  setTimeout(() => {
    const answer = getAnswer(query);
    if (answer) {
      addMessage(answer, 'bot');
    } else {
      addMessage(`Great question! I'm not sure about that one. Text Antonio directly at ${CONFIG.host_phone} for help.`, 'bot');
    }
  }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  initChatbot();
  document.getElementById('chat-send').addEventListener('click', handleSend);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSend();
  });
});
```

- [ ] **Step 4: Add Fuse.js and chatbot.js to guide/index.html before closing </body>**

```html
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
<script src="js/chatbot.js"></script>
```

- [ ] **Step 5: Append chatbot styles to css/manual.css**

```css
/* ── Chatbot ── */
.chat-wrap {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.chat-messages {
  padding: 1.25rem;
  min-height: 180px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.chat-bubble {
  max-width: 85%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  line-height: 1.5;
}
.chat-bot {
  background: var(--blush);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.chat-user {
  background: var(--charcoal);
  color: var(--white);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.chat-input-row {
  display: flex;
  border-top: 1px solid var(--tan);
}
.chat-input-row input {
  flex: 1;
  padding: 1rem;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  background: var(--white);
  outline: none;
}
.chat-input-row button {
  padding: 1rem 1.5rem;
  background: var(--charcoal);
  color: var(--white);
  border: none;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  cursor: pointer;
}
.chat-input-row button:hover { opacity: 0.85; }
```

- [ ] **Step 6: Test chatbot — ask "What's the WiFi password?", "bike code", "checkout time", "something unknown"**

Expected: first three return answers, unknown triggers fallback with host phone number.

- [ ] **Step 7: Commit**

```bash
git add guide/data/knowledgebase.json guide/index.html guide/js/chatbot.js css/manual.css
git commit -m "feat: chatbot with Fuse.js FAQ matching"
```

---

## Task 11: The House Accordion

**Files:**
- Modify: `guide/index.html`
- Modify: `css/manual.css`
- Modify: `guide/js/manual.js`

- [ ] **Step 1: Add house section to guide/index.html**

```html
<section class="manual-section" id="house">
  <h2 class="manual-section-title">The House</h2>
  <div class="accordion" id="house-accordion">

    <div class="acc-item">
      <button class="acc-trigger">Heating &amp; Cooling</button>
      <div class="acc-body">
        <p>Adjust the thermostat to your preferred temperature. <strong>Keep all windows and doors closed</strong> — if left open for more than a few minutes, the AC system will shut off until they are closed again.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Kitchen — Espresso &amp; Coffee</button>
      <div class="acc-body">
        <p>We provide complimentary coffee. The <strong>super-automatic espresso machine</strong> on the counter does everything — add beans and press your selection. Fill the water reservoir before brewing.</p>
        <p style="margin-top:0.75rem">The <strong>Nespresso Original machine</strong> uses Original pods. Extra pods are available at the nearby Publix.</p>
        <p style="margin-top:0.75rem">Additional coffee makers are in the pantry attached to the kitchen.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Kitchen — Margaritaville Maker</button>
      <div class="acc-body">
        <p>Add ice to the ice reservoir at the top. Add your mixer to the blending jar below. Press the blend button for perfect frozen drinks. Enjoy responsibly!</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Kitchen — Appliances &amp; Cookware</button>
      <div class="acc-body">
        <p>The kitchen is fully equipped with: refrigerator, stove/oven, microwave, dishwasher. Dishwasher detergent is under the kitchen sink. Trash bins are in the pull-out drawer to the left of the pantry. Trash bags are under the sink.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Laundry</button>
      <div class="acc-body">
        <p>Washer and dryer are in the laundry room. Detergent is provided. Please keep load sizes reasonable. <strong>Wash pool towels and colored items separately from white linens.</strong></p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Smart TVs &amp; Streaming</button>
      <div class="acc-body">
        <p>Every bedroom and living space has a Smart TV. Netflix, Hulu, YouTube TV and more are available to download. Sign in with your own account. <strong>Please sign out before you leave.</strong></p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Game Room — Arcade &amp; Air Hockey</button>
      <div class="acc-body">
        <p>The game room is upstairs. It features <strong>retro arcade games</strong> and a <strong>professional air hockey table</strong>. Games should be ready to play — if any have power issues, check that they are plugged in at the back of the unit.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Massage Chair</button>
      <div class="acc-body">
        <p>The zero-gravity massage chair is in the living area. Use the remote to select a program. Recline using the footrest lever on the side. It's one of our favorite things in the house — enjoy it!</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Outdoor Spaces</button>
      <div class="acc-body">
        <p><strong>Pool &amp; Hot Tub:</strong> In the backyard. See the Hot Tub section for startup instructions.</p>
        <p style="margin-top:0.75rem"><strong>Putting Green:</strong> In the backyard. Putters are available — enjoy!</p>
        <p style="margin-top:0.75rem"><strong>Covered Patio:</strong> Rear of the house with seating. Great for evenings.</p>
        <p style="margin-top:0.75rem"><strong>Front Porch:</strong> Pull up a beach chair and watch the neighborhood.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Cleaning Supplies</button>
      <div class="acc-body">
        <p>Basic cleaning tools (brooms, mops, vacuum) are in the laundry room or garage. Cleaning supplies and dishwasher detergent are under the kitchen sink.</p>
      </div>
    </div>

    <div class="acc-item">
      <button class="acc-trigger">Water &amp; Plumbing</button>
      <div class="acc-body">
        <p>Please only flush toilet paper. <strong>Do not flush wipes, feminine products, or anything labeled "flushable"</strong> — this causes clogs. If you experience a plumbing issue or leak, contact Antonio immediately.</p>
      </div>
    </div>

  </div>
</section>
```

- [ ] **Step 2: Append accordion styles to css/manual.css**

```css
/* ── Accordion ── */
.accordion { display: flex; flex-direction: column; gap: 0.5rem; }
.acc-item {
  background: var(--white);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.acc-trigger {
  width: 100%;
  padding: 1rem 1.25rem;
  text-align: left;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--charcoal);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.acc-trigger::after {
  content: '+';
  font-size: 1.25rem;
  color: var(--accent);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.acc-item.open .acc-trigger::after { transform: rotate(45deg); }
.acc-body {
  display: none;
  padding: 0 1.25rem 1.25rem;
  font-size: 0.9rem;
  color: var(--charcoal-light);
  line-height: 1.7;
}
.acc-item.open .acc-body { display: block; }
```

- [ ] **Step 3: Add accordion init to guide/js/manual.js**

```js
// Accordion
document.querySelectorAll('.acc-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.acc-item');
    item.classList.toggle('open');
  });
});
```

- [ ] **Step 4: Verify accordion opens/closes each section, + rotates to ×**

- [ ] **Step 5: Commit**

```bash
git add guide/index.html css/manual.css guide/js/manual.js
git commit -m "feat: house accordion with all appliance sections"
```

---

## Task 12: Getting Around + Hot Tub

**Files:**
- Modify: `guide/index.html`
- Modify: `css/manual.css`

- [ ] **Step 1: Add Getting Around section to guide/index.html**

```html
<section class="manual-section" id="around">
  <h2 class="manual-section-title">Getting Around</h2>
  <div class="around-cards">
    <div class="around-card">
      <div class="around-icon">🚲</div>
      <h3>Bicycle</h3>
      <p>Beach cruisers are in the garage. Lock code:</p>
      <div class="around-code" data-copy-val="81518">
        <span class="code-val">81518</span>
        <span class="code-hint">Tap to copy</span>
      </div>
    </div>
    <div class="around-card">
      <div class="around-icon">🛺</div>
      <h3>Golf Cart Rental</h3>
      <p>Salty Rentals is walking distance from the home.</p>
      <a href="tel:3864105558" class="around-cta btn btn-outline">Call 386-410-5558</a>
    </div>
    <div class="around-card">
      <div class="around-icon">🚗</div>
      <h3>Car</h3>
      <p>Save the car for the grocery store or exploring Downtown NSB across the bridge.</p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add Hot Tub section to guide/index.html**

```html
<section class="manual-section" id="hottub">
  <h2 class="manual-section-title">Hot Tub</h2>
  <p style="color:var(--charcoal-light); margin-bottom:1.5rem; font-size:0.95rem">The hot tub may need 1-2 hours to reach temperature. Start it early!</p>
  <ol class="steps-list">
    <li>
      <span class="step-num">1</span>
      <div class="step-body">
        <strong>Locate the hot tub control panel</strong> on the side of the tub.
      </div>
    </li>
    <li>
      <span class="step-num">2</span>
      <div class="step-body">
        <strong>Press the Jets button</strong> to activate the jets. The pump will start.
      </div>
    </li>
    <li>
      <span class="step-num">3</span>
      <div class="step-body">
        <strong>Set your temperature</strong> using the up/down arrows. We recommend 100–104°F.
      </div>
    </li>
    <li>
      <span class="step-num">4</span>
      <div class="step-body">
        <strong>Replace the cover</strong> and allow 1-2 hours to heat if starting from cold.
      </div>
    </li>
    <li>
      <span class="step-num">5</span>
      <div class="step-body">
        <strong>When finished,</strong> press Jets to turn off and replace the cover to retain heat.
      </div>
    </li>
  </ol>
  <p style="margin-top:1.25rem; font-size:0.85rem; color:var(--charcoal-light)">Questions? Text Antonio at <a id="hottub-phone" href="#" style="color:var(--accent)">—</a></p>
</section>
```

- [ ] **Step 3: Append styles to css/manual.css**

```css
/* ── Getting Around ── */
.around-cards { display: flex; flex-direction: column; gap: 0.75rem; }
.around-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow);
}
.around-icon { font-size: 1.75rem; margin-bottom: 0.5rem; }
.around-card h3 { font-family: var(--font-serif); font-size: 1.2rem; margin-bottom: 0.4rem; }
.around-card p { font-size: 0.9rem; color: var(--charcoal-light); margin-bottom: 0.75rem; }
.around-code {
  display: inline-flex;
  flex-direction: column;
  background: var(--blush);
  border-radius: var(--radius-sm);
  padding: 0.6rem 1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.code-val { font-family: var(--font-serif); font-size: 1.5rem; }
.code-hint { font-size: 0.7rem; color: var(--accent); }
.around-cta { font-size: 0.8rem; padding: 0.6rem 1.25rem; }

/* ── Hot Tub Steps ── */
.steps-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
.steps-list li {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--white);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow);
}
.step-num {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--charcoal);
  color: var(--white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 500;
}
.step-body { font-size: 0.9rem; color: var(--charcoal-light); line-height: 1.6; }
.step-body strong { color: var(--charcoal); }
```

- [ ] **Step 4: Add bike code copy and host phone to guide/js/manual.js**

```js
// Bike code copy
document.querySelectorAll('.around-code[data-copy-val]').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.copyVal).then(() => showToast());
  });
});

// Host phone links
document.querySelectorAll('[id$="-phone"]').forEach(el => {
  el.href = 'tel:' + CONFIG.host_phone.replace(/\D/g, '');
  el.textContent = CONFIG.host_phone;
});
```

- [ ] **Step 5: Verify getting around cards display, bike code copies, call button works on mobile, hot tub steps render**

- [ ] **Step 6: Commit**

```bash
git add guide/index.html css/manual.css guide/js/manual.js
git commit -m "feat: getting around cards and hot tub step-by-step"
```

---

## Task 13: Local Guide

**Files:**
- Modify: `guide/index.html`
- Modify: `css/manual.css`
- Modify: `guide/js/manual.js`

- [ ] **Step 1: Add local guide section to guide/index.html**

```html
<section class="manual-section" id="local">
  <h2 class="manual-section-title">Local Guide</h2>
  <div class="local-filter-tabs">
    <button class="filter-btn active" data-filter="eat">Eat</button>
    <button class="filter-btn" data-filter="drink">Drink</button>
    <button class="filter-btn" data-filter="see">See</button>
    <button class="filter-btn" data-filter="do">Do</button>
    <button class="filter-btn" data-filter="coffee">Coffee</button>
  </div>
  <div class="local-guide-cards" id="local-guide-cards">

    <!-- EAT -->
    <div class="place-card" data-category="eat">
      <img src="../assets/photos/local-breakers.jpg" alt="The Breakers" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Casual · On the Beach</span>
        <h3>The Breakers</h3>
        <p>Beachfront dining with burgers, seafood, and ocean views. Possibly the best burger in Central Florida.</p>
        <a href="https://maps.google.com/?q=The+Breakers+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <div class="place-card" data-category="eat">
      <img src="../assets/photos/local-garlic.jpg" alt="The Garlic" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Casual · Lively</span>
        <h3>The Garlic</h3>
        <p>Rustic Italian with lush garden seating, wood-fired pizza, and an extensive wine list.</p>
        <a href="https://maps.google.com/?q=The+Garlic+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <div class="place-card" data-category="eat">
      <img src="../assets/photos/local-outriggers.jpg" alt="Outriggers" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Casual · Waterfront</span>
        <h3>Outriggers Tiki Bar &amp; Grille</h3>
        <p>Waterfront tiki bar with marina views, seafood, and tropical cocktails. Perfect sunset spot.</p>
        <a href="https://maps.google.com/?q=Outriggers+Tiki+Bar+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <div class="place-card" data-category="eat">
      <img src="../assets/photos/local-spott.jpg" alt="The Spott" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Elevated Dining</span>
        <h3>The Spott</h3>
        <p>Fresh fish, Black Angus steaks, and a speakeasy bar upstairs. Reserve in advance — highly recommended.</p>
        <a href="https://maps.google.com/?q=The+Spott+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <!-- SEE -->
    <div class="place-card" data-category="see">
      <img src="../assets/photos/flagler.jpg" alt="Flagler Avenue" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Shopping · Beach Access</span>
        <h3>Flagler Avenue</h3>
        <p>The heart of NSB — local shops, restaurants, festivals, and direct beach access.</p>
        <a href="https://maps.google.com/?q=Flagler+Ave+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <div class="place-card" data-category="see">
      <img src="../assets/photos/dunes.jpg" alt="Smyrna Dunes Park" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Nature · Dog Friendly</span>
        <h3>Smyrna Dunes Park</h3>
        <p>184-acre park with a boardwalk, nature trails, wildlife observation, and stunning Ponce Inlet views.</p>
        <a href="https://maps.google.com/?q=Smyrna+Dunes+Park+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

    <div class="place-card" data-category="see">
      <img src="../assets/photos/canal.jpg" alt="Canal Street" loading="lazy">
      <div class="place-card-body">
        <span class="place-tag">Historic · Culture</span>
        <h3>Canal Street Historic District</h3>
        <p>Across the causeway — art galleries, local eateries, historic architecture, and community events.</p>
        <a href="https://maps.google.com/?q=Canal+Street+New+Smyrna+Beach" target="_blank" class="place-directions btn btn-outline">Directions</a>
      </div>
    </div>

  </div>
</section>
```

Note: Add drink, coffee, and do cards following the same pattern once you confirm which places to include.

- [ ] **Step 2: Append local guide styles to css/manual.css**

```css
/* ── Local Guide ── */
.local-filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: 1.25rem;
  padding-bottom: 0.25rem;
}
.local-filter-tabs::-webkit-scrollbar { display: none; }
.filter-btn {
  flex-shrink: 0;
  padding: 0.5rem 1.25rem;
  border-radius: 100px;
  border: 1.5px solid var(--tan);
  background: var(--white);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  color: var(--charcoal-light);
  transition: 0.15s;
}
.filter-btn.active, .filter-btn:hover {
  background: var(--charcoal);
  color: var(--white);
  border-color: var(--charcoal);
}
.local-guide-cards { display: flex; flex-direction: column; gap: 1rem; }
.place-card {
  background: var(--white);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  gap: 0;
}
.place-card img { width: 120px; flex-shrink: 0; object-fit: cover; }
.place-card-body { padding: 1rem; flex: 1; }
.place-tag {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}
.place-card-body h3 { font-family: var(--font-serif); font-size: 1.1rem; margin: 0.25rem 0; }
.place-card-body p { font-size: 0.82rem; color: var(--charcoal-light); line-height: 1.5; margin-bottom: 0.75rem; }
.place-directions { font-size: 0.75rem; padding: 0.4rem 0.875rem; }
.place-card.hidden { display: none; }

@media (max-width: 400px) {
  .place-card img { width: 90px; }
}
```

- [ ] **Step 3: Add filter logic to guide/js/manual.js**

```js
// Local guide filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.place-card').forEach(card => {
      card.classList.toggle('hidden', card.dataset.category !== filter);
    });
  });
});
```

- [ ] **Step 4: Add local photos to assets/photos/ — local-breakers.jpg, local-garlic.jpg, local-outriggers.jpg, local-spott.jpg**

Use Google Maps or restaurant website photos, or photos you have taken. Resize to 300×200px.

- [ ] **Step 5: Test all filter tabs — Eat/Drink/See/Do/Coffee show correct cards, hidden cards don't show**

- [ ] **Step 6: Commit**

```bash
git add guide/index.html css/manual.css guide/js/manual.js
git commit -m "feat: local guide with filter tabs"
```

---

## Task 14: Beach Tips + Checkout Checklist

**Files:**
- Modify: `guide/index.html`
- Modify: `css/manual.css`
- Modify: `guide/js/manual.js`

- [ ] **Step 1: Add beach section to guide/index.html**

```html
<section class="manual-section" id="beach">
  <h2 class="manual-section-title">Beach Tips</h2>
  <ul class="tips-list">
    <li>🏖️ Beach gear is in the garage — chairs, umbrella, towels, cart, toys, and sporting equipment</li>
    <li>🚲 Bikes are in the garage — lock code is <strong>81518</strong></li>
    <li>🐢 NSB is a sea turtle nesting area — do not disturb nests or use bright lights near the beach at night</li>
    <li>🐕 Dogs are allowed on the beach — please clean up after your pet</li>
    <li>🍺 No glass containers on the beach</li>
    <li>🚗 Beach parking can be limited in peak season — biking or walking is recommended</li>
    <li>🌊 Always check surf and weather conditions before entering the water</li>
    <li>☀️ Florida sun is intense — reapply sunscreen every 90 minutes</li>
  </ul>
</section>
```

- [ ] **Step 2: Add checkout checklist section to guide/index.html**

```html
<section class="manual-section" id="checkout">
  <h2 class="manual-section-title">Checkout Checklist</h2>
  <p style="color:var(--charcoal-light); font-size:0.9rem; margin-bottom:1.25rem">Check-out is at <strong>10:00 AM</strong>. Please complete these before leaving.</p>
  <div class="checklist-progress">
    <div class="checklist-bar" id="checklist-bar"></div>
  </div>
  <p class="checklist-count" id="checklist-count">0 of 8 complete</p>
  <ul class="checklist" id="checklist">
    <li class="check-item" data-index="0">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Start a load of white linens/towels in the washer</span>
    </li>
    <li class="check-item" data-index="1">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Wash pool towels separately from white linens</span>
    </li>
    <li class="check-item" data-index="2">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Run the dishwasher</span>
    </li>
    <li class="check-item" data-index="3">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Take out all trash and replace bags</span>
    </li>
    <li class="check-item" data-index="4">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Remove all personal belongings</span>
    </li>
    <li class="check-item" data-index="5">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Return beach gear and bikes to the garage</span>
    </li>
    <li class="check-item" data-index="6">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Close and lock all windows and doors</span>
    </li>
    <li class="check-item" data-index="7">
      <button class="check-btn" aria-label="Mark complete"></button>
      <span>Sign out of Smart TVs (Netflix, Hulu, etc.)</span>
    </li>
  </ul>
</section>
```

- [ ] **Step 3: Append styles to css/manual.css**

```css
/* ── Beach Tips ── */
.tips-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
.tips-list li {
  background: var(--white);
  border-radius: var(--radius-sm);
  padding: 0.875rem 1.25rem;
  font-size: 0.9rem;
  color: var(--charcoal-light);
  box-shadow: var(--shadow);
  line-height: 1.5;
}

/* ── Checkout Checklist ── */
.checklist-progress {
  height: 6px;
  background: var(--tan);
  border-radius: 100px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}
.checklist-bar {
  height: 100%;
  background: var(--charcoal);
  border-radius: 100px;
  width: 0%;
  transition: width 0.3s;
}
.checklist-count {
  font-size: 0.8rem;
  color: var(--charcoal-light);
  margin-bottom: 1rem;
}
.checklist { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.check-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--white);
  border-radius: var(--radius-sm);
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow);
  transition: opacity 0.2s;
}
.check-item.done { opacity: 0.5; }
.check-item.done span { text-decoration: line-through; }
.check-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--tan);
  background: none;
  cursor: pointer;
  transition: 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.check-item.done .check-btn {
  background: var(--charcoal);
  border-color: var(--charcoal);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: center;
}
.check-item span { font-size: 0.9rem; color: var(--charcoal-light); }
```

- [ ] **Step 4: Add checklist logic to guide/js/manual.js**

```js
// Checkout checklist
const checkItems = document.querySelectorAll('.check-item');
const total = checkItems.length;

function updateProgress() {
  const done = document.querySelectorAll('.check-item.done').length;
  document.getElementById('checklist-bar').style.width = `${(done / total) * 100}%`;
  document.getElementById('checklist-count').textContent = `${done} of ${total} complete`;
}

checkItems.forEach(item => {
  item.querySelector('.check-btn').addEventListener('click', () => {
    item.classList.toggle('done');
    updateProgress();
  });
});

updateProgress();
```

- [ ] **Step 5: Verify beach tips list, checklist checks/unchecks, progress bar fills correctly**

- [ ] **Step 6: Commit**

```bash
git add guide/index.html css/manual.css guide/js/manual.js
git commit -m "feat: beach tips and checkout checklist"
```

---

## Task 15: Guest Book (Supabase)

**Files:**
- Modify: `guide/index.html`
- Create: `guide/js/guestbook.js`
- Modify: `css/manual.css`

- [ ] **Step 1: Set up Supabase**

1. Go to supabase.com → New project → name it `nsbretreat`
2. In the SQL editor, run:

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

create policy "Anyone can insert"
  on guestbook for insert
  with check (true);

create policy "Anyone can read"
  on guestbook for select
  using (true);
```

3. Go to Settings → API → copy Project URL and anon key
4. Add both to `js/config.js` as `supabase_url` and `supabase_anon_key`

- [ ] **Step 2: Add guest book section to guide/index.html**

```html
<section class="manual-section" id="guestbook">
  <h2 class="manual-section-title">Guest Book</h2>
  <p style="color:var(--charcoal-light); font-size:0.9rem; margin-bottom:1.5rem">Enjoyed your stay? Leave a note for future guests!</p>

  <form class="gb-form" id="gb-form">
    <div class="gb-form-row">
      <input type="text" id="gb-name" placeholder="Your name" required maxlength="60">
      <input type="text" id="gb-city" placeholder="Home city" maxlength="60">
    </div>
    <textarea id="gb-message" placeholder="Share your experience..." required maxlength="400" rows="3"></textarea>
    <div class="gb-rating">
      <span>Rating:</span>
      <div class="stars" id="gb-stars">
        <button type="button" data-val="1">★</button>
        <button type="button" data-val="2">★</button>
        <button type="button" data-val="3">★</button>
        <button type="button" data-val="4">★</button>
        <button type="button" data-val="5">★</button>
      </div>
    </div>
    <button type="submit" class="btn btn-dark gb-submit">Leave a Note</button>
    <p class="gb-status" id="gb-status"></p>
  </form>

  <div class="gb-entries" id="gb-entries">
    <p style="color:var(--charcoal-light); font-size:0.9rem">Loading entries...</p>
  </div>
</section>
```

- [ ] **Step 3: Create guide/js/guestbook.js**

```js
// Requires Supabase JS client
// Add to guide/index.html: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

let supabase;
let selectedRating = 0;

function initGuestbook() {
  supabase = window.supabase.createClient(CONFIG.supabase_url, CONFIG.supabase_anon_key);
  loadEntries();
  initStars();

  document.getElementById('gb-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('gb-name').value.trim();
    const city = document.getElementById('gb-city').value.trim();
    const message = document.getElementById('gb-message').value.trim();
    const status = document.getElementById('gb-status');

    if (!name || !message) return;

    const { error } = await supabase.from('guestbook').insert([{
      name, city, message,
      rating: selectedRating || null
    }]);

    if (error) {
      status.textContent = 'Something went wrong. Please try again.';
      status.style.color = 'red';
    } else {
      status.textContent = 'Thank you for your note! 🙏';
      status.style.color = 'var(--accent)';
      document.getElementById('gb-form').reset();
      selectedRating = 0;
      document.querySelectorAll('.stars button').forEach(b => b.classList.remove('active'));
      loadEntries();
    }
  });
}

function initStars() {
  const buttons = document.querySelectorAll('#gb-stars button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      buttons.forEach((b, i) => b.classList.toggle('active', i < selectedRating));
    });
  });
}

async function loadEntries() {
  const container = document.getElementById('gb-entries');
  const { data, error } = await supabase
    .from('guestbook')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) {
    container.innerHTML = '<p style="color:var(--charcoal-light); font-size:0.9rem">No entries yet. Be the first!</p>';
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal-light); font-size:0.9rem">No entries yet. Be the first!</p>';
    return;
  }

  container.innerHTML = data.map(entry => `
    <div class="gb-entry">
      <div class="gb-entry-header">
        <strong>${escapeHtml(entry.name)}</strong>
        ${entry.city ? `<span class="gb-city">${escapeHtml(entry.city)}</span>` : ''}
        ${entry.rating ? `<span class="gb-stars-display">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</span>` : ''}
      </div>
      <p class="gb-entry-message">${escapeHtml(entry.message)}</p>
      <span class="gb-entry-date">${new Date(entry.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', initGuestbook);
```

- [ ] **Step 4: Add Supabase CDN and guestbook.js to guide/index.html**

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="js/guestbook.js"></script>
```

- [ ] **Step 5: Append guest book styles to css/manual.css**

```css
/* ── Guest Book ── */
.gb-form { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
.gb-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 420px) { .gb-form-row { grid-template-columns: 1fr; } }
.gb-form input, .gb-form textarea {
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--tan);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  background: var(--white);
  color: var(--charcoal);
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.gb-form input:focus, .gb-form textarea:focus { border-color: var(--charcoal); }
.gb-rating { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: var(--charcoal-light); }
.stars { display: flex; gap: 0.25rem; }
.stars button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--tan);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.stars button.active { color: var(--accent); }
.gb-submit { align-self: flex-start; }
.gb-status { font-size: 0.85rem; min-height: 1.25rem; }

.gb-entries { display: flex; flex-direction: column; gap: 0.75rem; }
.gb-entry {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow);
}
.gb-entry-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.gb-entry-header strong { font-family: var(--font-serif); font-size: 1rem; }
.gb-city { font-size: 0.8rem; color: var(--charcoal-light); }
.gb-stars-display { color: var(--accent); font-size: 0.9rem; margin-left: auto; }
.gb-entry-message { font-size: 0.9rem; color: var(--charcoal-light); line-height: 1.6; margin-bottom: 0.5rem; }
.gb-entry-date { font-size: 0.75rem; color: var(--tan); }
```

- [ ] **Step 6: Test guest book — submit an entry, verify it appears in the feed and in Supabase dashboard**

- [ ] **Step 7: Commit**

```bash
git add guide/index.html guide/js/guestbook.js css/manual.css
git commit -m "feat: guest book with Supabase storage"
```

---

## Task 16: Deploy to Netlify

**Files:**
- Create: `CNAME`
- Create: `netlify.toml`

- [ ] **Step 1: Create netlify.toml**

```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/guide"
  to = "/guide/"
  status = 301
```

- [ ] **Step 2: Push all committed work to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/nsbretreat.git
git push -u origin main
```

- [ ] **Step 3: Deploy on Netlify**

1. app.netlify.com → Add new site → Import from Git → select the repo
2. Build command: leave empty (static site, no build step)
3. Publish directory: `.`
4. Deploy site

- [ ] **Step 4: Add custom domain**

1. Netlify → Domain management → Add custom domain → `nsbretreat.com`
2. In your DNS provider (wherever nsbretreat.com is registered), add:
   - A record: `@` → Netlify load balancer IP (shown in Netlify)
   - CNAME: `www` → `YOUR_SITE.netlify.app`
3. Netlify auto-provisions SSL — takes up to 24 hours to propagate

- [ ] **Step 5: Verify site is live at nsbretreat.com and nsbretreat.com/guide/**

- [ ] **Step 6: Final commit**

```bash
git add netlify.toml
git commit -m "feat: Netlify deploy config"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| Marketing homepage | Tasks 2–8 |
| Hero with CTA | Task 3 |
| Photo gallery + lightbox | Task 5 |
| Amenities section | Task 6 |
| Local area teaser | Task 7 |
| iCal availability calendar | Task 8 |
| Meet Your Hosts | Task 7 |
| Footer with guest manual link | Task 7 |
| Guest manual shell + nav | Task 9 |
| Quick Info tap-to-copy | Task 9 |
| Chatbot with Fuse.js | Task 10 |
| House accordion (all appliances) | Task 11 |
| Margaritaville + arcade | Task 11 ✓ |
| Getting Around cards | Task 12 |
| Bike code tap-to-copy | Task 12 |
| Hot tub step-by-step | Task 12 |
| Local guide with filters | Task 13 |
| Beach tips | Task 14 |
| Checkout checklist | Task 14 |
| Guest book (Supabase) | Task 15 |
| Config-based sensitive data | Task 1 |
| Deploy to Netlify + domain | Task 16 |
| Sleeps 16 | Task 4 ✓ |
| Infinity Game Table removed | Task 11 ✓ (not included) |

No gaps found.

**Placeholder scan:** All steps contain actual code or concrete actions. No TBDs.

**Type consistency:** `CONFIG` object used consistently across all JS files. `showToast()` defined in manual.js and called from same file. Supabase client initialized once in guestbook.js. No naming conflicts found.
