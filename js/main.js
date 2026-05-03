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

// Wire Airbnb URL from config to all [data-airbnb-link] elements
const airbnbUrl = typeof CONFIG !== 'undefined' ? CONFIG.airbnb_url : '#';
document.querySelectorAll('[data-airbnb-link]').forEach(el => {
  el.href = airbnbUrl;
});

const GALLERY_PHOTOS = [
  'assets/photos/hero.jpg',
  'assets/photos/pool.jpg',
  'assets/photos/gameroom.jpg',
  'assets/photos/hottub.jpg',
  'assets/photos/massage.jpg',
];

let currentPhoto = 0;

function openLightbox(index) {
  currentPhoto = index;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[index];
  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
}

(function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  GALLERY_PHOTOS.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Property photo ${i + 1}`;
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(i));
    grid.appendChild(img);
  });
})();

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLightbox();
});
document.getElementById('lightbox-prev').addEventListener('click', () => {
  currentPhoto = (currentPhoto - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[currentPhoto];
});
document.getElementById('lightbox-next').addEventListener('click', () => {
  currentPhoto = (currentPhoto + 1) % GALLERY_PHOTOS.length;
  document.getElementById('lightbox-img').src = GALLERY_PHOTOS[currentPhoto];
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') document.getElementById('lightbox-prev').click();
  if (e.key === 'ArrowRight') document.getElementById('lightbox-next').click();
});
