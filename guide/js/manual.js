// manual.js — House Manual Core Interactivity

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

  const ph = document.getElementById('hottub-phone');
  if (ph && info.host_phone) {
    ph.href = 'tel:' + info.host_phone.replace(/\D/g, '');
    ph.textContent = info.host_phone;
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

// ── Checkout Checklist ─────────────────────────────────
(function initChecklist() {
  const items  = document.querySelectorAll('.check-item');
  const bar    = document.getElementById('checklist-bar');
  const count  = document.getElementById('checklist-count');

  function update() {
    const total = items.length;
    const done  = document.querySelectorAll('.check-btn.checked').length;
    if (bar)   bar.style.width = total ? (done / total * 100) + '%' : '0%';
    if (count) count.textContent = done + ' of ' + total + ' complete';
  }

  items.forEach(item => {
    const btn = item.querySelector('.check-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.classList.toggle('checked');
      item.classList.toggle('done', btn.classList.contains('checked'));
      update();
    });
  });

  update();
})();

// ── Local Guide Filter ─────────────────────────────────
(function initFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.place-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(c => {
        c.style.display = (!f || c.dataset.category === f) ? '' : 'none';
      });
    });
  });
})();

// ── Active Tab on Scroll ───────────────────────────────
(function initScrollSpy() {
  const sections = Array.from(document.querySelectorAll('.manual-section[id]'));
  const links    = document.querySelectorAll('.tab-link');

  function update() {
    let current = sections[0]?.id || '';
    sections.forEach(sec => {
      if (window.scrollY + 80 >= sec.offsetTop) current = sec.id;
    });
    links.forEach(link => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === current);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
