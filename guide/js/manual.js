// manual.js — House Manual Core Interactivity

// Nav scroll shadow (matches main site)
const manualNav = document.getElementById('manual-nav');
if (manualNav) {
  window.addEventListener('scroll', () => {
    manualNav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// Populate quick info from CONFIG if available
(function initQuickInfo() {
  const info = (typeof CONFIG !== 'undefined' && CONFIG.quick_info) ? CONFIG.quick_info : {};
  const map = {
    'qv-wifi-name':  info.wifi_name,
    'qv-wifi-pass':  info.wifi_password,
    'qv-checkout':   info.checkout_time || '10:00 AM',
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  });

  const ph       = document.getElementById('hottub-phone');
  const phLine   = document.getElementById('hottub-contact');
  if (ph && phLine && info.host_phone) {
    ph.href      = 'tel:' + info.host_phone.replace(/\D/g, '');
    ph.textContent = info.host_phone;
    phLine.style.display = '';
  }
})();

// ── Toast ──────────────────────────────────────────────
const toast = document.getElementById('copy-toast');
let toastTimer;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg || 'Copied!';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// Copy quick cards
document.querySelectorAll('.quick-card[data-copy-key]').forEach(card => {
  card.addEventListener('click', () => {
    const val = card.querySelector('.quick-value')?.textContent?.trim();
    if (!val || val === '—') return;
    navigator.clipboard.writeText(val)
      .then(() => showToast('Copied!'))
      .catch(() => showToast('Copy failed'));
  });
});

// Copy around codes
document.querySelectorAll('[data-copy-val]').forEach(el => {
  el.addEventListener('click', () => {
    const val = el.dataset.copyVal;
    navigator.clipboard.writeText(val)
      .then(() => showToast('Copied: ' + val))
      .catch(() => showToast('Copy failed'));
  });
});

// ── Accordion ──────────────────────────────────────────
document.querySelectorAll('.acc-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const body = trigger.nextElementSibling;
    const isOpen = body.classList.contains('open');

    // Close all
    document.querySelectorAll('.acc-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.acc-trigger').forEach(t => t.classList.remove('open'));

    // Open this one if it was closed
    if (!isOpen) {
      body.classList.add('open');
      trigger.classList.add('open');
    }
  });
});

// ── Section Collapse ───────────────────────────────────
(function initCollapse() {
  document.querySelectorAll('.manual-section').forEach(function(section) {
    // Find title element — either .section-title-row or first h2
    var titleEl = section.querySelector('.section-title-row') || section.querySelector('.manual-section-title');
    if (!titleEl) return;

    // Wrap all siblings after title in .section-body
    var body = document.createElement('div');
    body.className = 'section-body';
    var next = titleEl.nextElementSibling;
    while (next) {
      var after = next.nextElementSibling;
      body.appendChild(next);
      next = after;
    }
    section.appendChild(body);

    // Add collapse button
    var btn = document.createElement('button');
    btn.className = 'section-collapse-btn open';
    btn.setAttribute('aria-label', 'Toggle section');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

    if (titleEl.classList.contains('section-title-row')) {
      titleEl.appendChild(btn);
    } else {
      // Wrap h2 in a section-title-row
      var row = document.createElement('div');
      row.className = 'section-title-row';
      titleEl.parentNode.insertBefore(row, titleEl);
      row.appendChild(titleEl);
      row.appendChild(btn);
      // Re-apply border-bottom to row
      titleEl.style.borderBottom = 'none';
      titleEl.style.paddingBottom = '0';
      titleEl.style.marginBottom = '0';
    }

    btn.addEventListener('click', function() {
      var collapsed = section.classList.toggle('collapsed');
      btn.classList.toggle('open', !collapsed);
    });
  });
})();

// ── Jump to Top ────────────────────────────────────────
(function initJumpTop() {
  const btn = document.getElementById('jump-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ── Local Guide Filter ─────────────────────────────────
(function initFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.place-card');

  function applyFilter(f) {
    cards.forEach(c => {
      c.style.display = (!f || c.dataset.category === f) ? '' : 'none';
    });
  }

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  // Apply initial active filter
  const activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) applyFilter(activeBtn.dataset.filter);
})();

// ── Active Tab on Scroll ───────────────────────────────
(function initScrollSpy() {
  const sections = Array.from(document.querySelectorAll('.manual-section[id]'));
  const links    = document.querySelectorAll('.guide-tab');
  const tabs     = document.getElementById('manual-tabs');

  function update() {
    let current = sections[0]?.id || '';
    sections.forEach(sec => {
      if (window.scrollY + 80 >= sec.offsetTop) current = sec.id;
    });
    links.forEach(link => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === current);
    });

    // Center the active tab in the scrollable tabs container
    if (tabs) {
      const activeLink = tabs.querySelector('.guide-tab.active');
      if (activeLink) {
        const scrollLeft = activeLink.offsetLeft - (tabs.offsetWidth / 2) + (activeLink.offsetWidth / 2);
        tabs.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
