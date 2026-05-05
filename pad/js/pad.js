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

// ── Local Guide Filter ─────────────────────────────────────────────────────
(function initFilter() {
  var btns  = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.place-card');

  function applyFilter(f) {
    cards.forEach(function(c) {
      c.style.display = (!f || c.dataset.category === f) ? '' : 'none';
    });
  }

  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      btns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  var activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) applyFilter(activeBtn.dataset.filter);
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

    // Spa heater — handled by timer logic (end time comes from server)
    updateHeaterFromAPI(s.online, s.spa_heater, s.spa_end_time || null);

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
    // Spa jets only allowed while heater is on
    if (btnSpaJets) {
      var jetsAllowed = s.online && s.spa_heater === 'on';
      btnSpaJets.disabled = !jetsAllowed;
      btnSpaJets.title    = jetsAllowed ? '' : 'Start the hot tub heater first';
    }

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

  // ── Spa Heater Timer (Supabase-backed, durable across all clients) ─────────
  var cdInterval = null;

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
    clearInterval(cdInterval);
    if (endTime && endTime > Date.now()) {
      heaterSub.textContent  = 'Running — shuts off automatically';
      heaterCdEl.textContent = fmtCountdown(endTime - Date.now());
      cdInterval = setInterval(function() {
        var rem = endTime - Date.now();
        if (rem <= 0) {
          clearInterval(cdInterval);
          // Server will send the off command on next poll — just update UI
          showHeaterOff();
          showToast('Spa heater timer expired — turned off.', 4000);
          return;
        }
        heaterCdEl.textContent = fmtCountdown(rem);
      }, 1000);
    } else {
      heaterSub.textContent  = 'Running — no timer set';
      heaterCdEl.textContent = '–';
    }
  }

  function showHeaterOff() {
    clearInterval(cdInterval);
    heaterOffUI.style.display = '';
    heaterOnUI.style.display  = 'none';
    heaterSub.textContent = 'Select a duration to start';
  }

  // Write timer to Supabase, then send heater commands
  function doHeaterOn(hours) {
    heaterDurBtns.forEach(function(b) { b.disabled = true; });
    var endTime = Date.now() + hours * 3600 * 1000;
    showHeaterOn(endTime); // optimistic UI

    // 1. Persist timer in Supabase
    fetch('/api/spa-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: hours, source: 'pad' }),
    }).catch(function(e) { console.error('spa-timer POST failed:', e); });

    // 2. Send hardware commands — spa pump routes water, heater warms it
    sendCommand('spa_mode', 'on');  // set_spa_pump — best effort, don't block
    sendCommand('spa_heater', 'on', function() {
      heaterDurBtns.forEach(function(b) { b.disabled = false; });
      showToast('Spa heater on — ' + hours + ' hr timer started', 2500);
    }, function() {
      // Heater command failed — clear optimistic UI and delete timer
      showHeaterOff();
      heaterDurBtns.forEach(function(b) { b.disabled = false; });
      fetch('/api/spa-timer', { method: 'DELETE' })
        .catch(function(e) { console.error('spa-timer DELETE failed:', e); });
    });
  }

  // Clear timer from Supabase, then send off commands
  function doHeaterOff() {
    showHeaterOff();
    // 1. Clear timer in Supabase
    fetch('/api/spa-timer', { method: 'DELETE' })
      .catch(function(e) { console.error('spa-timer DELETE failed:', e); });
    // 2. Send hardware commands
    sendCommand('spa_heater', 'off');
    sendCommand('spa_mode', 'off');  // set_spa_pump off — best effort
  }

  // updateHeaterFromAPI — driven by pool-status response (endTime is server-provided)
  // Always call showHeaterOn so the countdown is restored from the server after a
  // page refresh.  The 30-second re-sync causes at most a 1–2 s tick correction.
  function updateHeaterFromAPI(isOnline, heaterState, endTime) {
    if (!isOnline) return;
    if (heaterState === 'on') {
      showHeaterOn(endTime);
    } else {
      showHeaterOff();
    }
  }

  // Duration buttons
  heaterDurBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var hours = parseInt(btn.dataset.hours, 10);
      doHeaterOn(hours);
    });
  });

  // Stop button
  if (heaterStop) {
    heaterStop.addEventListener('click', function() {
      doHeaterOff();
      showToast('Spa heater turned off.', 2000);
    });
  }

  // No localStorage restore needed — server sends spa_end_time on first poll

  // ── Wire up toggles ──
  handleToggle(btnPoolLight, 'pool_light');
  if (btnSpaJets) handleToggle(btnSpaJets, 'spa_jets');

  // ── Initial load + polling ──
  fetchStatus();
  setInterval(fetchStatus, 30000);
})();
