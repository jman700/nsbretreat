# NSBretreat — Handoff

Last updated: 2026-05-04

## Where We Left Off
All planned features are complete and live. Site is fully functional.

## What Was Done This Session
- Multi-language support (EN/ES/PT/FR/DE/IT) — main site + house guide
- FAQ moved to main site and corrected
- Nav scrollspy with active section highlighting
- Lang switcher + Book on Airbnb button styling matched (sand color, charcoal border)
- QR code page at nsbretreat.com/qr (SVG + PNG download + print)
- iOS chat fixes: no zoom on input, no background scroll, no gap behind keyboard when keyboard opens
- vercel.json cleanUrls enabled

## Key Context
- Static site, no build step — edit HTML/CSS/JS directly
- Vercel auto-deploys from GitHub main branch
- i18n engine: js/i18n.js, translations in js/translations-main.js and guide/js/translations-guide.js
- Language stored in localStorage('nsb_lang')
- iOS scroll lock: uses position:fixed body trick (not overflow:hidden — doesn't work on iOS)
- Chat overlay syncs to window.visualViewport on resize to handle keyboard gap

## Pending
Nothing — project is in a clean state.
