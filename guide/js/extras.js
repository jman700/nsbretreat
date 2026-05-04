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

// ── PWA / Add to Home Screen — icon button in nav controls ───────────────────
(function initATH() {
  var btn = document.getElementById('ath-icon-btn');
  if (!btn) return;

  // Hide if already installed as standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  var isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /Android/.test(navigator.userAgent);
  var deferredPrompt = null;
  var tooltip = null;

  // Android/Chrome — capture install prompt
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = '';
  });

  // iOS — show the button
  if (isIOS) {
    btn.style.display = '';
  }

  function closeTooltip() {
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
    }
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();

    // Android with deferred prompt — trigger native install
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function() {
        deferredPrompt = null;
        btn.style.display = 'none';
      });
      return;
    }

    // iOS / fallback — show tooltip
    if (tooltip) { closeTooltip(); return; }

    var shareIcon = '<svg viewBox="0 0 50 50" width="14" height="14" style="vertical-align:-2px;fill:currentColor;display:inline-block" aria-hidden="true"><path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path d="M24 7h2v21h-2z"/><path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg>';

    tooltip = document.createElement('div');
    tooltip.className = 'ath-tooltip';
    tooltip.innerHTML = isIOS
      ? 'Tap ' + shareIcon + ' then <strong>Add to Home Screen</strong>'
      : 'Open in Chrome and tap menu → <strong>Add to Home Screen</strong>';
    document.body.appendChild(tooltip);

    // Position below the button
    var r = btn.getBoundingClientRect();
    tooltip.style.right = (window.innerWidth - r.right) + 'px';
    tooltip.style.top = (r.bottom + 8 + window.scrollY) + 'px';

    setTimeout(function() { tooltip && tooltip.classList.add('ath-tt-visible'); }, 10);
    setTimeout(closeTooltip, 5000);
  });

  document.addEventListener('click', function() { closeTooltip(); });
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
