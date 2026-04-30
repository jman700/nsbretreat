(function () {
  var NAV_HTML = `
<nav class="site-nav">
  <div class="nav-inner">
    <a href="/index.html" class="nav-logo">Mower Men Inc.</a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/index.html">Home</a></li>
      <li class="nav-dropdown">
        <span class="nav-dropdown__toggle">Services</span>
        <div class="nav-dropdown__menu">
          <a href="/services/lawn-grounds.html">Lawn &amp; Grounds</a>
          <a href="/services/landscaping.html">Landscaping</a>
          <a href="/services/irrigation.html">Irrigation</a>
          <a href="/services/fertilizing.html">Fertilizing</a>
          <div class="divider"></div>
          <a href="/services/pavers.html" class="gold">Pavers &amp; Hardscape</a>
          <a href="/services/turf.html" class="gold">Synthetic Turf</a>
        </div>
      </li>
      <li><a href="/gallery.html">Gallery</a></li>
      <li><a href="/about.html">About</a></li>
      <li><a href="/residential.html">Residential</a></li>
      <li><a href="/contact.html">Contact</a></li>
      <li class="nav-cta"><a href="/estimate.html" class="btn btn-primary btn-sm">Free Estimate</a></li>
    </ul>
    <span class="nav-phone"><a href="tel:4072519347">407.251.9347</a></span>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>`;

  var FOOTER_HTML = `
<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-col">
      <div class="footer-brand">Mower Men Inc.</div>
      <p>Orlando's premier commercial grounds maintenance company. Family-owned and operated since 1990.</p>
      <p style="margin-top:12px;">BBB Accredited · Licensed &amp; Insured</p>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Services</div>
      <a href="/services/lawn-grounds.html">Lawn &amp; Grounds</a>
      <a href="/services/landscaping.html">Landscaping</a>
      <a href="/services/irrigation.html">Irrigation</a>
      <a href="/services/fertilizing.html">Fertilizing</a>
      <a href="/services/pavers.html">Pavers &amp; Hardscape</a>
      <a href="/services/turf.html">Synthetic Turf</a>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Company</div>
      <a href="/about.html">About Us</a>
      <a href="/gallery.html">Gallery</a>
      <a href="/residential.html">Residential</a>
      <a href="/contact.html">Contact</a>
      <a href="/estimate.html">Free Estimate</a>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Contact</div>
      <a href="tel:4072519347">407.251.9347</a>
      <a href="mailto:sales@mowermen.com">sales@mowermen.com</a>
      <p>5485 S. Orange Blossom Trail</p>
      <p>Orlando, FL 32839</p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2025 Mower Men Inc. All rights reserved.</span>
    <span>Licensed &amp; Insured · Est. 1990</span>
  </div>
</footer>`;

  function inject() {
    var navEl = document.getElementById('nav-placeholder');
    var footerEl = document.getElementById('footer-placeholder');
    if (navEl)    navEl.outerHTML = NAV_HTML;
    if (footerEl) footerEl.outerHTML = FOOTER_HTML;
  }

  function initMobileMenu() {
    var toggle = document.getElementById('navToggle');
    var links  = document.getElementById('navLinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  function initScrollFade() {
    var els = document.querySelectorAll('.fade-in');
    if (!els.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { observer.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    inject();
    initMobileMenu();
    initScrollFade();
  });
})();
