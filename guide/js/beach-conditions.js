// beach-conditions.js — Live beach conditions widget for NSB Retreat guide

// Self-contained widget styles — injected so they work regardless of CSS caching
(function injectWidgetStyles() {
  if (document.getElementById('bc-widget-style')) return;
  var s = document.createElement('style');
  s.id = 'bc-widget-style';
  s.textContent =
    // ── Forecast strip ──
    '.bc-forecast-strip{display:flex;gap:.5rem;overflow-x:auto;padding:0 0 .25rem;scrollbar-width:none}' +
    '.bc-forecast-strip::-webkit-scrollbar{display:none}' +
    // ── Forecast day card ──
    '.bc-forecast-day{flex:0 0 auto;min-width:70px;background:var(--blush,#f9ece8);border:1px solid var(--tan,#d4c4b0);border-radius:var(--radius-sm,8px);padding:.625rem .5rem;display:flex;flex-direction:column;align-items:center;gap:.2rem;text-align:center}' +
    '.bc-fc-day{font-size:.62rem;font-weight:600;letter-spacing:.08em;color:var(--charcoal-lighter,#9a918c);text-transform:uppercase}' +
    '.bc-fc-icon{display:flex;justify-content:center;align-items:center;margin:.2rem 0}' +
    '.bc-fc-temps{display:flex;flex-direction:column;gap:.05rem;align-items:flex-start}' +
    '.bc-fc-temp-row{display:flex;align-items:baseline;gap:3px}' +
    '.bc-fc-temp-lbl{font-size:.5rem;font-weight:700;letter-spacing:.05em;color:var(--charcoal-lighter,#9a918c);text-transform:uppercase}' +
    '.bc-fc-hi{font-size:.9rem;font-weight:600;color:var(--charcoal,#2d2926)}' +
    '.bc-fc-lo{font-size:.85rem;color:var(--charcoal-light,#6b6460)}' +
    '.bc-fc-rain{display:flex;align-items:center;gap:2px;font-size:.65rem;color:#4a8aaa}' +
    '.bc-fc-wind{font-size:.65rem;color:var(--charcoal-light,#6b6460)}' +
    // ── Section label ──
    '.bc-section-label{font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:var(--charcoal-light,#6b6460);margin:.875rem 0 .5rem}' +
    // ── Action cards (flags & cam) ──
    '.bc-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:.625rem;margin-top:.875rem}' +
    '.bc-action-card{background:var(--blush,#f9ece8);border:1px solid var(--tan,#d4c4b0);border-radius:var(--radius-sm,8px);padding:.875rem .625rem;display:flex;flex-direction:column;align-items:center;gap:.25rem;text-decoration:none;color:var(--charcoal,#2d2926);text-align:center;-webkit-tap-highlight-color:transparent}' +
    '.bc-action-icon{display:flex;justify-content:center;align-items:center;margin-bottom:.1rem}' +
    '.bc-action-label{font-size:.75rem;font-weight:600;color:var(--charcoal,#2d2926);letter-spacing:.01em}' +
    '.bc-action-hint{font-size:.65rem;color:var(--charcoal-light,#6b6460)}' +
    // ── Dark mode ──
    'html.dark .bc-forecast-day{background:#2a211c;border-color:#3a2e28}' +
    'html.dark .bc-fc-hi{color:#f0ebe6}html.dark .bc-fc-lo{color:#9a8a82}' +
    'html.dark .bc-fc-day{color:#7a7370}html.dark .bc-fc-wind{color:#7a7370}' +
    'html.dark .bc-action-card{background:#2a211c;border-color:#3a2e28;color:#f0ebe6}' +
    'html.dark .bc-action-label{color:#f0ebe6}html.dark .bc-action-hint{color:#9a8a82}';
  document.head.appendChild(s);
})();

