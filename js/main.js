// Nav scroll shadow
const nav = document.getElementById('site-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navToggle.setAttribute('aria-expanded', open);
  });
  // Close nav when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-label', 'Open menu');
      navToggle.setAttribute('aria-expanded', false);
    });
  });
}

// Wire Airbnb URL from config to all [data-airbnb-link] elements and #nav-book-btn
document.addEventListener('DOMContentLoaded', () => {
  const airbnbUrl = typeof CONFIG !== 'undefined' ? CONFIG.airbnb_url : '#';
  document.querySelectorAll('[data-airbnb-link]').forEach(el => {
    el.href = airbnbUrl;
  });
  const bookBtn = document.getElementById('nav-book-btn');
  if (bookBtn) bookBtn.href = airbnbUrl;
});
