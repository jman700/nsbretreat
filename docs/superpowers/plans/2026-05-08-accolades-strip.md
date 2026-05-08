# Accolades Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-width white accolades strip between the hero and property section on `index.html` displaying four Airbnb achievement badges (Guest Favorite, Top 1% of Homes, Superhost, 5.0 · 50+ Reviews), each linking to the existing `#reviews` section.

**Architecture:** Pure HTML + CSS, no JavaScript. A new `<section class="accolades-strip">` is inserted at line 88 of `index.html` (between `</section>` closing the hero and the opening of `<section class="property">`). New CSS block added to `css/styles.css` after line 325 (after the `.hero-btn` rule, before `/* ── Property ── */`). Icons are inline Lucide SVGs.

**Tech Stack:** HTML, CSS, inline SVG

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Insert `<section class="accolades-strip">` at line 88 (between hero and property sections) |
| `css/styles.css` | Insert `/* ── Accolades Strip ── */` CSS block after line 325 (after `.hero-btn` rule) |

---

## Task 1: Add the CSS

**Files:**
- Modify: `css/styles.css` — insert after line 325 (after `.hero-btn { min-width: 200px; }`)

- [ ] **Step 1: Insert the CSS block**

Open `css/styles.css`. After line 325 (the `.hero-btn { min-width: 200px; }` line), insert the following block — before the existing `/* ── Property ── */` comment:

```css
/* ── Accolades Strip ── */
.accolades-strip {
  display: flex;
  background: var(--white);
  border-bottom: 1px solid var(--tan);
}
.accolade {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  text-decoration: none;
  color: inherit;
  border-right: 1px solid var(--tan);
  transition: background var(--transition);
}
.accolade:last-child { border-right: none; }
.accolade:hover { background: var(--blush); }
.accolade-icon {
  width: 40px;
  height: 40px;
  background: var(--blush);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.accolade-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.accolade-label {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--charcoal);
  line-height: 1.2;
}
.accolade-sub {
  font-size: 0.72rem;
  color: var(--charcoal-lighter);
  line-height: 1.3;
}
```

- [ ] **Step 2: Add mobile responsive rules**

Inside the existing `@media (max-width: 640px)` block in `css/styles.css` (search for `@media (max-width: 640px)` — there will be one already), add these rules:

```css
  .accolades-strip { flex-wrap: wrap; }
  .accolade {
    flex: 1 1 50%;
    padding: 1rem 1.25rem;
  }
  .accolade:nth-child(2n) { border-right: none; }
  .accolade:nth-child(-n+2) { border-bottom: 1px solid var(--tan); }
```

- [ ] **Step 3: Verify the CSS file looks right**

The block should now appear between `.hero-btn { min-width: 200px; }` and `/* ── Property ── */`. No other existing rules should have changed.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "feat: add accolades strip CSS"
```

---

## Task 2: Add the HTML

**Files:**
- Modify: `index.html` — insert new section at line 88 (between the closing `</section>` of hero and the opening `<section class="property" id="property">`)

- [ ] **Step 1: Insert the HTML section**

Open `index.html`. Find line 87–89 which currently reads:

```html
  </section>

  <section class="property" id="property">
```

Replace it with:

```html
  </section>

  <section class="accolades-strip" id="accolades">
    <a href="#reviews" class="accolade">
      <div class="accolade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="8" r="6"/>
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
      </div>
      <div class="accolade-text">
        <span class="accolade-label">Guest Favorite</span>
        <span class="accolade-sub">One of the most loved homes on Airbnb</span>
      </div>
    </a>
    <a href="#reviews" class="accolade">
      <div class="accolade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      </div>
      <div class="accolade-text">
        <span class="accolade-label">Top 1% of Homes</span>
        <span class="accolade-sub">Ratings, reviews &amp; reliability</span>
      </div>
    </a>
    <a href="#reviews" class="accolade">
      <div class="accolade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
      <div class="accolade-text">
        <span class="accolade-label">Superhost</span>
        <span class="accolade-sub">Top 20% of all Airbnb hosts</span>
      </div>
    </a>
    <a href="#reviews" class="accolade">
      <div class="accolade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <div class="accolade-text">
        <span class="accolade-label">5.0 &nbsp;·&nbsp; 50+ Reviews</span>
        <span class="accolade-sub">Perfect rating</span>
      </div>
    </a>
  </section>

  <section class="property" id="property">
```

- [ ] **Step 2: Verify visually**

Open `index.html` in a browser (or use `npx serve -l 3456 .` and go to `http://localhost:3456`). Confirm:
- The strip appears between the hero photo and the "5 Bedrooms / 4 Bathrooms / …" stat strip
- Four cells are visible, evenly spaced, each with a circular icon and two lines of text
- Each cell has an accent-colored SVG icon on a blush background circle
- Hovering any cell turns the background blush
- Clicking any cell scrolls down to the reviews section
- On a narrow window (< 640px), the strip wraps into a 2×2 grid

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add accolades strip between hero and property section"
git push
```

---

## Self-Review Checklist (already done — captured here for reference)

- [x] Spec coverage: both files covered, all 4 badges present, mobile layout covered, link to #reviews covered
- [x] No placeholders
- [x] Class names consistent: `accolades-strip`, `accolade`, `accolade-icon`, `accolade-text`, `accolade-label`, `accolade-sub` used identically in both tasks
