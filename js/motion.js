// js/motion.js — shared motion system: scroll reveal, hero word-mask,
// hero parallax, and the stat-strip count-up. Loaded on both index.html and
// guide/index.html (the guide has no hero, so those two pieces just no-op
// there since .hero / .hero-title don't exist on that page).
//
// Everything here is additive: if this script fails to load or a browser
// lacks IntersectionObserver, the page already shows its real, final content
// (see css/styles.css) — nothing depends on JS to be readable.

(function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll reveal ─────────────────────────────────────────────────────
  // Elements tagged [data-reveal] / [data-reveal-stagger] fade+rise once as
  // they cross into view. Mirrors the CSS in css/styles.css.
  (function initReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-reveal-stagger]'));
    if (!nodes.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    nodes.forEach(function (n) { io.observe(n); });
  })();

  // ── Hero title word-mask reveal ──────────────────────────────────────
  // The hero title is set via I18N's data-i18n-html (so its innerHTML can
  // contain a manual <br> line break and changes with the selected
  // language). We re-wrap it into per-word masks every time i18n applies —
  // once on load, and again on every language switch — rather than baking
  // the spans into the HTML, since a static markup version would go stale
  // the moment the guest changes language.
  function wrapHeroWords() {
    var el = document.querySelector('.hero-title[data-i18n-html]');
    if (!el) return; // no hero on this page (e.g. guide/index.html)

    // Read the CURRENT rendered markup (already the real, translated text —
    // this is what a no-JS guest, or this function failing, would see).
    var raw = el.innerHTML;

    // aria-label carries the full plain-text phrase (line break -> space) so
    // assistive tech reads it as one string instead of a run of masked
    // word fragments.
    var tmp = document.createElement('div');
    tmp.innerHTML = raw.replace(/<br\s*\/?>/gi, ' ');
    var ariaLabel = tmp.textContent.replace(/\s+/g, ' ').trim();

    // Rebuild with each word in its own clipping mask, preserving the <br>
    // line break at whatever position it was in the translated string.
    var wordIndex = 0;
    var lines = raw.split(/<br\s*\/?>/gi).map(function (line) {
      var words = line.trim().split(/\s+/).filter(Boolean);
      var wrapped = words.map(function (word) {
        var span = '<span class="hero-word"><span style="--i:' + wordIndex + '">' + word + '</span></span>';
        wordIndex++;
        return span;
      });
      return wrapped.join(' ');
    });

    el.setAttribute('aria-label', ariaLabel);
    // The word spans carry the visible text; aria-hidden on the wrapper
    // keeps assistive tech from also reading the masked fragments — the
    // aria-label above is the single source of truth for the accessible name.
    el.innerHTML = '<span aria-hidden="true">' + lines.join('<br>') + '</span>';
  }

  wrapHeroWords();
  document.addEventListener('i18n:applied', wrapHeroWords);

  // ── Hero parallax ─────────────────────────────────────────────────────
  // The backdrop drifts at ~35% of scroll speed. .hero-bg is inset beyond
  // the hero's own bounds (see css/styles.css) so no edge is ever exposed.
  // Skipped entirely past the hero, and for reduced motion. rAF-throttled so
  // a fast flick on a phone doesn't run this on every scroll event.
  (function initParallax() {
    var heroBg = document.querySelector('.hero-bg');
    if (!heroBg || REDUCED) return;

    var ticking = false;
    function apply() {
      ticking = false;
      var y = window.scrollY;
      heroBg.style.transform = y < window.innerHeight * 1.2
        ? 'translate3d(0, ' + (y * 0.35) + 'px, 0)'
        : '';
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // ── Stat-strip count-up ──────────────────────────────────────────────
  // .stat-num values (5, 4, 16, 3min, 2,600, 7min) are already the real,
  // final numbers in the HTML — that's what a no-JS guest, a browser
  // without IntersectionObserver, or reduced motion always sees. We only
  // drop a value to zero at the moment we're about to animate it up from
  // zero, never before, so there's no window where the strip can be left
  // stranded on a wrong number if the observer never fires.
  (function initStatCountUp() {
    var strip = document.querySelector('.stat-strip');
    if (!strip || REDUCED || !('IntersectionObserver' in window)) return;

    var nums = Array.prototype.slice.call(strip.querySelectorAll('.stat-num'));

    // Parse "3<span class=stat-unit>min</span>" into { num, decimals, unitHTML }
    // and "2,600" into { num: 2600, decimals: 0, unitHTML: '' } — preserving
    // both the trailing unit markup and the thousands-comma formatting.
    function parseStat(el) {
      var unitEl = el.querySelector('.stat-unit');
      var unitHTML = unitEl ? unitEl.outerHTML : '';
      var numText = (unitEl ? el.textContent.slice(0, el.textContent.length - unitEl.textContent.length) : el.textContent).trim();
      var raw = numText.replace(/,/g, '');
      var num = Number(raw);
      if (!raw || !isFinite(num)) return null;
      var dot = raw.indexOf('.');
      var decimals = dot === -1 ? 0 : raw.length - dot - 1;
      return { num: num, decimals: decimals, unitHTML: unitHTML };
    }

    function fmt(n, decimals) {
      return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    var parsed = nums.map(parseStat);
    var played = false;

    function play() {
      if (played) return;
      played = true;
      parsed.forEach(function (p, i) {
        if (!p) return; // non-numeric stat (shouldn't happen here, but stays verbatim if it does)
        var el = nums[i];
        var DURATION = 1100;
        var start = null;
        // easeOutExpo — quick off the line, settles gently onto the final value.
        function ease(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
        function step(ts) {
          if (start === null) start = ts;
          var t = Math.min(1, (ts - start) / DURATION);
          el.innerHTML = fmt(p.num * ease(t), p.decimals) + p.unitHTML;
          if (t < 1) requestAnimationFrame(step);
        }
        // Only now — animation actually starting — do we drop to zero.
        el.innerHTML = fmt(0, p.decimals) + p.unitHTML;
        requestAnimationFrame(step);
      });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { play(); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(strip);
  })();
})();
