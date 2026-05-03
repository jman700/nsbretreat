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
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-label', 'Open menu');
      navToggle.setAttribute('aria-expanded', false);
    });
  });
}

// Wire Airbnb URL from config
const airbnbUrl = typeof CONFIG !== 'undefined' ? CONFIG.airbnb_url : '#';
document.querySelectorAll('[data-airbnb-link]').forEach(el => { el.href = airbnbUrl; });

// ── Gallery ───────────────────────────���──────────────────────────��────────
// Gallery photos — interleaved pool/backyard and interior for balanced flow
const GALLERY_PHOTOS = [
  'assets/photos/hero.jpg',
  'assets/photos/pool-1.jpg',
  'assets/photos/interior-1.jpg',
  'assets/photos/pool-2.jpg',
  'assets/photos/interior-2.jpg',
  'assets/photos/pool-3.jpg',
  'assets/photos/interior-3.jpg',
  'assets/photos/pool-4.jpg',
  'assets/photos/interior-4.jpg',
  'assets/photos/pool-5.jpg',
  'assets/photos/interior-5.jpg',
  'assets/photos/pool-6.jpg',
  'assets/photos/interior-6.jpg',
  'assets/photos/pool-7.jpg',
  'assets/photos/interior-7.jpg',
  'assets/photos/pool-8.jpg',
  'assets/photos/interior-8.jpg',
  'assets/photos/pool-9.jpg',
  'assets/photos/interior-9.jpg',
  'assets/photos/pool-10.jpg',
  'assets/photos/interior-10.jpg',
  'assets/photos/gameroom.jpg',
  'assets/photos/interior-11.jpg',
  'assets/photos/hottub.jpg',
  'assets/photos/interior-12.jpg',
  'assets/photos/massage.jpg',
  'assets/photos/interior-13.jpg',
  'assets/photos/interior-14.jpg',
  'assets/photos/interior-15.jpg',
  'assets/photos/interior-16.jpg',
  'assets/photos/interior-17.jpg',
  'assets/photos/interior-18.jpg',
  'assets/photos/interior-19.jpg',
  'assets/photos/interior-20.jpg',
  'assets/photos/interior-21.jpg',
  'assets/photos/interior-22.jpg',
  'assets/photos/interior-23.jpg',
  'assets/photos/interior-24.jpg',
  'assets/photos/interior-25.jpg',
  'assets/photos/interior-26.jpg',
  'assets/photos/interior-27.jpg',
  'assets/photos/interior-28.jpg',
  'assets/photos/interior-29.jpg',
  'assets/photos/interior-30.jpg',
  'assets/photos/interior-31.jpg',
  'assets/photos/interior-32.jpg',
  'assets/photos/interior-33.jpg',
  'assets/photos/interior-34.jpg',
  'assets/photos/interior-35.jpg',
  'assets/photos/interior-36.jpg',
  'assets/photos/interior-37.jpg',
  'assets/photos/interior-38.jpg',
  'assets/photos/interior-39.jpg',
  'assets/photos/interior-40.jpg',
  'assets/photos/interior-41.jpg',
  'assets/photos/interior-42.jpg',
  'assets/photos/interior-43.jpg',
  'assets/photos/interior-44.jpg',
  'assets/photos/interior-45.jpg',
  'assets/photos/interior-46.jpg',
  'assets/photos/interior-47.jpg',
  'assets/photos/interior-48.jpg',
  'assets/photos/interior-49.jpg',
  'assets/photos/interior-50.jpg',
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
  const track = document.getElementById('gallery-grid');
  const dotsEl = document.getElementById('gallery-dots');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  if (!track) return;

  // Build images
  GALLERY_PHOTOS.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Property photo ${i + 1}`;
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.addEventListener('click', () => openLightbox(i));
    track.appendChild(img);
  });

  // Build dots
  if (dotsEl) {
    GALLERY_PHOTOS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Photo ${i + 1}`);
      dot.addEventListener('click', () => scrollToPhoto(i));
      dotsEl.appendChild(dot);
    });
  }

  function getImgWidth() {
    const img = track.querySelector('img');
    if (!img) return 0;
    return img.offsetWidth + parseInt(getComputedStyle(track).gap || 12);
  }

  function scrollToPhoto(index) {
    const imgW = getImgWidth();
    track.scrollTo({ left: index * imgW, behavior: 'smooth' });
  }

  function updateDots() {
    if (!dotsEl) return;
    const imgW = getImgWidth();
    if (!imgW) return;
    const idx = Math.round(track.scrollLeft / imgW);
    dotsEl.querySelectorAll('.gallery-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const imgW = getImgWidth();
      const idx = Math.round(track.scrollLeft / imgW);
      scrollToPhoto(Math.max(0, idx - 1));
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const imgW = getImgWidth();
      const idx = Math.round(track.scrollLeft / imgW);
      scrollToPhoto(Math.min(GALLERY_PHOTOS.length - 1, idx + 1));
    });
  }

  track.addEventListener('scroll', updateDots, { passive: true });
})();

// ── Lightbox ──────────────────────────────���───────────────────────────────
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
