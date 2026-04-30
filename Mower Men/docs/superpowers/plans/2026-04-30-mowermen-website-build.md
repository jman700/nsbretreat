# Mower Men Website Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Mower Men Inc. redesigned marketing website as a static HTML/CSS/JS site matching the approved design spec.

**Architecture:** Pure static site — one HTML file per page, one shared `css/styles.css`, JS files for interactive components (nav, marquee, gallery filter, form validation). Nav and footer are injected via `js/main.js` to avoid copy-pasting across 14 pages. No build step, no framework, no dependencies.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla JavaScript (ES6+), Unsplash stock images (placeholder), Google Fonts (Georgia via `@import` or system serif fallback)

**Spec:** `docs/superpowers/specs/2026-04-30-mowermen-website-redesign.md`

---

## File Map

```
/
├── index.html                  # Homepage
├── gallery.html                # Gallery page
├── about.html                  # About page
├── residential.html            # Residential page
├── estimate.html               # Free Estimate form
├── contact.html                # Contact page
├── services/
│   ├── lawn-grounds.html       # Lawn & Grounds service page
│   ├── landscaping.html        # Landscaping service page
│   ├── irrigation.html         # Irrigation service page
│   ├── fertilizing.html        # Fertilizing service page
│   ├── pavers.html             # Pavers & Hardscape (premium)
│   └── turf.html               # Synthetic Turf (premium)
├── css/
│   └── styles.css              # All styles: design system, layout, components, pages
├── js/
│   ├── main.js                 # Nav injection, footer injection, mobile menu, dropdown
│   ├── marquee.js              # Logo strip auto-scroll (CSS animation + hover pause)
│   ├── gallery.js              # Gallery filter + before/after slider
│   └── estimate.js             # Estimate form validation
└── assets/
    └── images/
        └── logo.png            # Existing Mower Men logo (to be provided by client)
```

---

## Design System Reference

Always use these values — never hardcode colors or sizes outside of styles.css:

```css
/* Colors */
--midnight:    #0a1205;
--deep-forest: #0d1a07;
--forest:      #1a2d0e;
--mid-green:   #2d4a1e;
--leaf-green:  #4a7c2f;
--gold:        #c8a94a;
--cream:       #f5f0e8;
--muted:       #a0b090;

/* Typography */
--font-serif: Georgia, 'Times New Roman', serif;
--font-sans:  Arial, Helvetica, sans-serif;
```

---

## Task 1: Project Scaffold & Design System CSS

**Files:**
- Create: `css/styles.css`
- Create: `index.html` (shell only — content added in Task 4)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p css js assets/images services
```

- [ ] **Step 2: Create `css/styles.css` with full design system**

```css
/* ============================================================
   MOWER MEN — DESIGN SYSTEM
   ============================================================ */

/* --- Reset & Base --- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; scroll-behavior: smooth; }

body {
  background: var(--midnight);
  color: var(--cream);
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img { display: block; max-width: 100%; }
a  { text-decoration: none; color: inherit; }

/* --- CSS Custom Properties --- */
:root {
  --midnight:    #0a1205;
  --deep-forest: #0d1a07;
  --forest:      #1a2d0e;
  --mid-green:   #2d4a1e;
  --leaf-green:  #4a7c2f;
  --gold:        #c8a94a;
  --cream:       #f5f0e8;
  --muted:       #a0b090;

  --font-serif: Georgia, 'Times New Roman', serif;
  --font-sans:  Arial, Helvetica, sans-serif;

  --max-width: 1200px;
  --section-pad: 80px 24px;
  --card-radius: 6px;
  --transition: 0.2s ease;
}

/* --- Container --- */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
}

/* --- Typography --- */
h1, h2, h3, h4 { font-family: var(--font-serif); font-weight: 700; color: var(--cream); line-height: 1.15; }
h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
h3 { font-size: 1.1rem; }

.eyebrow {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 12px;
}

.section-title { margin-bottom: 8px; }

.subtitle {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.8;
  max-width: 560px;
}

.gold-rule {
  width: 56px;
  height: 3px;
  background: var(--gold);
  margin: 16px 0 24px;
}

/* --- Buttons --- */
.btn {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.125em;
  text-transform: uppercase;
  padding: 13px 28px;
  border-radius: 3px;
  cursor: pointer;
  border: none;
  transition: opacity var(--transition);
}
.btn:hover { opacity: 0.85; }

.btn-primary   { background: var(--gold);       color: var(--deep-forest); }
.btn-outline   { background: transparent;        color: var(--gold);  border: 1px solid var(--gold); }
.btn-green     { background: var(--leaf-green);  color: var(--cream); }
.btn-sm        { padding: 9px 18px; font-size: 0.5625rem; }

/* --- Section Wrapper --- */
.section {
  padding: var(--section-pad);
}
.section--dark    { background: var(--deep-forest); }
.section--darker  { background: var(--midnight); }
.section--forest  { background: var(--forest); }
.section-header   { text-align: center; margin-bottom: 48px; }
.section-header .subtitle { margin: 0 auto; }

/* --- Cards --- */
.card {
  background: var(--deep-forest);
  border: 1px solid var(--mid-green);
  border-top: 3px solid var(--leaf-green);
  border-radius: var(--card-radius);
  padding: 28px;
}

.card--gold {
  border-color: var(--gold);
  border-top-color: var(--gold);
  position: relative;
}

.card__badge {
  position: absolute;
  top: -11px;
  right: 16px;
  background: var(--gold);
  color: var(--deep-forest);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 10px;
}

.card__icon {
  width: 36px;
  height: 36px;
  border: 1px solid var(--mid-green);
  border-radius: 4px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card--gold .card__icon { border-color: var(--gold); }

.card h3     { font-size: 1rem; margin-bottom: 10px; }
.card p      { font-size: 0.6875rem; color: var(--muted); line-height: 1.7; margin-bottom: 16px; }
.card .link  { font-size: 0.5625rem; color: var(--gold); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.card .link:hover { text-decoration: underline; }

/* --- Grid Layouts --- */
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

/* --- Trust Bar --- */
.trust-bar {
  background: var(--deep-forest);
  border-top: 2px solid var(--forest);
  border-bottom: 2px solid var(--forest);
  padding: 28px 24px;
}
.trust-bar__inner {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}
.trust-stat { text-align: center; }
.trust-stat__value {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--gold);
  display: block;
}
.trust-stat__label {
  font-size: 0.5625rem;
  color: var(--muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 4px;
}
.trust-divider {
  width: 1px;
  height: 40px;
  background: var(--mid-green);
}

/* --- Testimonial Cards --- */
.testimonial {
  background: var(--deep-forest);
  border: 1px solid var(--mid-green);
  border-radius: var(--card-radius);
  padding: 28px;
}
.testimonial__quote {
  font-family: var(--font-serif);
  font-size: 2rem;
  color: var(--gold);
  line-height: 1;
  margin-bottom: 12px;
}
.testimonial__text {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.8;
  font-style: italic;
  margin-bottom: 20px;
}
.testimonial__author {
  display: flex;
  align-items: center;
  gap: 12px;
}
.testimonial__avatar {
  width: 36px;
  height: 36px;
  background: var(--forest);
  border: 1px solid var(--mid-green);
  border-radius: 50%;
  flex-shrink: 0;
}
.testimonial__name  { font-size: 0.6875rem; color: var(--gold); font-weight: 700; }
.testimonial__role  { font-size: 0.5625rem; color: #666; margin-top: 2px; }

/* --- Bullet List --- */
.bullet-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.bullet-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.6;
}
.bullet-list li::before {
  content: '';
  width: 7px;
  height: 7px;
  background: var(--gold);
  border-radius: 50%;
  flex-shrink: 0;
}

/* --- CTA Banner --- */
.cta-banner {
  position: relative;
  padding: 80px 24px;
  text-align: center;
  background: var(--forest);
}
.cta-banner__bg {
  position: absolute;
  inset: 0;
  background-image: var(--bg-url);
  background-size: cover;
  background-position: center;
  opacity: 0.18;
}
.cta-banner__content { position: relative; z-index: 1; }
.cta-banner h2       { margin-bottom: 12px; }
.cta-banner p        { color: var(--muted); font-size: 0.8125rem; margin-bottom: 28px; }
.cta-banner .btns    { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }

/* --- Hero --- */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  background-size: cover;
  background-position: center;
}
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(10,18,5,0.92) 55%, rgba(10,18,5,0.6));
}
.hero__content {
  position: relative;
  z-index: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 120px 24px 80px;
  max-width: 680px;
}
.hero h1          { margin-bottom: 0; }
.hero .subtitle   { margin: 20px 0 32px; font-size: 0.875rem; }
.hero .btns       { display: flex; gap: 16px; flex-wrap: wrap; }

