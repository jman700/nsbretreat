// beach-conditions.js — Live beach conditions widget for NSB Retreat guide

(function initBeachConditions() {
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=29.026&longitude=-80.926&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,uv_index&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1';
  var MARINE_URL  = 'https://marine-api.open-meteo.com/v1/marine?latitude=29.026&longitude=-80.926&current=wave_height,sea_surface_temperature';

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

  function renderSkeleton(container) {
    container.innerHTML =
      '<div class="beach-cond-grid">' +
        '<div class="bc-card bc-loading"><div class="bc-skel"></div><div class="bc-skel bc-skel-sm"></div></div>'.repeat(6) +
      '</div>';
  }

  function renderError(container) {
    container.innerHTML =
      '<p class="bc-error">Unable to load conditions right now. Check <a href="https://www.volusia.org/services/public-protection/beach-safety/beachcams-and-daily-safety-report.stml" target="_blank" rel="noopener">beach flag &amp; cams</a> or the <a href="https://www.youtube.com/watch?v=kB2PZC-ow68" target="_blank" rel="noopener">live NSB beach cam</a>.</p>';
  }

  function renderConditions(container, wx, marine) {
    var wc = wx.current;
    var mc = marine.current;
    var waveM = mc.wave_height;
    var waveFt = (waveM * 3.281).toFixed(1);
    var waterTempF = Math.round(mc.sea_surface_temperature * 9/5 + 32);
    var windDir = degreesToCompass(wc.wind_direction_10m);
    var uv = uvLabel(wc.uv_index);
    var updatedAt = wc.time ? formatTime(wc.time) : '—';

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
        '<div class="bc-card bc-updated">' +
          '<span class="bc-label">Updated</span>' +
          '<span class="bc-value bc-value-sm">' + updatedAt + '</span>' +
          '<span class="bc-sub">local time</span>' +
        '</div>' +
      '</div>' +
      '<div class="bc-links">' +
        '<a class="bc-flag-link" href="https://www.volusia.org/services/public-protection/beach-safety/beachcams-and-daily-safety-report.stml" target="_blank" rel="noopener" data-i18n="beach_flag_link">Beach Flag &amp; Cams →</a>' +
        '<a class="bc-flag-link" href="https://www.youtube.com/watch?v=kB2PZC-ow68" target="_blank" rel="noopener">Live NSB Beach Cam →</a>' +
      '</div>';

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
      fetch(MARINE_URL).then(function(r) { return r.json(); })
    ]).then(function(results) {
      renderConditions(widget, results[0], results[1]);
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
