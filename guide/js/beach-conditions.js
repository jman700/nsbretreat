// beach-conditions.js — Live beach conditions widget for NSB Retreat guide

(function injectForecastStyles() {
  if (document.getElementById('bc-forecast-style')) return;
  var s = document.createElement('style');
  s.id = 'bc-forecast-style';
  s.textContent = '.bc-forecast-strip{display:flex;gap:8px;overflow-x:auto;padding:12px 0 4px;scrollbar-width:none}.bc-forecast-strip::-webkit-scrollbar{display:none}.bc-forecast-day{flex:0 0 auto;min-width:72px;background:var(--card,rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}.bc-fc-day{font-size:0.72rem;font-weight:600;letter-spacing:0.04em;color:var(--charcoal-light,#9a918c);text-transform:uppercase}.bc-fc-icon{font-size:1.5rem;line-height:1}.bc-fc-temps{display:flex;gap:4px;align-items:center}.bc-fc-hi{font-size:0.88rem;font-weight:600;color:var(--charcoal,#2d2926)}.bc-fc-lo{font-size:0.78rem;color:var(--charcoal-light,#9a918c)}.bc-fc-rain{font-size:0.72rem;color:#4a8aaa}.bc-fc-wind{font-size:0.72rem;color:var(--charcoal-light,#9a918c)}';
  document.head.appendChild(s);
})();

(function initBeachConditions() {
  var SUN_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;color:var(--accent,#b8967e)" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var MOON_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;color:var(--charcoal-light,#6b6460)" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=29.026&longitude=-80.926&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,uv_index&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=6&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code,sunrise,sunset&timezone=America%2FNew_York';
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
    // Open-Meteo daily returns ISO strings like "2024-01-01T06:45"
    var d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function buildTideChart(predictions) {
    var W = 460, H = 88, PX = 14, PY = 14;
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

    // Build area fill path (closed) and line
    var linePoints = vals.map(function(v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' ');
    var areaPath = 'M ' + px(0).toFixed(1) + ',' + py(vals[0]).toFixed(1) +
      vals.map(function(v, i) { return ' L ' + px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join('') +
      ' L ' + px(n - 1).toFixed(1) + ',' + (H - PY) +
      ' L ' + PX.toFixed(1) + ',' + (H - PY) + ' Z';

    // High / low indices
    var maxIdx = vals.indexOf(maxV);
    var minIdx = vals.indexOf(minV);

    // Current hour marker
    var nowH = new Date().getHours();
    var nowIdx = hours.indexOf(nowH);
    if (nowIdx < 0) nowIdx = Math.min(nowH, n - 1);
    var nowX = px(nowIdx).toFixed(1);
    var nowY = py(vals[nowIdx]).toFixed(1);

    // Hour labels every 6h
    var timeLabels = '';
    for (var i = 0; i < n; i += 6) {
      var h = hours[i] !== undefined ? hours[i] : i;
      var lbl = h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p';
      timeLabels += '<text x="' + px(i).toFixed(1) + '" y="' + (H + 2) + '" text-anchor="middle" class="bc-tide-hour">' + lbl + '</text>';
    }

    // Clamp labels to avoid overflow
    var hiX = Math.min(Math.max(px(maxIdx), 22), W - 22);
    var loX = Math.min(Math.max(px(minIdx), 22), W - 22);
    var hiLabel = '<text x="' + hiX.toFixed(1) + '" y="' + Math.max(py(maxV) - 5, 8).toFixed(1) + '" text-anchor="middle" class="bc-tide-lbl bc-tide-hi">' + maxV.toFixed(1) + 'ft</text>';
    var loLabel = '<text x="' + loX.toFixed(1) + '" y="' + Math.min(py(minV) + 13, H - 2).toFixed(1) + '" text-anchor="middle" class="bc-tide-lbl bc-tide-lo">' + minV.toFixed(1) + 'ft</text>';

    return '<svg class="bc-tide-svg" viewBox="0 0 ' + W + ' ' + (H + 14) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8967e" stop-opacity="0.18"/><stop offset="100%" stop-color="#b8967e" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + areaPath + '" fill="url(#tideGrad)"/>' +
      '<polyline points="' + linePoints + '" fill="none" stroke="#b8967e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<line x1="' + nowX + '" y1="' + PY + '" x2="' + nowX + '" y2="' + (H - PY) + '" stroke="var(--charcoal,#2d2926)" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>' +
      '<circle cx="' + nowX + '" cy="' + nowY + '" r="3.5" fill="var(--charcoal,#2d2926)" opacity="0.7"/>' +
      hiLabel + loLabel + timeLabels +
    '</svg>';
  }

  function wmoIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code <= 3) return '☁️';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌦️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '🌨️';
    if (code <= 84) return '🌦️';
    if (code <= 94) return '⛈️';
    return '⛈️';
  }

  function renderForecast(container, daily) {
    if (!daily || !daily.weather_code) return;
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var strip = document.createElement('div');
    strip.className = 'bc-forecast-strip';
    for (var i = 0; i < 5; i++) {
      var code = daily.weather_code[i];
      if (code === undefined || code === null) continue;
      var hiF = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : '—';
      var loF = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : '—';
      var precip = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
      var wind = daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[i]) : '—';
      var dayLabel = i === 0 ? 'Today' : days[new Date(Date.now() + i * 86400000).getDay()];
      var rainHTML = (precip > 0) ? '<span class="bc-fc-rain">💧 ' + precip + '%</span>' : '';
      var card = document.createElement('div');
      card.className = 'bc-forecast-day';
      card.innerHTML =
        '<span class="bc-fc-day">' + dayLabel + '</span>' +
        '<span class="bc-fc-icon">' + wmoIcon(code) + '</span>' +
        '<span class="bc-fc-temps"><span class="bc-fc-hi">' + hiF + '°</span><span class="bc-fc-lo">' + loF + '°</span></span>' +
        rainHTML +
        '<span class="bc-fc-wind">' + wind + ' mph</span>';
      strip.appendChild(card);
    }
    container.appendChild(strip);
  }

  function renderSkeleton(container) {
    container.innerHTML =
      '<div class="beach-cond-grid">' +
        '<div class="bc-card bc-loading"><div class="bc-skel"></div><div class="bc-skel bc-skel-sm"></div></div>'.repeat(8) +
      '</div>' +
      '<div class="bc-tide-wrap"><div class="bc-skel" style="height:88px;border-radius:8px"></div></div>';
  }

  function renderError(container) {
    container.innerHTML =
      '<p class="bc-error">Unable to load conditions right now. Try again in a moment.</p>';
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

    // Re-run i18n on new elements if available
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
