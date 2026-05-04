// extras.js — Dark mode, PWA install prompt, Share button for NSB Retreat guide

// ── Dark Mode ─────────────────────────────────────────────────────────────────
(function initDarkMode() {
  var html = document.documentElement;
  var btn  = document.getElementById('dark-toggle');
  if (!btn) return;

  function setDark(on) {
    if (on) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('nsb_dark', on ? 'true' : 'false');
    updateIcon(on);
  }

  function updateIcon(isDark) {
    if (isDark) {
      // Sun icon when dark (click to go light)
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
    } else {
      // Moon icon when light (click to go dark)
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  var savedDark = localStorage.getItem('nsb_dark') === 'true';
  setDark(savedDark);

  btn.addEventListener('click', function() {
    setDark(!html.classList.contains('dark'));
  });
})();

// ── PWA / Add to Home Screen ──────────────────────────────────────────────────
(function initATH() {
  // Don't show if already installed as standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  // Don't show on desktop
  if (window.innerWidth >= 768) return;
  // Don't show if dismissed
  if (localStorage.getItem('nsb_ath_dismissed') === 'true') return;

  var isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !window.MSStream;
  var deferredPrompt = null;

  // Android/Chrome — capture install prompt
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    showBanner(false);
  });

  // iOS — show custom instructions
  if (isIOS) {
    // small delay so page loads first
    setTimeout(function() { showBanner(true); }, 1500);
  }

  function showBanner(ios) {
    var existing = document.getElementById('ath-banner');
    if (existing) return;

    var banner = document.createElement('div');
    banner.id = 'ath-banner';
    banner.className = 'ath-banner';

    var houseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    var shareIcon = '<svg viewBox="0 0 50 50" width="16" height="16" style="vertical-align:middle;fill:currentColor" aria-hidden="true"><path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path d="M24 7h2v21h-2z"/><path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg>';

    if (ios) {
      banner.innerHTML =
        '<div class="ath-inner">' +
          '<span class="ath-icon">' + houseIcon + '</span>' +
          '<span class="ath-text">Tap ' + shareIcon + ' then <strong>"Add to Home Screen"</strong> for quick access</span>' +
          '<button class="ath-dismiss" id="ath-dismiss" aria-label="Dismiss">✕</button>' +
        '</div>';
    } else {
      banner.innerHTML =
        '<div class="ath-inner">' +
          '<span class="ath-icon">' + houseIcon + '</span>' +
          '<span class="ath-text">Add this guide to your home screen</span>' +
          '<button class="ath-install" id="ath-install" data-i18n="ath_install">Install App</button>' +
          '<button class="ath-dismiss" id="ath-dismiss" aria-label="Dismiss">✕</button>' +
        '</div>';
    }

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        banner.classList.add('ath-visible');
      });
    });

    document.getElementById('ath-dismiss').addEventListener('click', function() {
      dismissBanner(banner);
    });

    var installBtn = document.getElementById('ath-install');
    if (installBtn && deferredPrompt) {
      installBtn.addEventListener('click', function() {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() {
          deferredPrompt = null;
          dismissBanner(banner);
        });
      });
    }

    // Auto-dismiss after 12 seconds
    setTimeout(function() {
      if (banner.parentNode) dismissBanner(banner);
    }, 12000);
  }

  function dismissBanner(banner) {
    localStorage.setItem('nsb_ath_dismissed', 'true');
    banner.classList.remove('ath-visible');
    setTimeout(function() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 300);
  }
})();

// ── Share Guide Button ────────────────────────────────────────────────────────
(function initShare() {
  var btn = document.getElementById('share-guide-btn');
  if (!btn) return;

  btn.addEventListener('click', function() {
    var shareData = {
      title: 'NSB Retreat House Guide',
      text: 'House guide for The New Smyrna Beach Retreat at 815 Carol Ave',
      url: 'https://nsbretreat.com/guide/'
    };

    if (navigator.share) {
      navigator.share(shareData).catch(function() {});
    } else {
      navigator.clipboard.writeText(shareData.url).then(function() {
        // Get translated text if i18n available
        var msg = 'Link copied!';
        if (typeof I18N !== 'undefined' && I18N.t) {
          msg = I18N.t('share_copied') || msg;
        }
        var toast = document.getElementById('copy-toast');
        if (toast) {
          toast.textContent = msg;
          toast.classList.add('show');
          clearTimeout(toast._timer);
          toast._timer = setTimeout(function() { toast.classList.remove('show'); }, 2000);
        }
      }).catch(function() {});
    }
  });
})();

// ── Where Is It — chip tooltips ───────────────────────────────────────────────
(function initWhereIs() {
  var section = document.getElementById('whereis-section');
  if (!section) return;

  var activeChip = null;
  var activeTooltip = null;

  function closeTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (activeChip) {
      activeChip.classList.remove('wi-active');
      activeChip = null;
    }
  }

  section.addEventListener('click', function(e) {
    var chip = e.target.closest('.wi-chip');
    if (!chip) {
      closeTooltip();
      return;
    }

    // Toggle off if same chip
    if (chip === activeChip) {
      closeTooltip();
      return;
    }

    closeTooltip();

    var location = chip.dataset.location;
    var tooltip = document.createElement('div');
    tooltip.className = 'wi-tooltip';
    tooltip.textContent = location;

    chip.classList.add('wi-active');
    chip.parentNode.insertBefore(tooltip, chip.nextSibling);
    // If chip is in a grid cell, we want tooltip to appear after the chip
    // Move tooltip inside chip's parent container for correct positioning
    chip.appendChild(tooltip);

    activeChip = chip;
    activeTooltip = tooltip;
  });

  document.addEventListener('click', function(e) {
    if (activeChip && !activeChip.contains(e.target)) {
      closeTooltip();
    }
  });
})();
