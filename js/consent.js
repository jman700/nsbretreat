// consent.js — cookie and tracking consent for the guest-facing pages.
//
// Nothing that reports to a third party (or to Vercel Web Analytics) may run until the
// matching category is granted here. Other scripts ask through window.NSBConsent:
//   NSBConsent.has('analytics')              -> true / false right now
//   NSBConsent.whenGranted('analytics', fn)  -> runs fn once, as soon as it is granted
//   NSBConsent.onChange(fn)                  -> fn(choice) after every saved change
//   NSBConsent.open()                        -> reopens the preferences dialog
//
// Rules this file enforces:
// - Accept all, Reject all and Customize are the same size and weight.
// - Necessary is always on. Functional, Analytics and Marketing start off.
// - The choice is stored with a timestamp and asked again after 13 months.
// - Global Privacy Control: with no stored choice it counts as Reject all and no banner
//   is shown; with a stored choice it always forces Marketing off.
// - Any element with [data-cookie-prefs] reopens the dialog (the footer link).
(function () {
  'use strict';

  var KEY = 'nsb_consent';
  var VERSION = 1;
  var MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000; // about 13 months
  var CATS = ['functional', 'analytics', 'marketing'];
  var gpc = navigator.globalPrivacyControl === true;

  var listeners = [];
  var waiters = { functional: [], analytics: [], marketing: [] };
  var banner = null;
  var dialog = null;
  var lastFocus = null;

  function readStored() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION || typeof c.ts !== 'number') return null;
      if (Date.now() - c.ts > MAX_AGE_MS) return null; // expired: ask again
      return c;
    } catch (e) { return null; }
  }

  function writeStored(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
  }

  function normalise(c) {
    var out = { v: VERSION, ts: c.ts || Date.now() };
    CATS.forEach(function (k) { out[k] = c[k] === true; });
    if (gpc) out.marketing = false;
    return out;
  }

  var stored = readStored();
  // With GPC and no stored choice: everything optional is off and we do not ask.
  var current = stored ? normalise(stored) : null;
  var effective = current || { v: VERSION, ts: 0, functional: false, analytics: false, marketing: false };

  function has(cat) { return effective[cat] === true; }

  function flushWaiters() {
    CATS.forEach(function (cat) {
      if (!has(cat)) return;
      var list = waiters[cat];
      waiters[cat] = [];
      list.forEach(function (fn) { try { fn(); } catch (e) {} });
    });
  }

  function save(choice) {
    var before = effective;
    current = normalise({ ts: Date.now(), functional: choice.functional, analytics: choice.analytics, marketing: choice.marketing });
    effective = current;
    writeStored(current);
    hideBanner();
    closeDialog();
    listeners.forEach(function (fn) { try { fn(current); } catch (e) {} });
    flushWaiters();
    // Withdrawing a category whose script already ran: clear its cookies and reload
    // so the script is gone from the page.
    var withdrawn = CATS.some(function (k) { return before[k] && !current[k]; });
    if (withdrawn && window.__nsbTrackersLoaded) {
      clearTrackerCookies();
      location.reload();
    }
  }

  function clearTrackerCookies() {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat|_gcl|_fbp|_fbc)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  function ensureCss() {
    if (document.querySelector('link[data-consent-css]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/css/consent.css';
    l.setAttribute('data-consent-css', '');
    document.head.appendChild(l);
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  // ── Banner ───────────────────────────────────────────────────────────────
  function showBanner() {
    if (banner) return;
    ensureCss();
    banner = el('section', { 'class': 'nsbc-banner', role: 'region', 'aria-label': 'Cookie choices', 'aria-describedby': 'nsbc-banner-text' });
    var title = el('h2', { 'class': 'nsbc-title' }, 'Your privacy');
    var text = el('p', { id: 'nsbc-banner-text', 'class': 'nsbc-text' },
      'These pages only use what they need to work. With your OK we also use analytics cookies (Google Analytics and Vercel Web Analytics) to see which parts of the guide help guests. Nothing optional runs until you choose.');
    var more = el('a', { href: '/privacy', 'class': 'nsbc-link' }, 'Privacy notice');
    text.appendChild(document.createTextNode(' '));
    text.appendChild(more);
    var row = el('div', { 'class': 'nsbc-actions' });
    var acc = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Accept all');
    var rej = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Reject all');
    var cus = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Customize');
    acc.addEventListener('click', function () { save({ functional: true, analytics: true, marketing: true }); });
    rej.addEventListener('click', function () { save({ functional: false, analytics: false, marketing: false }); });
    cus.addEventListener('click', function () { openDialog(); });
    row.appendChild(acc); row.appendChild(rej); row.appendChild(cus);
    banner.appendChild(title); banner.appendChild(text); banner.appendChild(row);
    document.body.appendChild(banner);
  }

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  // ── Preferences dialog ───────────────────────────────────────────────────
  var ROWS = [
    { key: 'necessary', name: 'Necessary', desc: 'Keeps the pages working: your language, this cookie choice, and the pool and spa controls. Always on.', locked: true },
    { key: 'functional', name: 'Functional', desc: 'Extra conveniences. The guest pages do not use any today.' },
    { key: 'analytics', name: 'Analytics', desc: 'Counts visits and which parts of the guide get used (Google Analytics and Vercel Web Analytics), including campaign tags in the link you followed.' },
    { key: 'marketing', name: 'Marketing', desc: 'Advertising and ad-click measurement. The guest pages do not use any today. Always off when your browser sends Global Privacy Control.' }
  ];

  function openDialog() {
    ensureCss();
    if (dialog) return;
    lastFocus = document.activeElement;
    var backdrop = el('div', { 'class': 'nsbc-backdrop' });
    var box = el('div', { 'class': 'nsbc-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nsbc-dlg-title' });
    box.appendChild(el('h2', { id: 'nsbc-dlg-title', 'class': 'nsbc-title' }, 'Cookie preferences'));
    box.appendChild(el('p', { 'class': 'nsbc-text' }, 'Choose what you allow. You can change this any time from "Cookie preferences" at the bottom of the page.'));
    if (gpc) box.appendChild(el('p', { 'class': 'nsbc-note' }, 'Your browser sends Global Privacy Control, so Marketing stays off.'));

    var switches = {};
    var list = el('div', { 'class': 'nsbc-list' });
    ROWS.forEach(function (r) {
      var row = el('div', { 'class': 'nsbc-row' });
      var labelId = 'nsbc-l-' + r.key, descId = 'nsbc-d-' + r.key;
      var textWrap = el('div', { 'class': 'nsbc-row-text' });
      textWrap.appendChild(el('span', { id: labelId, 'class': 'nsbc-row-name' }, r.name));
      textWrap.appendChild(el('span', { id: descId, 'class': 'nsbc-row-desc' }, r.desc));
      var on = r.locked ? true : has(r.key);
      var locked = r.locked || (r.key === 'marketing' && gpc);
      if (r.key === 'marketing' && gpc) on = false;
      var sw = el('button', { type: 'button', role: 'switch', 'class': 'nsbc-switch', 'aria-checked': String(on), 'aria-labelledby': labelId, 'aria-describedby': descId });
      if (locked) { sw.setAttribute('aria-disabled', 'true'); sw.classList.add('is-locked'); }
      sw.appendChild(el('span', { 'class': 'nsbc-knob', 'aria-hidden': 'true' }));
      sw.addEventListener('click', function () {
        if (locked) return;
        sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
      });
      if (!r.locked) switches[r.key] = sw;
      row.appendChild(textWrap); row.appendChild(sw);
      list.appendChild(row);
    });
    box.appendChild(list);

    var row = el('div', { 'class': 'nsbc-actions' });
    var acc = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Accept all');
    var rej = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Reject all');
    var sav = el('button', { type: 'button', 'class': 'nsbc-btn' }, 'Save choices');
    acc.addEventListener('click', function () { save({ functional: true, analytics: true, marketing: true }); });
    rej.addEventListener('click', function () { save({ functional: false, analytics: false, marketing: false }); });
    sav.addEventListener('click', function () {
      save({
        functional: switches.functional.getAttribute('aria-checked') === 'true',
        analytics: switches.analytics.getAttribute('aria-checked') === 'true',
        marketing: switches.marketing.getAttribute('aria-checked') === 'true'
      });
    });
    row.appendChild(acc); row.appendChild(rej); row.appendChild(sav);
    box.appendChild(row);

    backdrop.appendChild(box);
    backdrop.addEventListener('keydown', trapKeys);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) closeDialog(); });
    document.body.appendChild(backdrop);
    dialog = backdrop;
    var first = box.querySelector('.nsbc-switch:not(.is-locked)') || acc;
    first.focus();
  }

  function trapKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var f = dialog.querySelectorAll('button:not([aria-disabled="true"]), a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function closeDialog() {
    if (!dialog) return;
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    dialog = null;
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    else if (banner) { var b = banner.querySelector('button'); if (b) b.focus(); }
  }

  // ── Footer link ──────────────────────────────────────────────────────────
  function bindPrefLinks() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-prefs]');
      if (!t) return;
      e.preventDefault();
      openDialog();
    });
  }

  window.NSBConsent = {
    has: has,
    get: function () { return current ? JSON.parse(JSON.stringify(current)) : null; },
    whenGranted: function (cat, fn) {
      if (has(cat)) { try { fn(); } catch (e) {} } else if (waiters[cat]) waiters[cat].push(fn);
    },
    onChange: function (fn) { listeners.push(fn); },
    open: function () { openDialog(); }
  };

  function init() {
    bindPrefLinks();
    if (!current && !gpc) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
