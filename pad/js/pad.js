// pad.js — NSB Retreat iPad Guide

// ── WiFi copy ──────────────────────────────────────────────────────────────
(function initWifi() {
  var nameEl   = document.getElementById('pad-wifi-name');
  var passEl   = document.getElementById('pad-wifi-pass');
  var passCard = document.getElementById('pad-wifi-pass-card');
  var toast    = document.getElementById('copy-toast');

  if (typeof CONFIG !== 'undefined' && CONFIG.quick_info) {
    if (nameEl && CONFIG.quick_info.wifi_name)     nameEl.textContent = CONFIG.quick_info.wifi_name;
    if (passEl && CONFIG.quick_info.wifi_password) passEl.textContent = CONFIG.quick_info.wifi_password;
  }

  if (!passCard || !toast) return;

  passCard.addEventListener('click', function() {
    var val = passEl ? passEl.textContent.trim() : '';
    if (!val) return;
    navigator.clipboard.writeText(val).then(function() {
      toast.classList.add('show');
      clearTimeout(toast._t);
      toast._t = setTimeout(function() { toast.classList.remove('show'); }, 2000);
    }).catch(function() {});
  });
})();

// ── Beach Conditions ───────────────────────────────────────────────────────
(function initBeachConditions() {
  var updatedEl  = document.getElementById('beach-updated');
  var airEl      = document.getElementById('bch-air');
  var waterEl    = document.getElementById('bch-water');
  var condEl     = document.getElementById('bch-conditions');
  var windEl     = document.getElementById('bch-wind');
  var tideListEl = document.getElementById('beach-tide-list');

  function fmt(val, unit) {
    return val != null ? val + unit : '–';
  }

  function renderTides(tides) {
    if (!tides || !tides.length) { tideListEl.textContent = 'Unavailable'; return; }
    var now = Date.now();
    // Filter to upcoming events (browser parses NOAA Eastern time correctly on iPad)
    var upcoming = tides.filter(function(t) {
      return new Date(t.t) > now;
    }).slice(0, 4);

    if (!upcoming.length) { tideListEl.textContent = 'No data'; return; }

    tideListEl.innerHTML = upcoming.map(function(t) {
      var arrow = t.type === 'High' ? '↑' : '↓';
      var cls   = t.type === 'High' ? 'tide-high' : 'tide-low';
      return '<span class="tide-entry ' + cls + '">' +
        '<span class="tide-arrow">' + arrow + '</span>' +
        '<span class="tide-type">' + t.type + '</span>' +
        '<span class="tide-time">' + t.time + '</span>' +
        '<span class="tide-ht">' + t.height + '</span>' +
        '</span>';
    }).join('');
  }

  function applyBeach(d) {
    airEl.textContent   = fmt(d.air_temp,   '°F');
    waterEl.textContent = fmt(d.water_temp, '°F');
    condEl.textContent  = d.conditions || '–';

    if (d.wind_speed != null) {
      windEl.textContent = d.wind_speed + ' mph' + (d.wind_dir ? ' ' + d.wind_dir : '');
    } else {
      windEl.textContent = '–';
    }

    renderTides(d.tides);

    if (d.updated_at) {
      var t = new Date(d.updated_at);
      updatedEl.textContent = 'Updated ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }

  function fetchBeach() {
    fetch('/api/beach-conditions')
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(applyBeach)
      .catch(function() { updatedEl.textContent = 'Unavailable'; });
  }

  fetchBeach();
  setInterval(fetchBeach, 15 * 60 * 1000); // refresh every 15 min
})();

// ── Accordion ──────────────────────────────────────────────────────────────
(function initAccordion() {
  document.querySelectorAll('.acc-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var body   = trigger.nextElementSibling;
      var isOpen = body.classList.contains('open');

      document.querySelectorAll('.acc-body').forEach(function(b)    { b.classList.remove('open'); });
      document.querySelectorAll('.acc-trigger').forEach(function(t) { t.classList.remove('open'); });

      if (!isOpen) {
        body.classList.add('open');
        trigger.classList.add('open');
      }
    });
  });
})();

