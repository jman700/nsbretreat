// analytics.js — NSB Retreat Analytics
// GA4 init + comprehensive event tracking for guide and landing pages.
// Vercel Analytics loaded separately via <script> tag in each HTML file.

(function () {

  // ── 1. Boot GA4 ────────────────────────────────────────────────────────────
  const gaId = typeof CONFIG !== 'undefined' && CONFIG.ga_measurement_id;
  if (gaId && gaId !== 'G-XXXXXXXXXX') {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, {
      page_title:    document.title,
      page_location: location.href,
    });
  }

  // ── 2. Helper: fires to GA4 + Vercel Analytics ──────────────────────────────
  function track(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
    if (typeof window.va === 'function') {
      try { window.va('event', Object.assign({ name: eventName }, params || {})); } catch(e) {}
    }
  }

  // ── 3. Section visibility (IntersectionObserver, fires once per section) ────
  const seenSections = new Set();
  const sectionObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !seenSections.has(entry.target.id)) {
        seenSections.add(entry.target.id);
        track('section_view', { section: entry.target.id });
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('section[id]').forEach(function (s) { sectionObs.observe(s); });

  // ── 4. Accordion opens ──────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.acc-trigger');
    if (trigger && !trigger.classList.contains('open')) {
      track('accordion_open', { label: trigger.textContent.trim() });
    }
  });

  // ── 5. Gallery interactions ─────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('#gallery-grid img')) {
      track('gallery_photo_view', {
        index: Array.from(document.querySelectorAll('#gallery-grid img')).indexOf(e.target),
      });
    }
    if (e.target.closest('#gallery-prev')) track('gallery_nav', { direction: 'prev' });
    if (e.target.closest('#gallery-next')) track('gallery_nav', { direction: 'next' });
  });

  // ── 6. Nav tab clicks (guide tabs + pad tabs) ───────────────────────────────
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.guide-tab, .pad-tab');
    if (tab) track('tab_click', { tab: tab.textContent.trim(), page: location.pathname });
  });

  // ── 7. Local guide: filter pills ───────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.filter-btn');
    if (btn) track('local_filter_click', { filter: btn.dataset.filter || 'all' });
  });

  // ── 8. Local guide: place card + address/directions clicks ─────────────────
  // FIX: was tracking .place-directions (class doesn't exist) — corrected to .place-address
  document.addEventListener('click', function (e) {
    const addrLink = e.target.closest('.place-address');
    if (addrLink) {
      const card = addrLink.closest('.place-card');
      const name = card ? (card.querySelector('h3') || {}).textContent || 'unknown' : 'unknown';
      track('local_guide_directions', { place: name.trim() });
      return; // don't also fire place_click
    }
    const placeCard = e.target.closest('.place-card');
    if (placeCard) {
      const name = (placeCard.querySelector('h3') || {}).textContent || 'unknown';
      track('local_guide_place_click', { place: name.trim() });
    }
  });

  // ── 9. CTA clicks: phone, maps, Airbnb, guide link, reviews ────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href], button');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    if (href.startsWith('tel:'))             track('cta_phone_call',       { number: href.replace('tel:', '') });
    if (link.matches('[data-airbnb-link]'))  track('cta_airbnb_click',     { location: location.pathname });
    if (href.includes('airbnb.com/rooms'))   track('cta_airbnb_click',     { location: location.pathname });
    if (href.includes('guide/'))             track('cta_house_guide_click', { from: location.pathname });
    if (href.includes('#reviews'))           track('cta_reviews_click');
    if (href.startsWith('https://maps.google') && !e.target.closest('.place-card, .around-cta, #emergency, #beach'))
      track('maps_link_click', { label: link.textContent.trim().substring(0, 60) });
  });

  // ── 10. Quick info card copies (WiFi password, etc.) ───────────────────────
  document.addEventListener('click', function (e) {
    const card = e.target.closest('.quick-card[data-copy-key]');
    if (card) track('quick_info_copy', { key: card.dataset.copyKey });
  });

  // ── 11. Beach conditions widget: flag/cam button clicks ────────────────────
  document.addEventListener('click', function (e) {
    const card = e.target.closest('.bc-action-card');
    if (card) {
      const labelEl = card.querySelector('.bc-action-label');
      track('beach_widget_click', { label: labelEl ? labelEl.textContent.trim() : 'unknown' });
    }
  });

  // ── 12. Around-the-house: code copies + direction CTA buttons ──────────────
  document.addEventListener('click', function (e) {
    const code = e.target.closest('.around-code[data-copy-val]');
    if (code) track('around_code_copy', { code: code.dataset.copyVal });

    const cta = e.target.closest('.around-cta');
    if (cta) track('around_cta_click', { label: cta.textContent.trim() });
  });

  // ── 13. Hot tub accordion steps ────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('#hottub .acc-trigger');
    if (trigger) track('hottub_step_view', { step: trigger.textContent.trim() });
  });

  // ── 14. Events section: external link clicks ───────────────────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('#events a[target="_blank"]');
    if (link) {
      const card = link.closest('.event-card');
      const name = card
        ? ((card.querySelector('h3') || {}).textContent || '').trim()
        : link.textContent.trim().substring(0, 60);
      track('events_link_click', { event_name: name || 'unknown' });
    }
  });

  // ── 15. Beach section: external links (ramps, flag report, cam, app, etc.) ─
  document.addEventListener('click', function (e) {
    const link = e.target.closest('#beach a[target="_blank"]');
    if (link) {
      const label = link.textContent.trim().substring(0, 60);
      track('beach_link_click', { label: label || link.href.substring(0, 60) });
    }
  });

  // ── 16. App store links (Volusia Beaches app, any store link) ──────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="apps.apple.com"], a[href*="play.google.com"]');
    if (link) {
      const platform = link.href.includes('apps.apple') ? 'ios' : 'android';
      track('app_store_click', { platform: platform, label: link.textContent.trim() });
    }
  });

  // ── 17. Reviews section: platform link clicks ──────────────────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('#reviews a[href]');
    if (link) {
      const href = link.getAttribute('href') || '';
      const platform = href.includes('airbnb') ? 'airbnb'
        : href.includes('google')  ? 'google'
        : href.includes('vrbo')    ? 'vrbo'
        : 'other';
      track('review_link_click', { platform: platform });
    }
  });

  // ── 18. Photo booth interactions ────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('#pb-open-btn'))     track('photobooth_open');
    if (e.target.closest('#pb-capture-btn'))  track('photobooth_capture');
    if (e.target.closest('#pb-retake-btn'))   track('photobooth_retake');
    if (e.target.closest('#pb-download-btn')) track('photobooth_download');
    if (e.target.closest('#pb-share-btn'))    track('photobooth_share');
  });

  // ── 19. Guestbook: submission ───────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('#gb-submit')) {
      const month = (document.getElementById('gb-month') || {}).value || 'unknown';
      track('guestbook_submit', { month: month.trim() });
    }
  });

  // ── 20. Chat widget: open + message sent ────────────────────────────────────
  const chatFab = document.getElementById('chat-fab');
  if (chatFab) chatFab.addEventListener('click', function () { track('chat_open'); });
  const chatSend = document.getElementById('chat-send');
  if (chatSend) {
    chatSend.addEventListener('click', function () {
      const input = document.getElementById('chat-input');
      if (input && input.value.trim()) {
        track('chat_message_sent', { query: input.value.trim().slice(0, 100) });
      }
    });
  }

  // ── 21. Scroll depth milestones ────────────────────────────────────────────
  const depthMilestones = [25, 50, 75, 90];
  const reached = new Set();
  window.addEventListener('scroll', function () {
    const scrollable = document.body.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const pct = Math.round((window.scrollY / scrollable) * 100);
    depthMilestones.forEach(function (m) {
      if (pct >= m && !reached.has(m)) {
        reached.add(m);
        track('scroll_depth', { depth_pct: m, page: location.pathname });
      }
    });
  }, { passive: true });

  // ── 22. Time on page: 60s heartbeat + exit ─────────────────────────────────
  let timeOnPage = 0;
  const heartbeat = setInterval(function () {
    timeOnPage += 60;
    track('time_on_page', { seconds: timeOnPage, page: location.pathname });
  }, 60000);
  window.addEventListener('beforeunload', function () {
    clearInterval(heartbeat);
    track('page_exit', { seconds_spent: timeOnPage, page: location.pathname });
  });

})();