/* --- Service Hero (inner pages) --- */
.service-hero {
  position: relative;
  padding: 140px 24px 80px;
  background-size: cover;
  background-position: center;
}
.service-hero__overlay {
  position: absolute;
  inset: 0;
  background: rgba(10,18,5,0.8);
}
.service-hero__content { position: relative; z-index: 1; max-width: var(--max-width); margin: 0 auto; }
.service-hero h1 { font-size: clamp(1.75rem, 4vw, 2.75rem); }
.service-hero .subtitle { margin-top: 16px; }

/* --- What's Included (service pages) --- */
.included-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.included-item {
  background: var(--forest);
  border: 1px solid var(--mid-green);
  border-radius: var(--card-radius);
  padding: 20px;
}
.included-item h4      { font-size: 0.875rem; margin-bottom: 6px; }
.included-item p       { font-size: 0.6875rem; color: var(--muted); line-height: 1.6; }

/* --- Gallery --- */
.gallery-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}
.filter-btn {
  padding: 7px 18px;
  border: 1px solid var(--mid-green);
  border-radius: 3px;
  background: transparent;
  color: var(--muted);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all var(--transition);
}
.filter-btn:hover,
.filter-btn.active {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--deep-forest);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.gallery-item {
  border-radius: var(--card-radius);
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--forest);
  transition: transform var(--transition);
}
.gallery-item:hover { transform: scale(1.02); }
.gallery-item img   { width: 100%; height: 100%; object-fit: cover; }
.gallery-item[hidden] { display: none; }

/* --- Before/After Slider --- */
.before-after {
  position: relative;
  max-width: 800px;
  margin: 48px auto 0;
  overflow: hidden;
  border-radius: var(--card-radius);
  cursor: ew-resize;
  user-select: none;
}
.before-after__after,
.before-after__before { position: absolute; inset: 0; }
.before-after__after img,
.before-after__before img { width: 100%; height: 100%; object-fit: cover; }
.before-after__before { clip-path: inset(0 50% 0 0); }
.before-after__handle {
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  width: 3px;
  background: var(--gold);
  transform: translateX(-50%);
  z-index: 2;
}
.before-after__handle::before,
.before-after__handle::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  background: var(--gold);
  border-radius: 50%;
}
.before-after__handle::before { top: calc(50% - 18px); }
.before-after__label {
  position: absolute;
  bottom: 16px;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(10,18,5,0.75);
  color: var(--cream);
  padding: 4px 10px;
  border-radius: 3px;
}
.before-after__label--before { left: 16px; }
.before-after__label--after  { right: 16px; }

/* --- Marquee --- */
.marquee-section { background: var(--midnight); padding: 36px 0; overflow: hidden; }
.marquee-label {
  text-align: center;
  font-size: 0.5625rem;
  color: #444;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.marquee-track {
  display: flex;
  gap: 48px;
  animation: marquee 30s linear infinite;
  width: max-content;
}
.marquee-track:hover { animation-play-state: paused; }
.marquee-logo {
  background: var(--forest);
  border: 1px solid var(--mid-green);
  border-radius: 4px;
  padding: 12px 24px;
  font-family: var(--font-serif);
  font-size: 0.8125rem;
  color: var(--leaf-green);
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* --- Forms --- */
.form-group { margin-bottom: 20px; }
.form-group label {
  display: block;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 6px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  background: var(--forest);
  border: 1px solid var(--mid-green);
  border-radius: 3px;
  padding: 12px 14px;
  color: var(--cream);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  transition: border-color var(--transition);
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--gold);
}
.form-group textarea { min-height: 120px; resize: vertical; }
.form-group select option { background: var(--deep-forest); }
.form-group--error input,
.form-group--error select,
.form-group--error textarea { border-color: #c0392b; }
.form-error-msg { font-size: 0.625rem; color: #e74c3c; margin-top: 4px; }

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--muted);
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] { accent-color: var(--gold); width: 14px; height: 14px; }

/* --- Contact Info Block --- */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}
.contact-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}
.contact-info-item .label {
  font-size: 0.5625rem;
  color: var(--gold);
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.contact-info-item .value { font-size: 0.9375rem; color: var(--cream); }
.contact-info-item .value a:hover { color: var(--gold); }

.map-embed {
  width: 100%;
  height: 320px;
  border: 1px solid var(--mid-green);
  border-radius: var(--card-radius);
  filter: grayscale(0.6) invert(0.9) hue-rotate(90deg);
}

/* --- Footer --- */
.site-footer {
  background: var(--midnight);
  border-top: 1px solid var(--forest);
  padding: 48px 24px 24px;
}
.footer-grid {
  max-width: var(--max-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--forest);
}
.footer-col__heading {
  font-size: 0.5625rem;
  color: var(--gold);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.footer-col p,
.footer-col a {
  font-size: 0.6875rem;
  color: #555;
  line-height: 2;
  display: block;
}
.footer-col a:hover { color: var(--gold); }
.footer-brand { font-family: var(--font-serif); font-size: 1rem; font-weight: 700; color: var(--cream); margin-bottom: 10px; }
.footer-bottom {
  max-width: var(--max-width);
  margin: 20px auto 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.5625rem;
  color: #333;
}

/* --- About Page --- */
.about-story { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.credentials-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}
.credential-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--forest);
  border: 1px solid var(--mid-green);
  border-radius: var(--card-radius);
}
.credential-item__dot {
  width: 8px; height: 8px;
  background: var(--gold);
  border-radius: 50%;
  flex-shrink: 0;
}
.credential-item__text { font-size: 0.75rem; color: var(--muted); }

/* --- Scroll Fade Animation --- */
.fade-in { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
.fade-in.visible { opacity: 1; transform: translateY(0); }

/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  :root { --section-pad: 56px 20px; }
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr; }
  .about-story { grid-template-columns: 1fr; }
  .contact-grid { grid-template-columns: 1fr; }
  .trust-divider { display: none; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .hero__content { padding: 120px 20px 60px; }
  .cta-banner .btns { flex-direction: column; align-items: center; }
}

