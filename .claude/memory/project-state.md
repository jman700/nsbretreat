# NSBretreat — Project State

Last updated: 2026-05-04

## Status: Active development

## What's Live and Working
- Main site at nsbretreat.com — hero, gallery (30 photos), amenities, availability calendar, neighborhood, hosts, reviews, footer
- House manual at nsbretreat.com/guide/ — Quick Info, The House, Getting Around, Hot Tub, Local Guide, Beach, Checkout, FAQ, Feedback, Reviews tabs
- Admin feedback inbox at nsbretreat.com/admin.html — Supabase Auth login, reads guest_feedback table
- Guest feedback form in guide (Feedback tab) — submits to Supabase guest_feedback table
- Floating chat widget on guide page with FAQ responses
- Language switcher: **IN PROGRESS** (not yet implemented)

## Recently Completed (this session)
- Gallery trimmed from 64 → 30 photos (all 10 pool photos kept; interior reduced)
- Outdoor amenities added to index.html: pergola, outdoor kitchen, outdoor bar, hammock
- VRBO review link fixed in guide → https://www.vrbo.com/3982075?dateless=true
- FAQ section added to guide/index.html (10 questions)
- Instagram @thensbretreat added to main site footer
- OG meta tags added to index.html
- FAQ moved from guide to main site — **PENDING** (user requested, not yet done)
- FAQ content corrections — **PENDING**: pets allowed with $395 fee; pool heating $40/day; remove "additional guests need approval" line; fix cancellation policy wording

## Pending Tasks
1. Move FAQ from guide/index.html to index.html (main site)
2. Apply FAQ content corrections (pet fee, pool heating, cancellation policy)
3. Multi-language support — EN/ES/PT(BR)/FR/DE/IT on both pages (in progress)
4. Commit and push after above

## Supabase
- Project ref: xittuxwilxmzzawjdivd
- Tables: guest_feedback (id, created_at, guest_name, message)
- Admin users: antoniofconcha@gmail.com, jman700@gmail.com

## Git
- Remote: https://github.com/jman700/nsbretreat.git
- Branch: main
- Last commit: f28f917 — "Add FAQ, Instagram, OG tags, outdoor amenities, trim gallery, fix VRBO link"
