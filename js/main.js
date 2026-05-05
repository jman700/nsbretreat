// Jump to Top
(function() {
  const btn = document.getElementById('jump-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

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

// Contact dropdown
(function() {
  const btn  = document.getElementById('nav-contact-btn');
  const drop = document.getElementById('nav-drop');
  if (!btn || !drop) return;

  function openDrop() {
    const rect = btn.getBoundingClientRect();
    // Position below the button, right-aligned to its right edge
    drop.style.top  = (rect.bottom + 6) + 'px';
    const left = Math.min(rect.right - 240, window.innerWidth - 248);
    drop.style.left = Math.max(8, left) + 'px';
    drop.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    drop.setAttribute('aria-hidden', 'false');
  }

  function closeDrop() {
    drop.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    drop.setAttribute('aria-hidden', 'true');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    drop.classList.contains('open') ? closeDrop() : openDrop();
  });

  document.addEventListener('click', closeDrop);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrop(); });
})();

// ── Conditions badge (hero) ───────────────────────────────────────────────
(function() {
  var badge = document.getElementById('conditions-badge');
  var tempEl = document.getElementById('conditions-temp');
  if (!badge || !tempEl) return;
  fetch('https://api.open-meteo.com/v1/forecast?latitude=29.026&longitude=-80.926&current=temperature_2m&temperature_unit=fahrenheit&forecast_days=1')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var temp = Math.round(data.current.temperature_2m);
      tempEl.textContent = temp + '°F';
      badge.style.display = '';
    })
    .catch(function() {});
})();

// Wire Airbnb URL from config
const airbnbUrl = typeof CONFIG !== 'undefined' ? CONFIG.airbnb_url : '#';
document.querySelectorAll('[data-airbnb-link]').forEach(el => { el.href = airbnbUrl; });

// ── Scrollspy ────────────────────────────────────────────────────────────
(function initScrollspy() {
  const navList = document.getElementById('nav-links');
  if (!navList) return;
  const ids = ['property', 'gallery', 'amenities', 'availability', 'hosts', 'faq'];
  const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  function setActive(id) {
    navList.querySelectorAll('a[href^="#"]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
    // On mobile (horizontal scroll nav): bring active link into center view
    const link = navList.querySelector('a[href="#' + id + '"]');
    if (link && navList.scrollWidth > navList.clientWidth) {
      const linkMid = link.offsetLeft + link.offsetWidth / 2;
      navList.scrollTo({ left: linkMid - navList.clientWidth / 2, behavior: 'smooth' });
    }
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
})();

// ── Gallery ───────────────────────────���──────────────────────────��────────
// Gallery photos — interleaved pool/backyard and interior for balanced flow
const GALLERY_PHOTOS = [
  'assets/photos/hero.jpg',
  'assets/photos/pool-1.jpg',
  'assets/photos/interior-1.jpg',
  'assets/photos/pool-2.jpg',
  'assets/photos/interior-3.jpg',
  'assets/photos/pool-3.jpg',
  'assets/photos/interior-5.jpg',
  'assets/photos/pool-4.jpg',
  'assets/photos/interior-8.jpg',
  'assets/photos/pool-5.jpg',
  'assets/photos/gameroom.jpg',
  'assets/photos/pool-6.jpg',
  'assets/photos/interior-10.jpg',
  'assets/photos/pool-7.jpg',
  'assets/photos/hottub.jpg',
  'assets/photos/pool-8.jpg',
  'assets/photos/interior-13.jpg',
  'assets/photos/pool-9.jpg',
  'assets/photos/massage.jpg',
  'assets/photos/pool-10.jpg',
  'assets/photos/interior-16.jpg',
  'assets/photos/interior-20.jpg',
  'assets/photos/interior-24.jpg',
  'assets/photos/interior-28.jpg',
  'assets/photos/interior-32.jpg',
  'assets/photos/interior-36.jpg',
  'assets/photos/interior-40.jpg',
  'assets/photos/interior-44.jpg',
  'assets/photos/interior-48.jpg',
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

// ── Reviews Carousel ─────────────────────────────────────────────────────
(function initReviews() {
  const track = document.getElementById('reviews-track');
  const prev  = document.getElementById('reviews-prev');
  const next  = document.getElementById('reviews-next');
  if (!track) return;

  function cardW() {
    const card = track.querySelector('.review-card');
    if (!card) return 320;
    return card.offsetWidth + parseInt(getComputedStyle(track).gap || 20);
  }

  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -cardW(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left:  cardW(), behavior: 'smooth' }));
})();

// ── Lightbox ─────────────────────────────────────────────────────────────
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
