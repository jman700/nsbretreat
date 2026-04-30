# Mower Men Website Redesign — Design Spec
**Date:** 2026-04-30  
**Project:** mowermen.com full redesign  
**Status:** Approved, ready for implementation planning

---

## 1. Project Overview

Complete redesign of mowermen.com for Mower Men Inc., a family-owned commercial grounds maintenance company founded in 1990 in Orlando, Florida. The current site is visually outdated, lacks photography, has no social proof, and does not reflect the company's 35-year reputation or its new Pavers & Turf service lines.

### Goals
- Establish Mower Men as the premier commercial grounds company in Central Florida
- Prominently introduce Pavers and Turf as new premium service offerings
- Generate leads via phone calls and estimate form submissions
- Replace a sparse, dated site with a polished, professional presence

### Scope
Frontend website only — no backend tools, CRM integrations, or booking systems in this phase.

---

## 2. Design Direction

### Personality: Heritage-Forward
Deep-rooted authority. "35 years because we're the best." The design communicates longevity, professionalism, and earned trust — not trendy or modern for its own sake.

### Primary Audience: Commercial-First
The site leads with commercial credibility (hotels, resorts, HOAs, restaurants, apartments). Residential is a dedicated secondary section, positioned as "same standard, your home." Commercial pedigree benefits residential conversion — it is not hidden.

### Logo
The existing Mower Men Inc. logo (bold green block letters, gold outline) is used as-is. Logo refinement is deferred to a future phase.

---

## 3. Design System

### Color Palette

| Name | Hex | Usage |
|---|---|---|
| Midnight | `#0a1205` | Page background |
| Deep Forest | `#0d1a07` | Nav, cards, panels |
| Forest | `#1a2d0e` | Section backgrounds |
| Mid Green | `#2d4a1e` | Borders, dividers |
| Leaf Green | `#4a7c2f` | Accent tops, hover states |
| Gold | `#c8a94a` | Primary CTA, labels, Pavers/Turf highlight |
| Cream | `#f5f0e8` | Headlines, primary text |
| Muted Green | `#a0b090` | Body text, secondary copy |

### Typography

- **Display / Hero Headlines:** Georgia serif, 700 weight, cream (`#f5f0e8`), tight line-height (1.15)
- **Section Headlines:** Georgia serif, 700 weight, 22–26px
- **Eyebrow Labels:** All caps, letter-spacing 4px, gold (`#c8a94a`), 9–10px — used above every headline
- **Body Copy:** System sans-serif (Arial/Helvetica stack), 11–13px, muted green (`#a0b090`), line-height 1.7–1.8
- **Buttons/CTAs:** All caps, letter-spacing 2px, 700 weight, 10px, no emojis

### No Emojis
Zero emojis anywhere on the site. Service cards and components use simple geometric line icons or no icon at all.

### Buttons

| Type | Style |
|---|---|
| Primary CTA | Gold fill (`#c8a94a`), dark text (`#0d1a07`), 3px border-radius |
| Secondary CTA | Gold outline, gold text, transparent bg |
| Tertiary | Leaf green fill, cream text |
| Text link | Gold text, all caps, arrow suffix `→` |

---

## 4. Site Architecture

### Navigation (persistent, all pages)
```
[MOWER MEN INC. logo]    Home  Services▾  Gallery  About  Residential  Contact  [Free Estimate]  407.251.9347
```

- **Services dropdown:** Lawn & Grounds · Landscaping · Irrigation · Fertilizing · — · ★ Pavers · ★ Turf  
  (Pavers and Turf are gold-colored in the dropdown to signal premium/new)
- **Free Estimate:** Gold filled button, visually distinct from nav links
- **Phone number:** Pinned far right, always visible on desktop
- Mobile: Hamburger menu, phone number prominent, Free Estimate button stays visible

### Pages (8 total)

| # | Page | Nav Label |
|---|---|---|
| 1 | Homepage | Home |
| 2 | Services hub + 6 sub-pages | Services ▾ |
| 3 | Gallery | Gallery |
| 4 | About | About |
| 5 | Residential | Residential |
| 6 | Free Estimate form | Free Estimate |
| 7 | Contact | Contact |

### Service Sub-Pages (6, each via dropdown)
1. Lawn & Grounds Maintenance
2. Landscaping & Design
3. Irrigation Systems
4. Fertilizing Programs
5. Pavers & Hardscape ★
6. Synthetic Turf ★

Each service page follows the same template: Hero → What's Included → Our Process → Photo Gallery Strip → CTA. Pavers and Turf pages receive additional visual prominence and more detailed content.

