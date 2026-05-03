// analytics.js — NSB Retreat Analytics
// Handles Google Analytics 4 init + custom event tracking for both pages.
// Vercel Analytics is loaded via script tag in HTML.

(function () {

  // ── 1. Boot GA4 ────────────────────────────────────────────────────────
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

  // ── 2. Helper ───────────────────────────────────────────────────────────
  function track(eventName, params) {
    params = params || {};
    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
    // Vercel Analytics
    if (typeof window.va === 'function') {
      try { window.va('event', Object.assign({ name: eventName }, params)); } catch(e) {}
    }
  }

  // ── 3. Section visibility (IntersectionObserver) ────────────────────────
  // Fires once per section per page load when ≥40% is visible
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

  // ── 4. Accordion opens ──────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.acc-trigger');
    if (trigger) {
      const isOpening = !trigger.classList.contains('open');
      if (isOpening) {
        track('accordion_open', { label: trigger.textContent.trim() });
      }
    }
  });

  // ── 5. Gallery interactions ─────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('#gallery-grid img')) {
      track('gallery_photo_view', { index: Array.from(document.querySelectorAll('#gallery-grid img')).indexOf(e.target) });
    }
    if (e.target.closest('#gallery-prev')) track('gallery_nav', { direction: 'prev' });
    if (e.target.closest('#gallery-next')) track('gallery_nav', { direction: 'next' });
  });

  // ── 6. Guide tab clicks ─────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.guide-tab');
    if (tab) track('guide_tab_click', { tab: tab.textContent.trim() });
  });

  // ── 7. Local guide filter pills ─────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.filter-btn');
    if (btn) track('local_filter_click', { filter: btn.dataset.filter || 'all' });
  });

  // ── 8. Local guide place card directions ───────────────────────────────
  document.addEventListener('click', function (e) {
    const dir = e.target.closest('.place-directions');
    if (dir) {
      const card = dir.closest('.place-card');
      const name = card ? card.querySelector('h3')?.textContent.trim() : 'unknown';
      track('local_guide_directions', { place: name });
    }
  });

  // ── 9. CTA clicks (phone, Airbnb, Book, House Guide) ───────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href], button');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    if (href.startsWith('tel:'))              track('cta_phone_call', { number: href.replace('tel:', '') });
    if (link.matches('[data-airbnb-link]'))   track('cta_airbnb_click', { location: location.pathname });
    if (href.includes('guide/'))              track('cta_house_guide_click');
    if (href.includes('airbnb.com/rooms'))    track('cta_airbnb_click', { location: location.pathname });
    if (href.includes('#reviews'))            track('cta_reviews_click');
  });

  // ── 10. Chat widget interactions ────────────────────────────────────────
  const chatFab = document.getElementById('chat-fab');
  if (chatFab) {
    chatFab.addEventListener('click', function () {
      track('chat_open');
    });
  }
  const chatSend = document.getElementById('chat-send');
  if (chatSend) {
    chatSend.addEventListener('click', function () {
      const input = document.getElementById('chat-input');
      if (input && input.value.trim()) {
        track('chat_message_sent', { query: input.value.trim().slice(0, 100) });
      }
    });
  }

  // ── 11. Quick Info card copies ──────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const card = e.target.closest('.quick-card[data-copy-key]');
    if (card) track('quick_info_copy', { key: card.dataset.copyKey });
  });

  // ── 12. Hot tub tablet steps (guide page) ──────────────────────────────
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('#hottub .acc-trigger');
    if (trigger) track('hottub_step_view', { step: trigger.textContent.trim() });
  });

  // ── 13. Time on page ────────────────────────────────────────────────────
  // Fire a heartbeat event every 60s to measure engagement time
  let timeOnPage = 0;
  const heartbeat = setInterval(function () {
    timeOnPage += 60;
    track('time_on_page', { seconds: timeOnPage, page: location.pathname });
  }, 60000);
  window.addEventListener('beforeunload', function () {
    clearInterval(heartbeat);
    track('page_exit', { seconds_spent: timeOnPage, page: location.pathname });
  });

  // ── 14. Scroll depth ────────────────────────────────────────────────────
  const depthMilestones = [25, 50, 75, 90];
  const reached = new Set();
  window.addEventListener('scroll', function () {
    const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    depthMilestones.forEach(function (m) {
      if (pct >= m && !reached.has(m)) {
        reached.add(m);
        track('scroll_depth', { depth_pct: m, page: location.pathname });
      }
    });
  }, { passive: true });

})();