(function initBeachConditions() {
  var SUN_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;color:var(--accent,#b8967e)" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var MOON_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;color:var(--charcoal-light,#6b6460)" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=29.026&longitude=-80.926&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,uv_index&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=7&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code,sunrise,sunset&timezone=America%2FNew_York';
  var MARINE_URL  = 'https://marine-api.open-meteo.com/v1/marine?latitude=29.026&longitude=-80.926&current=wave_height,sea_surface_temperature';

  function tideURL() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var dateStr = y + m + d;
    return 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8721147&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=h&units=english&application=web_services&format=json&begin_date=' + dateStr + '&end_date=' + dateStr;
  }

  function degreesToCompass(deg) {
    var dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function uvLabel(uv) {
    if (uv <= 2) return { text: 'Low', cls: 'uv-low' };
    if (uv <= 5) return { text: 'Moderate', cls: 'uv-moderate' };
    if (uv <= 7) return { text: 'High', cls: 'uv-high' };
    if (uv <= 10) return { text: 'Very High', cls: 'uv-very-high' };
    return { text: 'Extreme', cls: 'uv-extreme' };
  }

  function formatTime(isoStr) {
    var d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatSunTime(isoStr) {
    var d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function buildTideChart(predictions) {
    var W = 460, H = 108, PX = 16, PY = 22;
    var vals = predictions.map(function(p) { return parseFloat(p.v); });
    var hours = predictions.map(function(p) {
      return parseInt(p.t.split(' ')[1].split(':')[0], 10);
    });

    var minV = Math.min.apply(null, vals);
    var maxV = Math.max.apply(null, vals);
    var range = maxV - minV || 1;
    var n = vals.length;
    var stepX = (W - PX * 2) / Math.max(n - 1, 1);

    function px(i) { return PX + i * stepX; }
    function py(v) { return H - PY - ((v - minV) / range) * (H - PY * 2); }

    // Smooth Catmull-Rom → cubic bezier
    var pts = vals.map(function(v, i) { return [px(i), py(v)]; });
    var linePath = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i > 0 ? i - 1 : 0];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i < pts.length - 2 ? i + 2 : i + 1];
      var cp1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1);
      var cp1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1);
      var cp2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1);
      var cp2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1);
      linePath += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    var areaPath = linePath + ' L' + px(n - 1).toFixed(1) + ',' + (H - PY) + ' L' + PX + ',' + (H - PY) + ' Z';

    // Hi / Lo indices
    var maxIdx = vals.indexOf(maxV);
    var minIdx = vals.indexOf(minV);

    // Current hour marker
    var nowH = new Date().getHours();
    var nowIdx = hours.indexOf(nowH);
    if (nowIdx < 0) nowIdx = Math.min(nowH, n - 1);
    var nowX = px(nowIdx).toFixed(1);
    var nowY = py(vals[nowIdx]).toFixed(1);
    var nowTxtX = Math.min(Math.max(px(nowIdx), 22), W - 22).toFixed(1);

    // Hour labels every 6h
    var timeLabels = '';
    for (var j = 0; j < n; j += 6) {
      var h = hours[j] !== undefined ? hours[j] : j;
      var lbl = h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p';
      timeLabels += '<text x="' + px(j).toFixed(1) + '" y="' + (H + 6) + '" text-anchor="middle" class="bc-tide-hour">' + lbl + '</text>';
    }

    // Hi / Lo labels
    var hiX = Math.min(Math.max(px(maxIdx), 26), W - 26).toFixed(1);
    var loX = Math.min(Math.max(px(minIdx), 26), W - 26).toFixed(1);
    var hiLabel = '<text x="' + hiX + '" y="' + Math.max(py(maxV) - 7, 12).toFixed(1) + '" text-anchor="middle" class="bc-tide-lbl bc-tide-hi">' + maxV.toFixed(1) + ' ft</text>';
    var loLabel = '<text x="' + loX + '" y="' + Math.min(py(minV) + 14, H - 4).toFixed(1) + '" text-anchor="middle" class="bc-tide-lbl bc-tide-lo">' + minV.toFixed(1) + ' ft</text>';

    return '<svg class="bc-tide-svg" viewBox="0 0 ' + W + ' ' + (H + 16) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#5b9fbb" stop-opacity="0.28"/>' +
        '<stop offset="100%" stop-color="#5b9fbb" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="' + areaPath + '" fill="url(#tideGrad)"/>' +
      '<path d="' + linePath + '" fill="none" stroke="#5b9fbb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<line x1="' + nowX + '" y1="' + PY + '" x2="' + nowX + '" y2="' + (H - PY) + '" stroke="var(--accent,#b8967e)" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.8"/>' +
      '<circle cx="' + nowX + '" cy="' + nowY + '" r="5" fill="var(--accent,#b8967e)" opacity="0.2"/>' +
      '<circle cx="' + nowX + '" cy="' + nowY + '" r="2.8" fill="var(--accent,#b8967e)"/>' +
      '<text x="' + nowTxtX + '" y="' + (PY - 6) + '" text-anchor="middle" class="bc-tide-now-lbl">Now</text>' +
      hiLabel + loLabel + timeLabels +
    '</svg>';
  }

  // ── Lucide SVG helper ──
  function lucide(paths, color, size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size||22) + '" height="' + (size||22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color||'currentColor') + '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  var WX = {
    sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41m12.73 12.73 1.41 1.41M2 12h2M20 12h2m-15.66 5.66-1.41 1.41m14.14-14.14-1.41 1.41"/>',
    cloudSun:  '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    cloud:     '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    fog:       '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/>',
    drizzle:   '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>',
    rain:      '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
    snow:      '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>',
    lightning: '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
  };

  function wmoIcon(code) {
    if (code === 0)  return lucide(WX.sun,       '#e8980a');
    if (code <= 2)   return lucide(WX.cloudSun,  '#b09a60');
    if (code <= 3)   return lucide(WX.cloud,     '#8a9298');
    if (code <= 49)  return lucide(WX.fog,       '#8a9aa8');
    if (code <= 59)  return lucide(WX.drizzle,   '#5a8aaa');
    if (code <= 69)  return lucide(WX.rain,      '#4a78aa');
    if (code <= 79)  return lucide(WX.snow,      '#7ab0cc');
    if (code <= 84)  return lucide(WX.rain,      '#4a78aa');
    return lucide(WX.lightning, '#c47820');
  }

  function renderForecast(container, daily) {
    if (!daily || !daily.weather_code) return;
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    var wrap = document.createElement('div');

    var lbl = document.createElement('div');
    lbl.className = 'bc-section-label';
    lbl.textContent = '5-Day Forecast';
    wrap.appendChild(lbl);

    var strip = document.createElement('div');
    strip.className = 'bc-forecast-strip';

    for (var i = 0; i < 7; i++) {
      var code = daily.weather_code[i];
      if (code === undefined || code === null) continue;
      var hiF = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : '—';
      var loF = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : '—';
      var precip = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
      var wind = daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[i]) : '—';
      var dayLabel = i === 0 ? 'Today' : days[new Date(Date.now() + i * 86400000).getDay()];
      var dropletSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>';
      var rainHTML = '<span class="bc-fc-rain">' + dropletSVG + (precip || 0) + '%</span>';
      var card = document.createElement('div');
      card.className = 'bc-forecast-day';
      card.innerHTML =
        '<span class="bc-fc-day">' + dayLabel + '</span>' +
        '<span class="bc-fc-icon">' + wmoIcon(code) + '</span>' +
        '<div class="bc-fc-temps">' +
          '<div class="bc-fc-temp-row"><span class="bc-fc-temp-lbl">H</span><span class="bc-fc-hi">' + hiF + '°</span></div>' +
          '<div class="bc-fc-temp-row"><span class="bc-fc-temp-lbl">L</span><span class="bc-fc-lo">' + loF + '°</span></div>' +
        '</div>' +
        rainHTML +
        '<span class="bc-fc-wind">' + wind + ' mph</span>';
      strip.appendChild(card);
    }

    wrap.appendChild(strip);
    container.appendChild(wrap);
  }

  function renderSkeleton(container) {
    container.innerHTML =
      '<div class="beach-cond-grid">' +
        '<div class="bc-card bc-loading"><div class="bc-skel"></div><div class="bc-skel bc-skel-sm"></div></div>'.repeat(8) +
      '</div>' +
      '<div class="bc-tide-wrap"><div class="bc-skel" style="height:108px;border-radius:8px"></div></div>';
  }

  var FLAG_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/></svg>';
  var CAM_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/></svg>';

  var LINKS_HTML =
    '<div class="bc-action-grid">' +
      '<a class="bc-action-card" href="https://www.volusia.org/services/public-protection/beach-safety/beachcams-and-daily-safety-report.stml" target="_blank" rel="noopener" data-i18n="beach_flag_link">' +
        '<span class="bc-action-icon">' + FLAG_SVG + '</span>' +
        '<span class="bc-action-label">Beach Flags &amp; Cams</span>' +
        '<span class="bc-action-hint">Volusia County</span>' +
      '</a>' +
      '<a class="bc-action-card" href="https://www.youtube.com/watch?v=kB2PZC-ow68" target="_blank" rel="noopener">' +
        '<span class="bc-action-icon">' + CAM_SVG + '</span>' +
        '<span class="bc-action-label">Live Beach Cam</span>' +
        '<span class="bc-action-hint">NSB · YouTube</span>' +
      '</a>' +
    '</div>';

  function renderError(container) {
    container.innerHTML =
      '<p class="bc-error">Unable to load conditions right now. Try again in a moment.</p>' +
      LINKS_HTML;
  }

  function renderConditions(container, wx, marine, tides) {
    var wc = wx.current;
    var mc = marine.current;
    var waveM = mc.wave_height;
    var waveFt = (waveM * 3.281).toFixed(1);
    var waterTempF = Math.round(mc.sea_surface_temperature * 9/5 + 32);
    var windDir = degreesToCompass(wc.wind_direction_10m);
    var uv = uvLabel(wc.uv_index);
    var updatedAt = wc.time ? formatTime(wc.time) : '—';

    var sunrise = (wx.daily && wx.daily.sunrise && wx.daily.sunrise[0]) ? formatSunTime(wx.daily.sunrise[0]) : '—';
    var sunset  = (wx.daily && wx.daily.sunset  && wx.daily.sunset[0])  ? formatSunTime(wx.daily.sunset[0])  : '—';

    var tideHTML = '';
    if (tides && tides.predictions && tides.predictions.length) {
      tideHTML =
        '<div class="bc-tide-wrap">' +
          '<div class="bc-tide-label">Tide Chart &middot; Ponce Inlet</div>' +
          buildTideChart(tides.predictions) +
        '</div>';
    }

    container.innerHTML =
      '<div class="beach-cond-grid">' +
        '<div class="bc-card">' +
          '<span class="bc-label">Air Temp</span>' +
          '<span class="bc-value">' + Math.round(wc.temperature_2m) + '°F</span>' +
          '<span class="bc-sub">feels like ' + Math.round(wc.apparent_temperature) + '°F</span>' +
        '</div>' +
        '<div class="bc-card">' +
          '<span class="bc-label">Water Temp</span>' +
          '<span class="bc-value">' + waterTempF + '°F</span>' +
          '<span class="bc-sub">sea surface</span>' +
        '</div>' +
        '<div class="bc-card">' +
          '<span class="bc-label">Wind</span>' +
          '<span class="bc-value">' + Math.round(wc.wind_speed_10m) + ' mph</span>' +
          '<span class="bc-sub">' + windDir + '</span>' +
        '</div>' +
        '<div class="bc-card">' +
          '<span class="bc-label">Wave Height</span>' +
          '<span class="bc-value">' + waveFt + ' ft</span>' +
          '<span class="bc-sub">(' + waveM.toFixed(2) + ' m)</span>' +
        '</div>' +
        '<div class="bc-card bc-uv ' + uv.cls + '">' +
          '<span class="bc-label">UV Index</span>' +
          '<span class="bc-value">' + Math.round(wc.uv_index) + '</span>' +
          '<span class="bc-sub">' + uv.text + '</span>' +
        '</div>' +
        '<div class="bc-card">' +
          '<span class="bc-label">Sunrise</span>' +
          '<span class="bc-value bc-value-sm">' + SUN_ICON + sunrise + '</span>' +
          '<span class="bc-sub">today</span>' +
        '</div>' +
        '<div class="bc-card">' +
          '<span class="bc-label">Sunset</span>' +
          '<span class="bc-value bc-value-sm">' + MOON_ICON + sunset + '</span>' +
          '<span class="bc-sub">today</span>' +
        '</div>' +
        '<div class="bc-card bc-updated">' +
          '<span class="bc-label">Updated</span>' +
          '<span class="bc-value bc-value-sm">' + updatedAt + '</span>' +
          '<span class="bc-sub">local time</span>' +
        '</div>' +
      '</div>' +
      tideHTML;

    renderForecast(container, wx.daily);
    container.insertAdjacentHTML('beforeend', LINKS_HTML);

    if (typeof I18N !== 'undefined' && I18N.applyLang) {
      I18N.applyLang();
    }
  }

  function load() {
    var widget = document.getElementById('beach-cond-widget');
    if (!widget) return;

    renderSkeleton(widget);

    Promise.all([
      fetch(WEATHER_URL).then(function(r) { return r.json(); }),
      fetch(MARINE_URL).then(function(r) { return r.json(); }),
      fetch(tideURL()).then(function(r) { return r.json(); }).catch(function() { return null; })
    ]).then(function(results) {
      renderConditions(widget, results[0], results[1], results[2]);
    }).catch(function() {
      renderError(widget);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