### Footer (all pages)
Four columns: Mower Men Inc. (Est. 1990, BBB) · Services list · Company links · Contact info (phone, email, address)

---

## 5. Homepage — Section by Section

### Section 1: Hero
- Full viewport height, full-screen background image (stock: manicured commercial grounds)
- Dark overlay for text legibility
- Eyebrow: `EST. 1990 · ORLANDO'S PREMIER COMMERCIAL GROUNDS COMPANY`
- Headline (Georgia serif, large): "Orlando's Most Trusted Commercial Grounds Maintenance."
- Gold rule line (56px wide, 3px tall) below headline
- Subheading: "From luxury resorts to HOA communities — 35 years of exceptional grounds care, delivered with the highest professional standards."
- Dual CTAs: [Get a Free Estimate] (gold fill) + [407.251.9347] (gold outline)

### Section 2: Trust Bar
Full-width dark bar, 5 stats separated by vertical rules:
- 35+ Years in Business · BBB Accredited Since 1990 · Licensed & Fully Insured · 500+ Properties Maintained · Award-Winning Service

*(500+ and "Award-Winning" are placeholder stats — confirm real numbers with client before launch)*

### Section 3: Service Spotlight Strip
Three cards side by side:
1. **Lawn & Grounds** (green top border)
2. **Landscaping & Design** (green top border)
3. **Pavers & Turf** (gold top border + "Now Offering" badge)

No emojis. Simple geometric line icon or no icon. One-line description + "Learn More →" text link per card.

### Section 4: Commercial Focus
Two-column layout: left = headline + commercial property type list (hotels, HOAs, restaurants, apartments) with gold bullet points; right = stock photo of commercial property grounds.

### Section 5: Client Logos Strip (Scrolling Marquee)
- Single horizontal row
- Auto-scrolling marquee — loops continuously left to right
- Mower Men uploads actual client/partner logo files; placeholders used until launch
- Subtle label above: `A FEW OF OUR CLIENTS & PARTNERS`

### Section 6: Testimonials
Three cards in a row. Each card: large serif quote mark (gold), testimonial text (italic), avatar circle placeholder + name + title + property name. All placeholder content until real testimonials are provided.

### Section 7: Final CTA Banner
Full-width background image (darker overlay), centered:
- Headline: "Ready to Elevate Your Property?"
- Subtext: "Get a free, no-obligation estimate. We respond within one business day."
- Dual CTAs: [Get a Free Estimate] + [Call 407.251.9347]

---

## 6. Individual Page Notes

### Free Estimate Page
Purpose-built lead capture form (not a generic contact form). Fields:
- Property type (dropdown: Hotel/Resort · HOA/Condo · Restaurant/Retail · Apartment Complex · Residential · Other)
- Services needed (checkboxes: Lawn & Grounds · Landscaping · Irrigation · Fertilizing · Pavers · Turf)
- Approximate property size
- Name · Phone · Email
- Best time to contact
- Message (optional)
- Submit CTA: "Request My Free Estimate"
- Note below form: "We respond within one business day."

### Gallery Page
- Filterable image grid: All · Lawn · Landscaping · Pavers · Turf
- Stock photography as placeholders; structured for easy real-photo replacement
- Before/after slider for 1–2 featured projects

### About Page
- Company story: family-owned since 1990
- Credentials: BBB member since 1990, licensed & insured, award-winning
- Team section (placeholder until photos provided)
- Values/differentiators section

### Residential Page
- Positioned as secondary, premium feel
- Headline: "The Same Standard. Your Home."
- Services listed (subset of commercial offerings)
- Estimate CTA

### Contact Page
- Phone: 407.251.9347
- Fax: 407.438.7009
- Email: sales@mowermen.com
- Address: 5485 S. Orange Blossom Trail, Orlando, FL 32839
- Embedded Google Map
- Hours of operation (placeholder — confirm with client)
- Simple contact form (name, email, message)

---

## 7. Content Placeholders (Replace Before Launch)

| Item | Status |
|---|---|
| Hero photography | Stock — replace with real property photos |
| Section 4 photo | Stock — replace with real commercial grounds photo |
| Client logos | Placeholder company names — upload real logos |
| Testimonials | Fabricated — replace with real client quotes |
| Team photos | Placeholder circles — replace with real headshots |
| Stats (500+ properties, awards) | Estimate — confirm real numbers with owner |
| Hours of operation | Missing — obtain from owner |

---

## 8. Deferred to Future Phases

- Logo refinement (pending owner approval)
- Real photography session for property portfolio
- Google Reviews / star rating widget integration
- Social media feed or links
- Blog / content marketing section
- Service area map or zip code lookup
- Online payment or contract portal
- Any backend tools or CRM integrations