@media (max-width: 480px) {
  .grid-4 { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.875rem; }
  .gallery-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Create `index.html` shell to verify styles load**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mower Men Inc. — Orlando's Premier Commercial Grounds Company</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="nav-placeholder"></div>
  <main>
    <p style="color:var(--gold); padding:2rem;">Design system loading correctly.</p>
  </main>
  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify in browser**

Open `index.html` directly in browser. Expected: black/dark green background, gold text reading "Design system loading correctly." If background is white, styles.css is not linked correctly — check the path.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css index.html
git commit -m "feat: add design system CSS and index shell"
```

---

## Task 2: Shared Nav + Footer (JS-Injected)

**Files:**
- Create: `js/main.js`

The nav and footer HTML are defined once in `main.js` and injected into every page's `#nav-placeholder` and `#footer-placeholder` divs. This means updating the nav once updates all 14 pages.

- [ ] **Step 1: Add nav/footer CSS to `css/styles.css`**

Append to end of `css/styles.css`:

```css
/* --- Nav --- */
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(13, 26, 7, 0.97);
  border-bottom: 1px solid var(--forest);
  backdrop-filter: blur(8px);
}
.nav-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
  height: 68px;
  display: flex;
  align-items: center;
  gap: 32px;
}
.nav-logo {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 700;
  color: var(--cream);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  margin-right: auto;
}
.nav-logo img { height: 40px; width: auto; }
.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
  list-style: none;
}
.nav-links a {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  transition: color var(--transition);
}
.nav-links a:hover { color: var(--cream); }

/* Dropdown */
.nav-dropdown { position: relative; }
.nav-dropdown__toggle { cursor: pointer; }
.nav-dropdown__toggle::after { content: ' ▾'; font-size: 0.5rem; }
.nav-dropdown__menu {
  display: none;
  position: absolute;
  top: calc(100% + 16px);
  left: -12px;
  background: var(--deep-forest);
  border: 1px solid var(--mid-green);
  border-radius: 4px;
  padding: 8px 0;
  min-width: 200px;
  z-index: 10;
}
.nav-dropdown:hover .nav-dropdown__menu,
.nav-dropdown__menu:hover { display: block; }
.nav-dropdown__menu a {
  display: block;
  padding: 8px 18px;
  font-size: 0.625rem;
  color: var(--muted);
  transition: background var(--transition), color var(--transition);
}
.nav-dropdown__menu a:hover { background: var(--forest); color: var(--cream); }
.nav-dropdown__menu .divider { height: 1px; background: var(--mid-green); margin: 4px 0; }
.nav-dropdown__menu a.gold { color: var(--gold); }
.nav-dropdown__menu a.gold:hover { background: rgba(200,169,74,0.1); }

/* Nav phone + CTA */
.nav-phone {
  font-size: 0.6875rem;
  color: var(--muted);
  white-space: nowrap;
}
.nav-phone a:hover { color: var(--gold); }
.nav-cta { margin-left: 8px; }

/* Mobile toggle */
.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-direction: column;
  gap: 5px;
}
.nav-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--cream);
  border-radius: 2px;
  transition: all 0.3s;
}

@media (max-width: 900px) {
  .nav-toggle { display: flex; margin-left: auto; }
  .nav-phone  { display: none; }
  .nav-links  {
    display: none;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    position: absolute;
    top: 68px; left: 0; right: 0;
    background: var(--deep-forest);
    border-bottom: 1px solid var(--mid-green);
    padding: 16px 24px;
  }
  .nav-links.open { display: flex; }
  .nav-links li   { width: 100%; }
  .nav-links a    { padding: 12px 0; display: block; border-bottom: 1px solid var(--forest); }
  .nav-dropdown__menu {
    display: none !important; /* handled by JS on mobile */
    position: static;
    border: none;
    background: transparent;
    padding: 0 0 0 16px;
  }
  .nav-cta { width: 100%; text-align: center; padding: 12px 0; }
  .nav-cta .btn { width: 100%; text-align: center; }
}
```

- [ ] **Step 2: Create `js/main.js`**

```javascript
(function () {
  var NAV_HTML = `
<nav class="site-nav">
  <div class="nav-inner">
    <a href="/index.html" class="nav-logo">Mower Men Inc.</a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/index.html">Home</a></li>
      <li class="nav-dropdown">
        <span class="nav-dropdown__toggle">Services</span>
        <div class="nav-dropdown__menu">
          <a href="/services/lawn-grounds.html">Lawn &amp; Grounds</a>
          <a href="/services/landscaping.html">Landscaping</a>
          <a href="/services/irrigation.html">Irrigation</a>
          <a href="/services/fertilizing.html">Fertilizing</a>
          <div class="divider"></div>
          <a href="/services/pavers.html" class="gold">Pavers &amp; Hardscape</a>
          <a href="/services/turf.html" class="gold">Synthetic Turf</a>
        </div>
      </li>
      <li><a href="/gallery.html">Gallery</a></li>
      <li><a href="/about.html">About</a></li>
      <li><a href="/residential.html">Residential</a></li>
      <li><a href="/contact.html">Contact</a></li>
      <li class="nav-cta"><a href="/estimate.html" class="btn btn-primary btn-sm">Free Estimate</a></li>
    </ul>
    <span class="nav-phone"><a href="tel:4072519347">407.251.9347</a></span>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>`;

  var FOOTER_HTML = `
<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-col">
      <div class="footer-brand">Mower Men Inc.</div>
      <p>Orlando's premier commercial grounds maintenance company. Family-owned and operated since 1990.</p>
      <p style="margin-top:12px;">BBB Accredited · Licensed &amp; Insured</p>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Services</div>
      <a href="/services/lawn-grounds.html">Lawn &amp; Grounds</a>
      <a href="/services/landscaping.html">Landscaping</a>
      <a href="/services/irrigation.html">Irrigation</a>
      <a href="/services/fertilizing.html">Fertilizing</a>
      <a href="/services/pavers.html">Pavers &amp; Hardscape</a>
      <a href="/services/turf.html">Synthetic Turf</a>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Company</div>
      <a href="/about.html">About Us</a>
      <a href="/gallery.html">Gallery</a>
      <a href="/residential.html">Residential</a>
      <a href="/contact.html">Contact</a>
      <a href="/estimate.html">Free Estimate</a>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Contact</div>
      <a href="tel:4072519347">407.251.9347</a>
      <a href="mailto:sales@mowermen.com">sales@mowermen.com</a>
      <p>5485 S. Orange Blossom Trail</p>
      <p>Orlando, FL 32839</p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2025 Mower Men Inc. All rights reserved.</span>
    <span>Licensed &amp; Insured · Est. 1990</span>
  </div>
</footer>`;

  function inject() {
    var navEl = document.getElementById('nav-placeholder');
    var footerEl = document.getElementById('footer-placeholder');
    if (navEl)    navEl.outerHTML = NAV_HTML;
    if (footerEl) footerEl.outerHTML = FOOTER_HTML;
  }

  function initMobileMenu() {
    var toggle = document.getElementById('navToggle');
    var links  = document.getElementById('navLinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  function initScrollFade() {
    var els = document.querySelectorAll('.fade-in');
    if (!els.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { observer.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    inject();
    initMobileMenu();
    initScrollFade();
  });
})();
```

- [ ] **Step 3: Verify nav and footer render**

Open `index.html` in browser. Expected:
- Fixed dark nav bar at top with "Mower Men Inc." logo text, nav links, and "Free Estimate" gold button
- Footer at bottom with 4 columns
- On mobile (resize to < 900px): hamburger button appears, links collapse, tapping hamburger reveals menu

- [ ] **Step 4: Commit**

```bash
git add js/main.js css/styles.css
git commit -m "feat: add shared nav and footer with mobile menu"
```

---

## Task 3: Homepage

**Files:**
- Modify: `index.html`
- Create: `js/marquee.js`

Note: The marquee animation is pure CSS (`@keyframes marquee` in styles.css). `marquee.js` only handles duplicating the track contents so the loop is seamless.

- [ ] **Step 1: Create `js/marquee.js`**

```javascript
document.addEventListener('DOMContentLoaded', function () {
  var track = document.querySelector('.marquee-track');
  if (!track) return;
  // Duplicate contents so CSS infinite loop is seamless
  track.innerHTML += track.innerHTML;
});
```

- [ ] **Step 2: Write full `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mower Men Inc. — Orlando's Premier Commercial Grounds Company</title>
  <meta name="description" content="Orlando's most trusted commercial grounds maintenance company. Serving hotels, resorts, HOAs, and restaurants since 1990. Lawn care, landscaping, pavers, and turf.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <!-- HERO -->
    <section class="hero" style="background-image: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop');">
      <div class="hero__overlay"></div>
      <div class="hero__content">
        <span class="eyebrow">Est. 1990 · Orlando's Premier Commercial Grounds Company</span>
        <h1>Orlando's Most Trusted Commercial Grounds Maintenance.</h1>
        <div class="gold-rule"></div>
        <p class="subtitle">From luxury resorts to HOA communities — 35 years of exceptional grounds care, delivered with the highest professional standards in Central Florida.</p>
        <div class="btns">
          <a href="/estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">407.251.9347</a>
        </div>
      </div>
    </section>

    <!-- TRUST BAR -->
    <div class="trust-bar">
      <div class="trust-bar__inner">
        <div class="trust-stat">
          <span class="trust-stat__value">35+</span>
          <span class="trust-stat__label">Years in Business</span>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-stat">
          <span class="trust-stat__value">BBB</span>
          <span class="trust-stat__label">Accredited Since 1990</span>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-stat">
          <span class="trust-stat__value">Licensed</span>
          <span class="trust-stat__label">&amp; Fully Insured</span>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-stat">
          <span class="trust-stat__value">500+</span>
          <span class="trust-stat__label">Properties Maintained</span>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-stat">
          <span class="trust-stat__value">Award</span>
          <span class="trust-stat__label">Winning Service</span>
        </div>
      </div>
    </div>

    <!-- SERVICE SPOTLIGHT -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">What We Do</span>
          <h2 class="section-title">Comprehensive Grounds Services</h2>
        </div>
        <div class="grid-3">
          <div class="card fade-in">
            <div class="card__icon"></div>
            <h3>Lawn &amp; Grounds Maintenance</h3>
            <p>Mowing, edging, trimming, and weed control executed to the highest commercial standard — every visit, without exception.</p>
            <a href="/services/lawn-grounds.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card fade-in">
            <div class="card__icon"></div>
            <h3>Landscaping &amp; Design</h3>
            <p>Flower beds, shrubs, sod installation, and full landscape design that transforms any property into a showcase.</p>
            <a href="/services/landscaping.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card card--gold fade-in">
            <span class="card__badge">Now Offering</span>
            <div class="card__icon"></div>
            <h3>Pavers &amp; Synthetic Turf</h3>
            <p>Premium hardscape installation and low-maintenance synthetic turf — built to last and designed to impress any property.</p>
            <a href="/services/pavers.html" class="link">Learn More &rarr;</a>
          </div>
        </div>
      </div>
    </section>

    <!-- COMMERCIAL FOCUS -->
    <section class="section section--dark">
      <div class="container">
        <div class="grid-2" style="align-items:center;">
          <div class="fade-in">
            <span class="eyebrow">Built for Commercial Properties</span>
            <h2 class="section-title">The standard your property deserves.</h2>
            <div class="gold-rule"></div>
            <p class="subtitle" style="margin-bottom:28px;">We specialize in maintaining the grounds of Orlando's most demanding commercial properties — where appearance directly impacts your business reputation.</p>
            <ul class="bullet-list">
              <li>Luxury Hotels &amp; Resorts</li>
              <li>HOA &amp; Condominium Communities</li>
              <li>Restaurants &amp; Retail Centers</li>
              <li>Apartment Complexes</li>
            </ul>
            <a href="/estimate.html" class="btn btn-primary" style="margin-top:28px;">Get a Free Estimate</a>
          </div>
          <div class="fade-in" style="border-radius:var(--card-radius); overflow:hidden; border:1px solid var(--mid-green);">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop" alt="Commercial property grounds" style="width:100%; height:360px; object-fit:cover;">
          </div>
        </div>
      </div>
    </section>

    <!-- CLIENT LOGOS MARQUEE -->
    <div class="marquee-section">
      <div class="marquee-label">A Few of Our Clients &amp; Partners</div>
      <div class="marquee-track">
        <div class="marquee-logo">Marriott</div>
        <div class="marquee-logo">Orange County HOA Alliance</div>
        <div class="marquee-logo">Hilton</div>
        <div class="marquee-logo">Camden Property Trust</div>
        <div class="marquee-logo">Darden Restaurants</div>
        <div class="marquee-logo">Aimco Apartments</div>
        <div class="marquee-logo">Wyndham Hotels</div>
        <div class="marquee-logo">Greystar</div>
      </div>
    </div>

    <!-- TESTIMONIALS -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">Client Feedback</span>
          <h2 class="section-title">What Our Clients Say</h2>
        </div>
        <div class="grid-3">
          <div class="testimonial fade-in">
            <div class="testimonial__quote">&ldquo;</div>
            <p class="testimonial__text">Mower Men has maintained our resort grounds for over 10 years. The consistency and professionalism is unmatched in Central Florida.</p>
            <div class="testimonial__author">
              <div class="testimonial__avatar"></div>
              <div>
                <div class="testimonial__name">J. Martinez</div>
                <div class="testimonial__role">Director of Facilities, Lakeside Resort &bull; Placeholder</div>
              </div>
            </div>
          </div>
          <div class="testimonial fade-in">
            <div class="testimonial__quote">&ldquo;</div>
            <p class="testimonial__text">Our HOA community has never looked better. They show up on time, every time, and the attention to detail sets them apart from every other vendor we've tried.</p>
            <div class="testimonial__author">
              <div class="testimonial__avatar"></div>
              <div>
                <div class="testimonial__name">R. Thompson</div>
                <div class="testimonial__role">HOA Board President, Windermere Estates &bull; Placeholder</div>
              </div>
            </div>
          </div>
          <div class="testimonial fade-in">
            <div class="testimonial__quote">&ldquo;</div>
            <p class="testimonial__text">The paver installation they did for our restaurant patio exceeded every expectation. Guests compliment it constantly — it was the best investment we've made.</p>
            <div class="testimonial__author">
              <div class="testimonial__avatar"></div>
              <div>
                <div class="testimonial__name">A. Pereira</div>
                <div class="testimonial__role">Owner, Harvest Table Restaurant &bull; Placeholder</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA BANNER -->
    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <span class="eyebrow" style="justify-content:center; display:block;">Get Started Today</span>
        <h2>Ready to Elevate Your Property?</h2>
        <p>Get a free, no-obligation estimate. We respond within one business day.</p>
        <div class="btns">
          <a href="/estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
  <script src="js/marquee.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify homepage in browser**

Open `index.html`. Check:
1. Hero fills full viewport height with dark overlay over landscape image, headline and dual buttons visible
2. Trust bar shows 5 stats with gold numbers and dividers between them
3. Service spotlight shows 3 cards — first two with green top border, third with gold border and "Now Offering" badge
4. Commercial section shows text on left, image on right
5. Marquee scrolls logos continuously; stops on hover
6. Three testimonials in a row with gold quote marks
7. CTA banner at bottom with subtle background image
8. Scroll down slowly — `.fade-in` elements animate into view
9. No emojis anywhere on the page

- [ ] **Step 4: Commit**

```bash
git add index.html js/marquee.js
git commit -m "feat: build homepage with all 7 sections"
```

---

## Task 4: Service Page Template + Standard Service Pages

**Files:**
- Create: `services/lawn-grounds.html`
- Create: `services/landscaping.html`
- Create: `services/irrigation.html`
- Create: `services/fertilizing.html`

All four follow the same template. Build lawn-grounds.html first, verify it works, then replicate with different content for the other three.

- [ ] **Step 1: Build `services/lawn-grounds.html`**

Note: All asset paths use `../` since this file is one level deep.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lawn &amp; Grounds Maintenance — Mower Men Inc.</title>
  <meta name="description" content="Commercial and residential lawn maintenance in Orlando. Mowing, edging, trimming, and weed control by Mower Men Inc. — serving Central Florida since 1990.">
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop');">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">Our Services</span>
        <h1>Lawn &amp; Grounds Maintenance</h1>
        <p class="subtitle">Consistent, meticulous care for commercial and residential properties across Central Florida.</p>
        <a href="../estimate.html" class="btn btn-primary" style="margin-top:24px;">Get a Free Estimate</a>
      </div>
    </div>

    <!-- What's Included -->
    <section class="section section--dark">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">The Service</span>
          <h2 class="section-title">What's Included</h2>
          <p class="subtitle">Every visit is executed to the same high standard — no shortcuts, no exceptions.</p>
        </div>
        <div class="included-grid fade-in">
          <div class="included-item">
            <h4>Mowing</h4>
            <p>Precision mowing at the correct height for your turf type, ensuring a clean, even finish across the entire property.</p>
          </div>
          <div class="included-item">
            <h4>Edging</h4>
            <p>Sharp, defined edges along walkways, driveways, and beds — the detail that separates professional from ordinary.</p>
          </div>
          <div class="included-item">
            <h4>Trimming</h4>
            <p>Trimming around all obstacles, structures, and hard-to-reach areas that mowers cannot access.</p>
          </div>
          <div class="included-item">
            <h4>Weed Control</h4>
            <p>Proactive weed management in turf areas and beds to maintain a clean, polished appearance year-round.</p>
          </div>
          <div class="included-item">
            <h4>Cleanup &amp; Blowout</h4>
            <p>All clippings cleared from hard surfaces — sidewalks, parking lots, and entryways — before we leave the property.</p>
          </div>
          <div class="included-item">
            <h4>Scheduled Programs</h4>
            <p>Weekly, bi-weekly, or custom schedules tailored to your property's needs and budget.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Who We Serve -->
    <section class="section section--forest">
      <div class="container">
        <div class="grid-2" style="align-items:center;">
          <div class="fade-in">
            <span class="eyebrow">Commercial &amp; Residential</span>
            <h2 class="section-title">Built for properties that can't afford to look anything less than perfect.</h2>
            <div class="gold-rule"></div>
            <ul class="bullet-list">
              <li>Hotels, Resorts &amp; Hospitality Properties</li>
              <li>HOA &amp; Condominium Communities</li>
              <li>Restaurants, Retail &amp; Commercial Centers</li>
              <li>Apartment &amp; Multi-Family Complexes</li>
              <li>Residential Homes</li>
            </ul>
          </div>
          <div class="fade-in" style="border-radius:var(--card-radius); overflow:hidden; border:1px solid var(--mid-green);">
            <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop" alt="Manicured commercial grounds" style="width:100%; height:320px; object-fit:cover;">
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>Ready to Elevate Your Property?</h2>
        <p>Get a free, no-obligation estimate. We respond within one business day.</p>
        <div class="btns">
          <a href="../estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="../js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify `services/lawn-grounds.html` in browser**

Open `services/lawn-grounds.html`. Check:
1. Nav and footer render with correct `../` paths
2. Hero has dark overlay and correct headline
3. "What's Included" grid shows 6 items
4. CTA banner at bottom

- [ ] **Step 3: Create `services/landscaping.html`**

Copy `lawn-grounds.html`. Change:
- `<title>` → `Landscaping &amp; Design — Mower Men Inc.`
- `<meta name="description">` → `Commercial and residential landscaping and design in Orlando. Flower beds, shrubs, sod, and full landscape design by Mower Men Inc.`
- Hero `<h1>` → `Landscaping &amp; Design`
- Hero subtitle → `Transforming properties with expert landscape design, installation, and ongoing care.`
- Hero background image → `https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=1600&auto=format&fit=crop`
- "What's Included" items:

```html
<div class="included-item"><h4>Landscape Design</h4><p>Custom design plans that enhance curb appeal, complement architecture, and work with Florida's climate.</p></div>
<div class="included-item"><h4>Flower Bed Installation</h4><p>Seasonal color rotations and permanent plantings designed for year-round beauty and minimal maintenance.</p></div>
<div class="included-item"><h4>Shrub &amp; Hedge Care</h4><p>Shaping, trimming, and maintenance of shrubs and hedges to defined, polished lines.</p></div>
<div class="included-item"><h4>Sod Installation</h4><p>Full sod replacement and installation with proper soil preparation for lasting results.</p></div>
<div class="included-item"><h4>Tree Services</h4><p>Planting, mulching, and routine care for trees and large ornamental plants.</p></div>
<div class="included-item"><h4>Mulching</h4><p>Fresh mulch application in beds and tree rings to retain moisture, suppress weeds, and improve appearance.</p></div>
```

- Section 2 h2 → `Landscape design that makes your property the standard others are measured by.`

- [ ] **Step 4: Create `services/irrigation.html`**

Copy `lawn-grounds.html`. Change:
- `<title>` → `Irrigation Systems — Mower Men Inc.`
- `<meta name="description">` → `Irrigation system installation, inspection, and repair in Orlando by Mower Men Inc. Serving commercial and residential properties since 1990.`
- Hero `<h1>` → `Irrigation Systems`
- Hero subtitle → `Installation, inspection, and repair of commercial and residential irrigation systems across Central Florida.`
- Hero image → `https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&auto=format&fit=crop`
- "What's Included" items:

```html
<div class="included-item"><h4>System Installation</h4><p>Full design and installation of irrigation systems tailored to your property's layout and water requirements.</p></div>
<div class="included-item"><h4>Inspection &amp; Auditing</h4><p>Comprehensive system audits to identify coverage gaps, broken heads, and inefficiencies.</p></div>
<div class="included-item"><h4>Repairs &amp; Replacements</h4><p>Fast diagnosis and repair of broken heads, valves, controllers, and underground lines.</p></div>
<div class="included-item"><h4>Backflow Testing</h4><p>Certified backflow prevention testing and certification to meet Florida requirements.</p></div>
<div class="included-item"><h4>Controller Programming</h4><p>Seasonal schedule adjustments to maximize efficiency and meet water restriction guidelines.</p></div>
<div class="included-item"><h4>Maintenance Programs</h4><p>Ongoing service agreements to keep systems running at peak performance year-round.</p></div>
```

- Section 2 h2 → `Reliable irrigation means healthier grounds and lower water costs.`

- [ ] **Step 5: Create `services/fertilizing.html`**

Copy `lawn-grounds.html`. Change:
- `<title>` → `Fertilizing Programs — Mower Men Inc.`
- `<meta name="description">` → `Commercial and residential lawn fertilizing programs in Orlando. Custom soil treatment by Mower Men Inc. since 1990.`
- Hero `<h1>` → `Fertilizing Programs`
- Hero subtitle → `Customized fertilization schedules that keep commercial and residential properties lush, green, and healthy year-round.`
- Hero image → `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&auto=format&fit=crop`
- "What's Included" items:

```html
<div class="included-item"><h4>Soil Analysis</h4><p>Pre-treatment soil testing to determine exact nutrient needs and pH levels for your specific turf type.</p></div>
<div class="included-item"><h4>Custom Fertilization</h4><p>Tailored fertilizer blends and application schedules for Florida's unique climate and soil conditions.</p></div>
<div class="included-item"><h4>Weed Prevention</h4><p>Pre-emergent and post-emergent weed control treatments applied on a scheduled program.</p></div>
<div class="included-item"><h4>Pest Control</h4><p>Integrated pest management to address chinch bugs, grubs, and other common Florida turf pests.</p></div>
<div class="included-item"><h4>Seasonal Programs</h4><p>Year-round programs adjusted for Florida's distinct wet and dry seasons to maintain consistent results.</p></div>
<div class="included-item"><h4>Application Records</h4><p>Full documentation of all treatments applied — important for HOA compliance and property records.</p></div>
```

- Section 2 h2 → `Healthy turf starts below the surface. We handle both.`

- [ ] **Step 6: Verify all four service pages**

Open each page in browser. Check: nav renders, hero headline is correct, "What's Included" has 6 items, no emojis, footer renders.

- [ ] **Step 7: Commit**

```bash
git add services/
git commit -m "feat: add four standard service pages"
```

---

## Task 5: Pavers & Hardscape Page (Premium Treatment)

**Files:**
- Create: `services/pavers.html`

Pavers gets extra content: a "Why Pavers?" section and a photo showcase strip.

- [ ] **Step 1: Create `services/pavers.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pavers &amp; Hardscape Installation — Mower Men Inc.</title>
  <meta name="description" content="Professional paver and hardscape installation in Orlando. Driveways, patios, walkways, and pool decks by Mower Men Inc. Commercial and residential.">
  <link rel="stylesheet" href="../css/styles.css">
  <style>
    .pavers-showcase {
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 8px;
      height: 400px;
      border-radius: var(--card-radius);
      overflow: hidden;
    }
    .pavers-showcase__main { grid-row: 1 / 3; }
    .pavers-showcase img   { width: 100%; height: 100%; object-fit: cover; }
  </style>
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <!-- Hero — gold accent to match homepage "Now Offering" treatment -->
    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop'); border-bottom: 3px solid var(--gold);">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow" style="color:var(--gold);">Now Offering · Premium Installation</span>
        <h1>Pavers &amp; Hardscape</h1>
        <p class="subtitle">Premium paver installation for commercial and residential properties — driveways, patios, walkways, pool decks, and more. Built to last. Designed to impress.</p>
        <a href="../estimate.html" class="btn btn-primary" style="margin-top:24px;">Get a Free Estimate</a>
      </div>
    </div>

    <!-- Why Pavers -->
    <section class="section section--dark">
      <div class="container">
        <div class="grid-2" style="align-items:center; gap:56px;">
          <div class="fade-in">
            <span class="eyebrow">Why Choose Pavers</span>
            <h2 class="section-title">A permanent upgrade your property will benefit from for decades.</h2>
            <div class="gold-rule"></div>
            <p class="subtitle" style="margin-bottom:24px;">Unlike poured concrete or asphalt, pavers are individually replaceable, frost-resistant, and dramatically increase curb appeal and property value.</p>
            <ul class="bullet-list">
              <li>Stronger and longer-lasting than poured concrete</li>
              <li>Individual units are replaceable — no full resurfacing</li>
              <li>Permeable options available for water management</li>
              <li>Dramatically increases property and resale value</li>
              <li>Available in dozens of styles, colors, and patterns</li>
            </ul>
          </div>
          <div class="pavers-showcase fade-in">
            <div class="pavers-showcase__main">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop" alt="Paver driveway installation">
            </div>
            <div>
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop" alt="Paver patio">
            </div>
            <div>
              <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&auto=format&fit=crop" alt="Paver walkway">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- What's Included -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">What We Install</span>
          <h2 class="section-title">Applications &amp; Services</h2>
        </div>
        <div class="included-grid fade-in">
          <div class="included-item">
            <h4>Driveways</h4>
            <p>Heavy-duty paver driveways engineered for vehicle loads with proper base preparation and drainage.</p>
          </div>
          <div class="included-item">
            <h4>Patios &amp; Outdoor Living</h4>
            <p>Custom patio designs that extend your living or entertaining space with lasting beauty.</p>
          </div>
          <div class="included-item">
            <h4>Pool Decks</h4>
            <p>Non-slip, heat-resistant pavers designed for pool environments — safe, stylish, and durable.</p>
          </div>
          <div class="included-item">
            <h4>Walkways &amp; Paths</h4>
            <p>Defined pedestrian pathways that enhance property flow and add a premium finished look.</p>
          </div>
          <div class="included-item">
            <h4>Retaining Walls</h4>
            <p>Structural and decorative retaining walls for elevation changes, garden beds, and erosion control.</p>
          </div>
          <div class="included-item">
            <h4>Commercial Plazas</h4>
            <p>Large-scale hardscape for hotel entrances, restaurant courtyards, HOA common areas, and retail centers.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>Ready to Transform Your Property?</h2>
        <p>Get a free paver installation estimate. We respond within one business day.</p>
        <div class="btns">
          <a href="../estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="../js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Open `services/pavers.html`. Check:
- Hero has gold bottom border and "Now Offering · Premium Installation" eyebrow in gold
- Photo showcase grid shows on right side of "Why Pavers" section
- All six application cards render correctly

- [ ] **Step 3: Commit**

```bash
git add services/pavers.html
git commit -m "feat: add pavers service page with premium treatment"
```

---

## Task 6: Synthetic Turf Page (Premium Treatment)

**Files:**
- Create: `services/turf.html`

- [ ] **Step 1: Create `services/turf.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synthetic Turf Installation — Mower Men Inc.</title>
  <meta name="description" content="Professional synthetic turf installation in Orlando. Low-maintenance artificial grass for commercial and residential properties by Mower Men Inc.">
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop'); border-bottom: 3px solid var(--gold);">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow" style="color:var(--gold);">Now Offering · Premium Installation</span>
        <h1>Synthetic Turf Installation</h1>
        <p class="subtitle">Premium artificial turf that looks and feels like natural grass — without the water bills, mowing, or maintenance. Ideal for commercial and residential properties across Central Florida.</p>
        <a href="../estimate.html" class="btn btn-primary" style="margin-top:24px;">Get a Free Estimate</a>
      </div>
    </div>

    <!-- Why Synthetic Turf -->
    <section class="section section--dark">
      <div class="container">
        <div class="grid-2" style="align-items:center; gap:56px;">
          <div class="fade-in">
            <span class="eyebrow">The Case for Synthetic Turf</span>
            <h2 class="section-title">Permanently green. Zero maintenance. No water restrictions.</h2>
            <div class="gold-rule"></div>
            <p class="subtitle" style="margin-bottom:24px;">In Florida's intense heat and drought conditions, synthetic turf pays for itself in water savings alone — while always looking immaculate.</p>
            <ul class="bullet-list">
              <li>Eliminates mowing, edging, and watering costs</li>
              <li>Stays green year-round regardless of drought or restrictions</li>
              <li>Pet-friendly and child-safe materials</li>
              <li>Ideal for shade areas where natural grass won't grow</li>
              <li>10–15 year product lifespan with minimal upkeep</li>
            </ul>
          </div>
          <div class="fade-in" style="border-radius:var(--card-radius); overflow:hidden; border:1px solid var(--gold);">
            <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop" alt="Synthetic turf installation" style="width:100%; height:380px; object-fit:cover;">
          </div>
        </div>
      </div>
    </section>

    <!-- What's Included -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">What We Install</span>
          <h2 class="section-title">Applications &amp; Services</h2>
        </div>
        <div class="included-grid fade-in">
          <div class="included-item">
            <h4>Residential Lawns</h4>
            <p>Replace your natural grass with lush, realistic synthetic turf — permanently beautiful, zero maintenance.</p>
          </div>
          <div class="included-item">
            <h4>Pet Areas</h4>
            <p>Designated pet zones with drainage systems and antimicrobial infill for safe, clean, odor-free surfaces.</p>
          </div>
          <div class="included-item">
            <h4>Putting Greens</h4>
            <p>Custom backyard and commercial putting greens built to professional specifications.</p>
          </div>
          <div class="included-item">
            <h4>Rooftop &amp; Balcony Installations</h4>
            <p>Lightweight turf systems for rooftop decks, balconies, and elevated surfaces.</p>
          </div>
          <div class="included-item">
            <h4>HOA &amp; Commercial Common Areas</h4>
            <p>High-traffic synthetic turf for amenity areas, courtyards, and common spaces that demand year-round green.</p>
          </div>
          <div class="included-item">
            <h4>Playground &amp; Recreation Areas</h4>
            <p>Impact-absorbing turf systems for playgrounds, sports courts, and recreational surfaces.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>Ready for Permanently Perfect Turf?</h2>
        <p>Get a free synthetic turf estimate. We respond within one business day.</p>
        <div class="btns">
          <a href="../estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="../js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add services/turf.html
git commit -m "feat: add synthetic turf service page with premium treatment"
```

---

## Task 7: Gallery Page

**Files:**
- Create: `gallery.html`
- Create: `js/gallery.js`

- [ ] **Step 1: Create `js/gallery.js`**

```javascript
document.addEventListener('DOMContentLoaded', function () {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var items      = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.dataset.filter;

      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      items.forEach(function (item) {
        if (filter === 'all' || item.dataset.category === filter) {
          item.hidden = false;
        } else {
          item.hidden = true;
        }
      });
    });
  });

  // Before/After slider
  var slider = document.querySelector('.before-after');
  if (!slider) return;

  var beforeEl = slider.querySelector('.before-after__before');
  var handle   = slider.querySelector('.before-after__handle');
  var dragging = false;

  function setPosition(x) {
    var rect = slider.getBoundingClientRect();
    var pct  = Math.min(Math.max((x - rect.left) / rect.width, 0), 1);
    var p    = (pct * 100).toFixed(1) + '%';
    beforeEl.style.clipPath = 'inset(0 ' + (100 - pct * 100).toFixed(1) + '% 0 0)';
    handle.style.left       = p;
  }

  slider.addEventListener('mousedown',  function (e) { dragging = true; setPosition(e.clientX); });
  slider.addEventListener('touchstart', function (e) { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('mousemove',  function (e) { if (dragging) setPosition(e.clientX); });
  window.addEventListener('touchmove',  function (e) { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('mouseup',    function ()  { dragging = false; });
  window.addEventListener('touchend',   function ()  { dragging = false; });
});
```

- [ ] **Step 2: Create `gallery.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gallery — Mower Men Inc.</title>
  <meta name="description" content="View our portfolio of commercial and residential grounds maintenance, landscaping, paver, and turf projects across Central Florida.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=1600&auto=format&fit=crop'); min-height:50vh;">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">Our Work</span>
        <h1>Project Gallery</h1>
        <p class="subtitle">A selection of our commercial and residential grounds work across Central Florida. Stock photos shown — client project photos coming soon.</p>
      </div>
    </div>

    <!-- Before/After Feature -->
    <section class="section section--dark">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">Transformation</span>
          <h2 class="section-title">Before &amp; After</h2>
          <p class="subtitle">Drag the handle to compare. Placeholder images — to be replaced with actual project photos.</p>
        </div>
        <div class="before-after fade-in" style="height:400px;">
          <div class="before-after__after">
            <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&fit=crop" alt="After">
          </div>
          <div class="before-after__before">
            <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&auto=format&fit=crop" alt="Before">
          </div>
          <div class="before-after__handle"></div>
          <span class="before-after__label before-after__label--before">Before</span>
          <span class="before-after__label before-after__label--after">After</span>
        </div>
      </div>
    </section>

    <!-- Filtered Gallery -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">Portfolio</span>
          <h2 class="section-title">All Projects</h2>
        </div>
        <div class="gallery-filters fade-in">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="lawn">Lawn &amp; Grounds</button>
          <button class="filter-btn" data-filter="landscaping">Landscaping</button>
          <button class="filter-btn" data-filter="pavers">Pavers</button>
          <button class="filter-btn" data-filter="turf">Turf</button>
        </div>
        <div class="gallery-grid">
          <div class="gallery-item" data-category="lawn"><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop" alt="Lawn maintenance"></div>
          <div class="gallery-item" data-category="landscaping"><img src="https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=600&auto=format&fit=crop" alt="Landscaping"></div>
          <div class="gallery-item" data-category="pavers"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop" alt="Pavers"></div>
          <div class="gallery-item" data-category="turf"><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop" alt="Synthetic turf"></div>
          <div class="gallery-item" data-category="lawn"><img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format&fit=crop" alt="Commercial lawn"></div>
          <div class="gallery-item" data-category="landscaping"><img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop" alt="Garden design"></div>
          <div class="gallery-item" data-category="pavers"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop" alt="Paver patio"></div>
          <div class="gallery-item" data-category="lawn"><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop" alt="Resort grounds"></div>
          <div class="gallery-item" data-category="landscaping"><img src="https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=600&auto=format&fit=crop" alt="Flower beds"></div>
        </div>
      </div>
    </section>

    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>Want Results Like These?</h2>
        <p>Get a free estimate for your property. We respond within one business day.</p>
        <div class="btns">
          <a href="/estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
  <script src="js/gallery.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify gallery in browser**

Open `gallery.html`. Check:
1. Before/after slider: drag handle left/right — before image reveals/hides correctly
2. Filter buttons: click "Pavers" — only paver images remain, others disappear; click "All" — all return
3. Active filter button turns gold

- [ ] **Step 4: Commit**

```bash
git add gallery.html js/gallery.js
git commit -m "feat: add gallery page with filter and before/after slider"
```

---

## Task 8: About Page

**Files:**
- Create: `about.html`

- [ ] **Step 1: Create `about.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Us — Mower Men Inc.</title>
  <meta name="description" content="Mower Men Inc. — family-owned commercial grounds maintenance company in Orlando, Florida. BBB accredited, licensed and insured since 1990.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop'); min-height:55vh;">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">Our Story</span>
        <h1>35 Years of Setting the Standard.</h1>
        <p class="subtitle">Family-owned and operated since 1990. Built on reliability, delivered with pride.</p>
      </div>
    </div>

    <!-- Company Story -->
    <section class="section section--dark">
      <div class="container">
        <div class="about-story fade-in">
          <div>
            <span class="eyebrow">Founded 1990</span>
            <h2 class="section-title">Orlando's most trusted name in commercial grounds care.</h2>
            <div class="gold-rule"></div>
            <p class="subtitle" style="margin-bottom:20px; max-width:100%;">What started as a small family lawn care operation in Orlando has grown into one of Central Florida's most respected commercial grounds maintenance companies — serving luxury hotels, resort properties, HOA communities, and commercial centers across the region.</p>
            <p style="font-size:0.8125rem; color:var(--muted); line-height:1.8;">Over 35 years, we've built our reputation one property at a time. Our clients — many of whom have trusted us for a decade or more — know that when Mower Men shows up, the job gets done right. No shortcuts. No excuses. Just exceptional work, delivered consistently.</p>
          </div>
          <div style="border-radius:var(--card-radius); overflow:hidden; border:1px solid var(--mid-green);">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop" alt="Mower Men team at work" style="width:100%; height:420px; object-fit:cover;">
          </div>
        </div>
      </div>
    </section>

    <!-- Credentials -->
    <section class="section section--forest">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">Our Credentials</span>
          <h2 class="section-title">Trusted. Verified. Recognized.</h2>
        </div>
        <div class="credentials-list fade-in">
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Better Business Bureau (BBB) Accredited Member since 1990</div>
          </div>
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Licensed and insured to operate in the State of Florida</div>
          </div>
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Carries all required permits and licenses for commercial landscaping work</div>
          </div>
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Multiple awards for landscaping and grounds maintenance excellence</div>
          </div>
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Over 20 years of combined commercial and residential landscaping experience on our core team</div>
          </div>
          <div class="credential-item">
            <div class="credential-item__dot"></div>
            <div class="credential-item__text">Family-owned and operated — leadership is present on every project</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="section section--dark">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">How We Work</span>
          <h2 class="section-title">The Mower Men Standard</h2>
        </div>
        <div class="grid-3 fade-in">
          <div class="card">
            <h3>Consistency</h3>
            <p>We show up on schedule, every time. Your property looks the same whether it's week one or year ten of our service.</p>
          </div>
          <div class="card">
            <h3>Transparency</h3>
            <p>No hidden costs, no surprises. We communicate clearly about services, schedules, and costs before any work begins.</p>
          </div>
          <div class="card">
            <h3>Accountability</h3>
            <p>Our leadership is accessible and our team takes ownership of every property we maintain. If something isn't right, we make it right.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>35 Years of Expertise, at Your Service.</h2>
        <p>Get a free, no-obligation estimate for your property today.</p>
        <div class="btns">
          <a href="/estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add about.html
git commit -m "feat: add about page"
```

---

## Task 9: Residential Page

**Files:**
- Create: `residential.html`

- [ ] **Step 1: Create `residential.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Residential Services — Mower Men Inc.</title>
  <meta name="description" content="Residential lawn care and landscaping in Orlando by Mower Men Inc. The same commercial standard, applied to your home. Serving Central Florida since 1990.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop'); min-height:60vh;">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">Residential Services</span>
        <h1>The Same Standard. Your Home.</h1>
        <p class="subtitle">We bring 35 years of commercial grounds expertise directly to residential properties across Central Florida. Your home deserves the same care we deliver to Orlando's finest hotels and resorts.</p>
        <a href="/estimate.html" class="btn btn-primary" style="margin-top:24px;">Get a Free Estimate</a>
      </div>
    </div>

    <!-- Services -->
    <section class="section section--dark">
      <div class="container">
        <div class="section-header fade-in">
          <span class="eyebrow">What We Offer</span>
          <h2 class="section-title">Residential Services</h2>
        </div>
        <div class="grid-3 fade-in">
          <div class="card">
            <h3>Lawn Maintenance</h3>
            <p>Regular mowing, edging, trimming, and weed control to keep your lawn looking its best year-round.</p>
            <a href="/services/lawn-grounds.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card">
            <h3>Landscaping &amp; Design</h3>
            <p>Flower beds, sod, shrubs, and full landscape design to transform your home's curb appeal.</p>
            <a href="/services/landscaping.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card">
            <h3>Irrigation</h3>
            <p>Residential irrigation installation, inspection, and repair to keep your lawn healthy and your water bills low.</p>
            <a href="/services/irrigation.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card">
            <h3>Fertilizing</h3>
            <p>Custom fertilization programs tailored to your soil type and turf for a lush, healthy lawn.</p>
            <a href="/services/fertilizing.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card card--gold">
            <span class="card__badge">Now Offering</span>
            <h3>Paver Installation</h3>
            <p>Driveways, patios, walkways, and pool decks — premium paver installation for your home.</p>
            <a href="/services/pavers.html" class="link">Learn More &rarr;</a>
          </div>
          <div class="card card--gold">
            <span class="card__badge">Now Offering</span>
            <h3>Synthetic Turf</h3>
            <p>Permanently green, zero maintenance turf for your yard, pet area, or putting green.</p>
            <a href="/services/turf.html" class="link">Learn More &rarr;</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Why choose us -->
    <section class="section section--forest">
      <div class="container">
        <div class="grid-2" style="align-items:center;">
          <div class="fade-in" style="border-radius:var(--card-radius); overflow:hidden; border:1px solid var(--mid-green);">
            <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop" alt="Residential lawn care" style="width:100%; height:360px; object-fit:cover;">
          </div>
          <div class="fade-in">
            <span class="eyebrow">Why Mower Men</span>
            <h2 class="section-title">Commercial expertise. Neighborhood care.</h2>
            <div class="gold-rule"></div>
            <p class="subtitle" style="margin-bottom:24px;">When you hire a company that maintains luxury resort grounds, you get a level of attention to detail that most residential lawn services simply can't match.</p>
            <ul class="bullet-list">
              <li>35 years of experience across all property types</li>
              <li>Licensed, insured, and BBB accredited since 1990</li>
              <li>Consistent crews — same team visits your property</li>
              <li>Flexible scheduling to fit your needs</li>
              <li>Free, no-obligation estimates</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-banner" style="--bg-url: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop');">
      <div class="cta-banner__bg"></div>
      <div class="cta-banner__content fade-in">
        <h2>Your Home Deserves the Best.</h2>
        <p>Get a free residential estimate. We respond within one business day.</p>
        <div class="btns">
          <a href="/estimate.html" class="btn btn-primary">Get a Free Estimate</a>
          <a href="tel:4072519347" class="btn btn-outline">Call 407.251.9347</a>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add residential.html
git commit -m "feat: add residential page"
```

---

## Task 10: Free Estimate Page

**Files:**
- Create: `estimate.html`
- Create: `js/estimate.js`

- [ ] **Step 1: Create `js/estimate.js`**

```javascript
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('estimateForm');
  if (!form) return;

  function validateField(input) {
    var group = input.closest('.form-group');
    var msg   = group.querySelector('.form-error-msg');
    var valid = input.value.trim() !== '';

    if (input.type === 'email' && valid) {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    }
    if (input.type === 'tel' && valid) {
      valid = /^[\d\s\-\(\)\+]{7,}$/.test(input.value.trim());
    }

    group.classList.toggle('form-group--error', !valid);
    if (msg) msg.textContent = valid ? '' : (input.dataset.error || 'This field is required.');
    return valid;
  }

  form.querySelectorAll('[required]').forEach(function (input) {
    input.addEventListener('blur', function () { validateField(input); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var required = form.querySelectorAll('[required]');
    var allValid = true;

    required.forEach(function (input) {
      if (!validateField(input)) allValid = false;
    });

    if (!allValid) return;

    // At least one service checkbox required
    var checked = form.querySelectorAll('input[name="services"]:checked');
    var servicesGroup = document.getElementById('servicesGroup');
    if (checked.length === 0) {
      servicesGroup.classList.add('form-group--error');
      document.getElementById('servicesError').textContent = 'Please select at least one service.';
      allValid = false;
    } else {
      servicesGroup.classList.remove('form-group--error');
      document.getElementById('servicesError').textContent = '';
    }

    if (!allValid) return;

    form.style.display = 'none';
    document.getElementById('successMsg').style.display = 'block';
  });
});
```

- [ ] **Step 2: Create `estimate.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Estimate — Mower Men Inc.</title>
  <meta name="description" content="Request a free, no-obligation estimate from Mower Men Inc. Commercial and residential grounds services in Orlando. We respond within one business day.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&auto=format&fit=crop'); min-height:45vh;">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">No Obligation</span>
        <h1>Get a Free Estimate</h1>
        <p class="subtitle">Tell us about your property and we'll get back to you within one business day.</p>
      </div>
    </div>

    <section class="section section--dark">
      <div class="container" style="max-width:760px;">

        <div id="successMsg" style="display:none; text-align:center; padding:60px 0;">
          <h2 style="color:var(--gold); margin-bottom:12px;">Estimate Request Received</h2>
          <p style="color:var(--muted); font-size:0.875rem;">Thank you — a member of our team will contact you within one business day to discuss your property's needs.</p>
          <p style="color:var(--muted); font-size:0.875rem; margin-top:8px;">Questions? Call us at <a href="tel:4072519347" style="color:var(--gold);">407.251.9347</a></p>
        </div>

        <form id="estimateForm" novalidate>

          <div class="form-group">
            <label for="propertyType">Property Type <span style="color:var(--gold)">*</span></label>
            <select id="propertyType" name="propertyType" required data-error="Please select a property type.">
              <option value="">Select one...</option>
              <option>Hotel / Resort</option>
              <option>HOA / Condominium Community</option>
              <option>Restaurant / Retail</option>
              <option>Apartment / Multi-Family Complex</option>
              <option>Residential Home</option>
              <option>Other Commercial</option>
            </select>
            <div class="form-error-msg"></div>
          </div>

          <div class="form-group" id="servicesGroup">
            <label>Services Needed <span style="color:var(--gold)">*</span></label>
            <div class="checkbox-grid">
              <label class="checkbox-label"><input type="checkbox" name="services" value="Lawn & Grounds"> Lawn &amp; Grounds</label>
              <label class="checkbox-label"><input type="checkbox" name="services" value="Landscaping"> Landscaping</label>
              <label class="checkbox-label"><input type="checkbox" name="services" value="Irrigation"> Irrigation</label>
              <label class="checkbox-label"><input type="checkbox" name="services" value="Fertilizing"> Fertilizing</label>
              <label class="checkbox-label"><input type="checkbox" name="services" value="Pavers"> Pavers &amp; Hardscape</label>
              <label class="checkbox-label"><input type="checkbox" name="services" value="Turf"> Synthetic Turf</label>
            </div>
            <div class="form-error-msg" id="servicesError"></div>
          </div>

          <div class="form-group">
            <label for="propertySize">Approximate Property Size</label>
            <select id="propertySize" name="propertySize">
              <option value="">Not sure / Prefer to discuss</option>
              <option>Under 5,000 sq ft</option>
              <option>5,000 – 20,000 sq ft</option>
              <option>20,000 – 100,000 sq ft</option>
              <option>Over 100,000 sq ft</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div class="form-group">
              <label for="firstName">First Name <span style="color:var(--gold)">*</span></label>
              <input type="text" id="firstName" name="firstName" required data-error="Please enter your first name.">
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name <span style="color:var(--gold)">*</span></label>
              <input type="text" id="lastName" name="lastName" required data-error="Please enter your last name.">
              <div class="form-error-msg"></div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div class="form-group">
              <label for="phone">Phone Number <span style="color:var(--gold)">*</span></label>
              <input type="tel" id="phone" name="phone" required data-error="Please enter a valid phone number." placeholder="(407) 000-0000">
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label for="email">Email Address <span style="color:var(--gold)">*</span></label>
              <input type="email" id="email" name="email" required data-error="Please enter a valid email address.">
              <div class="form-error-msg"></div>
            </div>
          </div>

          <div class="form-group">
            <label for="bestTime">Best Time to Contact</label>
            <select id="bestTime" name="bestTime">
              <option value="">No preference</option>
              <option>Morning (8am – 12pm)</option>
              <option>Afternoon (12pm – 5pm)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="message">Additional Details</label>
            <textarea id="message" name="message" placeholder="Tell us about your property, current issues, or any specific requests..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%; font-size:0.75rem; padding:16px;">Request My Free Estimate</button>
          <p style="font-size:0.625rem; color:#555; text-align:center; margin-top:12px;">We respond within one business day. Your information is never shared.</p>

        </form>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
  <script src="js/estimate.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify form in browser**

Open `estimate.html`. Check:
1. Submit with all fields empty — red borders appear on required fields with error messages
2. Enter invalid email (e.g. "notanemail") — email field shows error
3. Check no services — "Please select at least one service" appears below checkbox grid
4. Fill all fields correctly and submit — form hides, success message appears

- [ ] **Step 4: Commit**

```bash
git add estimate.html js/estimate.js
git commit -m "feat: add free estimate page with form validation"
```

---

## Task 11: Contact Page

**Files:**
- Create: `contact.html`

- [ ] **Step 1: Create `contact.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact — Mower Men Inc.</title>
  <meta name="description" content="Contact Mower Men Inc. — Orlando's premier commercial grounds maintenance company. Call 407.251.9347 or email sales@mowermen.com.">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="nav-placeholder"></div>

  <main>

    <div class="service-hero" style="background-image: url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&auto=format&fit=crop'); min-height:45vh;">
      <div class="service-hero__overlay"></div>
      <div class="service-hero__content">
        <span class="eyebrow">Get in Touch</span>
        <h1>Contact Us</h1>
        <p class="subtitle">We're based in Orlando and serve Central Florida. Call, email, or stop by.</p>
      </div>
    </div>

    <section class="section section--dark">
      <div class="container">
        <div class="contact-grid">

          <div class="fade-in">
            <span class="eyebrow">Our Information</span>
            <h2 class="section-title" style="margin-bottom:32px;">We'd love to hear from you.</h2>

            <div class="contact-info-item">
              <span class="label">Phone</span>
              <span class="value"><a href="tel:4072519347" style="color:var(--cream);">407.251.9347</a></span>
            </div>
            <div class="contact-info-item">
              <span class="label">Fax</span>
              <span class="value">407.438.7009</span>
            </div>
            <div class="contact-info-item">
              <span class="label">Email</span>
              <span class="value"><a href="mailto:sales@mowermen.com" style="color:var(--cream);">sales@mowermen.com</a></span>
            </div>
            <div class="contact-info-item">
              <span class="label">Address</span>
              <span class="value">5485 S. Orange Blossom Trail<br>Orlando, FL 32839</span>
            </div>
            <div class="contact-info-item">
              <span class="label">Hours of Operation</span>
              <span class="value" style="color:var(--muted); font-size:0.875rem;">To be confirmed with client</span>
            </div>
            <div class="contact-info-item">
              <span class="label">Service Area</span>
              <span class="value" style="font-size:0.875rem;">Central Florida &amp; Greater Orlando</span>
            </div>

            <a href="/estimate.html" class="btn btn-primary" style="margin-top:8px;">Get a Free Estimate</a>
          </div>

          <div class="fade-in">
            <iframe
              class="map-embed"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3505.1!2d-81.3927!3d28.4785!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e77f20b7e!2s5485+S+Orange+Blossom+Trail%2C+Orlando%2C+FL+32839!5e0!3m2!1sen!2sus!4v1"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Mower Men Inc. location">
            </iframe>
            <p style="font-size:0.625rem; color:#444; margin-top:8px;">5485 S. Orange Blossom Trail, Orlando, FL 32839</p>
          </div>

        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Open `contact.html`. Check: contact info renders in left column, map iframe loads in right column. On mobile (< 768px): columns stack vertically.

- [ ] **Step 3: Commit**

```bash
git add contact.html
git commit -m "feat: add contact page with map"
```

---

## Task 12: Final Polish & Cross-Browser QA

**Files:**
- Modify: `css/styles.css` (minor additions only)

- [ ] **Step 1: Verify all pages at 3 viewport widths**

Open each of the 14 HTML files and resize browser to:
- **375px** (iPhone): nav collapses to hamburger, all grids single-column, text readable
- **768px** (tablet): grids switch to 2-column where appropriate
- **1440px** (desktop): full layout, max-width container centered with margins

Flag any layout breaks and fix in `css/styles.css`. Common issues to check:
- Trust bar wraps correctly on mobile
- Service spotlight cards stack vertically
- Hero text doesn't overflow viewport width
- Pavers photo showcase grid collapses gracefully

- [ ] **Step 2: Add mobile pavers showcase fix to `css/styles.css`**

```css
@media (max-width: 768px) {
  .pavers-showcase { grid-template-columns: 1fr; grid-template-rows: auto; height: auto; }
  .pavers-showcase__main { grid-row: auto; }
  .pavers-showcase img { height: 220px; }
}
```

- [ ] **Step 3: Verify no emojis appear on any page**

Search all HTML files for emoji characters. Expected: zero results.

```bash
grep -r "[^\x00-\x7F]" *.html services/*.html
```

Expected output: no matches (all characters are ASCII).

- [ ] **Step 4: Verify marquee loops seamlessly**

Open `index.html`, scroll to the client logos strip. Let it run for 60 seconds. The logos should loop continuously with no visible jump or gap.

- [ ] **Step 5: Verify nav `../` paths work from service pages**

Open `services/pavers.html`. Click every nav link. Expected: each page loads correctly. If a 404 occurs, a path is wrong — fix the href in `main.js`.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: responsive layout and cross-browser QA pass"
```

---

## Placeholder Checklist (Before Launch)

These must be replaced before the site goes live. Do not remove this section from the plan.

| Item | File(s) | Action |
|---|---|---|
| All Unsplash images | Every page | Replace with real Mower Men property photos |
| Client logos in marquee | `index.html` | Replace `.marquee-logo` divs with `<img>` tags of actual logos |
| Testimonial content | `index.html` | Replace with real client quotes and names |
| Logo text | `js/main.js` nav + footer | Replace "Mower Men Inc." text with `<img src="/assets/images/logo.png">` |
| Trust bar stats (500+, Award) | `index.html` | Confirm real numbers with owner |
| Hours of operation | `contact.html` | Obtain from owner and fill in |
| Google Map embed URL | `contact.html` | Generate real embed URL from Google Maps for the exact address |
| Form action | `estimate.html` | Wire `<form>` to a real backend (Formspree, Netlify Forms, or custom endpoint) |
| Footer copyright year | `js/main.js` | Update to current year or make dynamic |