// ── Scrollspy ──────────────────────────────────────────────────────────────
(function initScrollSpy() {
  var sections = Array.from(document.querySelectorAll('.pad-section[id]'));
  var links    = document.querySelectorAll('.pad-tab');
  var tabs     = document.getElementById('pad-tabs');

  function update() {
    var current = sections[0] ? sections[0].id : '';
    sections.forEach(function(sec) {
      if (window.scrollY + 70 >= sec.offsetTop) current = sec.id;
    });
    links.forEach(function(link) {
      var href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === current);
    });
    if (tabs) {
      var activeLink = tabs.querySelector('.pad-tab.active');
      if (activeLink) {
        tabs.scrollLeft = activeLink.offsetLeft - (tabs.offsetWidth / 2) + (activeLink.offsetWidth / 2);
      }
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── Pool Widget ────────────────────────────────────────────────────────────
(function initPoolWidget() {
  // DOM refs
  var badge        = document.getElementById('pool-badge');
  var poolTempEl   = document.getElementById('pool-temp-val');
  var spaTempEl    = document.getElementById('spa-temp-val');
  var pumpStatusEl = document.getElementById('pool-pump-status');
  var toast        = document.getElementById('pool-toast');

  // Heater timer elements
  var heaterSub    = document.getElementById('heater-sub');
  var heaterOffUI  = document.getElementById('heater-off-ui');
  var heaterOnUI   = document.getElementById('heater-on-ui');
  var heaterCdEl   = document.getElementById('heater-countdown');
  var heaterStop   = document.getElementById('heater-stop-btn');
  var heaterDurBtns = document.querySelectorAll('.heater-dur-btn');

  var btnSpaJets   = document.getElementById('btn-spa-jets');
  var btnPoolLight = document.getElementById('btn-pool-light');
  var rowSpaJets   = document.getElementById('row-spa-jets');
  var slider       = document.getElementById('slider-spa-setpoint');
  var setpointDisp = document.getElementById('setpoint-display');
  var colorSwatches = document.querySelectorAll('.color-swatch');

  // Local state — mirrors last known device state
  var state = {
    online:           false,
    spa_heater:       'off',
    spa_jets:         'off',
    pool_light:       'off',
    pool_light_color: 'white',
    spa_set_point:    102,
    pool_pump:        'off',
  };

  // ── Toast helper ──
  function showToast(msg, duration) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove('show'); }, duration || 2500);
  }

  // ── Apply state to DOM ──
  function applyState(s) {
    // Badge
    badge.textContent = s.online ? 'Online' : 'Offline';
    badge.classList.toggle('offline', !s.online);

    // Temps
    poolTempEl.innerHTML = s.pool_temp != null
      ? s.pool_temp + '<span class="temp-unit">°F</span>'
      : '<span class="temp-loading">–</span>';
    spaTempEl.innerHTML = s.spa_temp != null
      ? s.spa_temp + '<span class="temp-unit">°F</span>'
      : '<span class="temp-loading">–</span>';

    // Pool pump
    pumpStatusEl.textContent = s.pool_pump === 'on' ? 'Running' : 'Off';

    // Spa heater — handled by timer logic
    updateHeaterFromAPI(s.online, s.spa_heater);

    // Spa jets (show row only if device has jets)
    if (s.spa_jets !== undefined && rowSpaJets) {
      rowSpaJets.style.display = '';
      updateToggle(btnSpaJets, s.spa_jets);
    }

    // Pool light
    updateToggle(btnPoolLight, s.pool_light);

    // Color swatches — enabled only when light is on.
    // Active color: use API value if known, otherwise fall back to last color we sent.
    var lightOn = s.pool_light === 'on';
    var activeColor = s.pool_light_color || (lightOn ? localStorage.getItem('nsb_light_color') : null);
    colorSwatches.forEach(function(sw) {
      sw.classList.toggle('disabled', !lightOn);
      sw.classList.toggle('active', lightOn && !!activeColor && sw.dataset.color === activeColor);
    });

    // Setpoint slider
    var sp = s.spa_set_point || 102;
    slider.value = sp;
    setpointDisp.textContent = sp + '°F';

    // Enable all controls when online
    heaterDurBtns.forEach(function(b) { b.disabled = !s.online; });
    if (heaterStop) heaterStop.disabled = !s.online;
    btnPoolLight.disabled = !s.online;
    slider.disabled       = !s.online;
    if (btnSpaJets) btnSpaJets.disabled = !s.online;

    Object.assign(state, s);
  }

  function updateToggle(btn, val) {
    if (!btn) return;
    var isOn = val === 'on';
    btn.textContent = isOn ? 'On' : 'Off';
    btn.classList.toggle('on', isOn);
    btn.dataset.state = val;
  }

  // ── Fetch status ──
  function fetchStatus() {
    fetch('/api/pool-status')
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        applyState(data);
      })
      .catch(function(err) {
        console.error('pool-status fetch failed:', err);
        // Show offline badge
        if (badge) {
          badge.textContent = 'Offline';
          badge.className = 'pool-badge offline';
        }
      });
  }

  // ── Send command ──
  function sendCommand(command, value, onSuccess, onError) {
    fetch('/api/pool-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: command, value: value }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          if (onSuccess) onSuccess();
        } else {
          showToast('Error: ' + (data.error || 'Unknown error'));
          if (onError) onError();
        }
      })
      .catch(function() {
        showToast('Connection error — try again.');
        if (onError) onError();
      });
  }

  // ── Toggle button handler ──
  function handleToggle(btn, command) {
    btn.addEventListener('click', function() {
      var newVal  = btn.dataset.state === 'on' ? 'off' : 'on';
      var prevVal = btn.dataset.state;

      // Optimistic update
      updateToggle(btn, newVal);
      btn.disabled = true;

      // Special: update color swatches immediately when light toggled
      if (command === 'pool_light') {
        var lightOn = newVal === 'on';
        colorSwatches.forEach(function(sw) {
          sw.classList.toggle('disabled', !lightOn);
        });
      }

      sendCommand(command, newVal,
        function() {
          btn.disabled = false;
          showToast(command.replace('_', ' ') + ' ' + newVal, 1800);
        },
        function() {
          // Revert on error
          updateToggle(btn, prevVal);
          btn.disabled = false;
          if (command === 'pool_light') {
            colorSwatches.forEach(function(sw) {
              sw.classList.toggle('disabled', prevVal !== 'on');
            });
          }
        }
      );
    });
  }

  // ── Setpoint slider ──
  var sliderTimer;
  slider.addEventListener('input', function() {
    setpointDisp.textContent = slider.value + '°F';
    clearTimeout(sliderTimer);
    sliderTimer = setTimeout(function() { sendCommand('spa_setpoint', parseInt(slider.value, 10)); }, 300);
  });

  // ── Color swatches ──
  colorSwatches.forEach(function(sw) {
    sw.addEventListener('click', function() {
      if (sw.classList.contains('disabled')) return;
      var color     = sw.dataset.color;
      var prevColor = state.pool_light_color;

      // Optimistic
      colorSwatches.forEach(function(s) { s.classList.remove('active'); });
      sw.classList.add('active');

      sendCommand('pool_light_color', color,
        function() {
          state.pool_light_color = color;
          localStorage.setItem('nsb_light_color', color);
          var label = sw.getAttribute('title') || color;
          showToast(label + ' selected', 1500);
        },
        function() {
          // Revert
          colorSwatches.forEach(function(s) {
            s.classList.toggle('active', s.dataset.color === prevColor);
          });
        }
      );
    });
  });

  // ── Spa Heater Timer ──────────────────────────────────────────────────────
  var TIMER_KEY     = 'nsb_spa_end';
  var cdInterval    = null;

  function fmtCountdown(ms) {
    if (ms <= 0) return '0:00:00';
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    s = s % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function showHeaterOn(endTime) {
    heaterOffUI.style.display = 'none';
    heaterOnUI.style.display  = '';
    if (endTime) {
      heaterSub.textContent = 'Running — shuts off automatically';
      heaterCdEl.textContent = fmtCountdown(endTime - Date.now());
      clearInterval(cdInterval);
      cdInterval = setInterval(function() {
        var rem = endTime - Date.now();
        if (rem <= 0) {
          clearInterval(cdInterval);
          doHeaterOff(true); // auto-off
          return;
        }
        heaterCdEl.textContent = fmtCountdown(rem);
      }, 1000);
    } else {
      heaterSub.textContent = 'Running — no timer set';
      heaterCdEl.textContent = '–';
    }
  }

  function showHeaterOff() {
    clearInterval(cdInterval);
    heaterOffUI.style.display = '';
    heaterOnUI.style.display  = 'none';
    heaterSub.textContent = 'Select a duration to start';
  }

  function doHeaterOff(autoOff) {
    localStorage.removeItem(TIMER_KEY);
    showHeaterOff();
    // Send heater off then spa mode off
    sendCommand('spa_heater', 'off', function() {
      sendCommand('spa_mode', 'off');
    });
    if (autoOff) showToast('Spa heater timer expired — turned off.', 4000);
  }

  function updateHeaterFromAPI(isOnline, heaterState) {
    if (!isOnline) return;
    var savedEnd  = localStorage.getItem(TIMER_KEY);
    var timerEnd  = savedEnd ? parseInt(savedEnd, 10) : null;
    var timerLive = timerEnd && timerEnd > Date.now();

    if (heaterState === 'on') {
      // Heater is on — show on UI (restore countdown if we have one)
      if (heaterOnUI.style.display === 'none') showHeaterOn(timerLive ? timerEnd : null);
    } else {
      // Heater is off — if timer was running, it was cancelled externally
      if (timerLive) {
        localStorage.removeItem(TIMER_KEY);
        clearInterval(cdInterval);
      }
      showHeaterOff();
    }
  }

  // Duration buttons — start heater + spa mode for selected hours
  heaterDurBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var hours   = parseInt(btn.dataset.hours, 10);
      var endTime = Date.now() + hours * 3600 * 1000;
      localStorage.setItem(TIMER_KEY, endTime.toString());
      showHeaterOn(endTime);
      heaterDurBtns.forEach(function(b) { b.disabled = true; });
      // Send spa_heater on, then spa_mode on
      sendCommand('spa_heater', 'on', function() {
        sendCommand('spa_mode', 'on', function() {
          heaterDurBtns.forEach(function(b) { b.disabled = false; });
          showToast('Spa heater on — ' + hours + ' hr timer started', 2500);
        }, function() {
          heaterDurBtns.forEach(function(b) { b.disabled = false; });
        });
      }, function() {
        // Heater command failed — cancel timer
        localStorage.removeItem(TIMER_KEY);
        showHeaterOff();
        heaterDurBtns.forEach(function(b) { b.disabled = false; });
      });
    });
  });

  // Stop button
  if (heaterStop) {
    heaterStop.addEventListener('click', function() {
      doHeaterOff(false);
      showToast('Spa heater turned off.', 2000);
    });
  }

  // Restore timer on page load before first poll
  (function restoreTimer() {
    var savedEnd = localStorage.getItem(TIMER_KEY);
    if (savedEnd) {
      var end = parseInt(savedEnd, 10);
      if (end > Date.now()) showHeaterOn(end);
      else localStorage.removeItem(TIMER_KEY);
    }
  })();

  // ── Wire up toggles ──
  handleToggle(btnPoolLight, 'pool_light');
  if (btnSpaJets) handleToggle(btnSpaJets, 'spa_jets');

  // ── Initial load + polling ──
  fetchStatus();
  setInterval(fetchStatus, 30000);
})();
