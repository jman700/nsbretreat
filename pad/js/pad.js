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

  var btnSpaHeater = document.getElementById('btn-spa-heater');
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

    // Spa heater toggle
    updateToggle(btnSpaHeater, s.spa_heater);

    // Spa jets (show row only if device has jets)
    if (s.spa_jets !== undefined && rowSpaJets) {
      rowSpaJets.style.display = '';
      updateToggle(btnSpaJets, s.spa_jets);
    }

    // Pool light
    updateToggle(btnPoolLight, s.pool_light);

    // Color swatches — enabled only when light is on
    var lightOn = s.pool_light === 'on';
    colorSwatches.forEach(function(sw) {
      sw.classList.toggle('disabled', !lightOn);
      sw.classList.toggle('active', lightOn && sw.dataset.color === s.pool_light_color);
    });

    // Setpoint slider
    var sp = s.spa_set_point || 102;
    slider.value = sp;
    setpointDisp.textContent = sp + '°F';

    // Enable all controls when online
    btnSpaHeater.disabled = !s.online;
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
      .then(function(r) { return r.json(); })
      .then(function(data) { applyState(data); })
      .catch(function() {
        badge.textContent = 'Offline';
        badge.classList.add('offline');
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
          showToast(color.charAt(0).toUpperCase() + color.slice(1) + ' selected', 1500);
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

  // ── Wire up toggles ──
  handleToggle(btnSpaHeater, 'spa_heater');
  handleToggle(btnPoolLight, 'pool_light');
  if (btnSpaJets) handleToggle(btnSpaJets, 'spa_jets');

  // ── Initial load + polling ──
  fetchStatus();
  setInterval(fetchStatus, 30000);
})();
