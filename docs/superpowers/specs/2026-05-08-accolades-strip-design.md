# Accolades Strip — Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full-width accolades strip between the hero and property section on `index.html` that prominently displays Airbnb achievement badges (Guest Favorite, Top 1%, Superhost, rating/reviews), linking to the existing reviews section.

**Architecture:** New `<section class="accolades-strip">` inserted in `index.html` between `#hero` and `#property`. New CSS block added to `css/styles.css`. No JS required — pure HTML/CSS.

**Tech Stack:** Vanilla HTML, CSS, inline SVG (Lucide icons)

---

## Placement

Inserted between the closing `</section>` of `#hero` and the opening `<section class="property" id="property">` in `index.html`.

## HTML Structure

```html
<section class="accolades-strip">
  <a href="#reviews" class="accolade">
    <!-- Lucide award icon -->
    <div class="accolade-icon"><!-- SVG --></div>
    <div class="accolade-text">
      <span class="accolade-label">Guest Favorite</span>
      <span class="accolade-sub">One of the most loved homes on Airbnb</span>
    </div>
  </a>
  <a href="#reviews" class="accolade">
    <!-- Lucide trophy icon -->
    <div class="accolade-icon"><!-- SVG --></div>
    <div class="accolade-text">
      <span class="accolade-label">Top 1% of Homes</span>
      <span class="accolade-sub">Ratings, reviews &amp; reliability</span>
    </div>
  </a>
  <a href="#reviews" class="accolade">
    <!-- Lucide shield icon -->
    <div class="accolade-icon"><!-- SVG --></div>
    <div class="accolade-text">
      <span class="accolade-label">Superhost</span>
      <span class="accolade-sub">Top 20% of all Airbnb hosts</span>
    </div>
  </a>
  <a href="#reviews" class="accolade">
    <!-- Lucide star icon -->
    <div class="accolade-icon"><!-- SVG --></div>
    <div class="accolade-text">
      <span class="accolade-label">5.0 &nbsp;·&nbsp; 50+ Reviews</span>
      <span class="accolade-sub">Perfect rating</span>
    </div>
  </a>
</section>
```

## CSS Rules

New block in `css/styles.css` under `/* ── Accolades Strip ── */`:

- `.accolades-strip` — `display: flex`, `background: #fff`, `border-bottom: 1px solid var(--tan)`
- `.accolade` — `flex: 1`, `display: flex`, `align-items: center`, `gap: 0.75rem`, `padding: 1.25rem 1.5rem`, `text-decoration: none`, `color: inherit`, `border-right: 1px solid var(--tan)`, `transition: background`
- `.accolade:last-child` — `border-right: none`
- `.accolade:hover` — `background: var(--blush)`
- `.accolade-icon` — `width: 40px`, `height: 40px`, `background: var(--blush)`, `border-radius: 50%`, `display: flex`, `align-items: center`, `justify-content: center`, `flex-shrink: 0`
- `.accolade-icon svg` — `stroke: var(--accent)`, `width: 20px`, `height: 20px`
- `.accolade-text` — `display: flex`, `flex-direction: column`, `gap: 0.15rem`
- `.accolade-label` — `font-family: var(--font-sans)`, `font-size: 0.88rem`, `font-weight: 600`, `color: var(--charcoal)`
- `.accolade-sub` — `font-size: 0.72rem`, `color: var(--charcoal-lighter)`, `line-height: 1.3`

**Mobile (≤ 640px):** `.accolades-strip` wraps to 2×2 grid using `flex-wrap: wrap`. Each `.accolade` gets `flex: 1 1 50%`. `.accolade:nth-child(2n)` gets `border-right: none` (right column has no right border). `.accolade:nth-child(-n+2)` gets `border-bottom: 1px solid var(--tan)` (top row gets a bottom border to divide the rows).

## Icons (Lucide SVG, inline)

All icons use `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `width="20"`, `height="20"`.

| Cell | Icon name | Lucide path data |
|------|-----------|-----------------|
| Guest Favorite | `award` | `<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>` |
| Top 1% | `trophy` | `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>` |
| Superhost | `shield-check` | `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>` |
| Reviews | `star` | `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>` |

## Files Modified

- **Modify:** `index.html` — insert `<section class="accolades-strip">` between hero and property sections
- **Modify:** `css/styles.css` — add `/* ── Accolades Strip ── */` CSS block

## Out of Scope

- No changes to `guide/index.html` or `pad/index.html`
- No JavaScript
- No changes to the existing reviews section itself
- i18n translations (add `data-i18n` attributes if multilingual support is needed in a future pass)
