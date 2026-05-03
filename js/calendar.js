let bookedRanges = [];
let displayMonth = new Date();
displayMonth.setDate(1);

async function fetchRanges(proxyUrl) {
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    const text = await res.text();
    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');
    return events.map(e => {
      const ev = new ICAL.Event(e);
      return { start: ev.startDate.toJSDate(), end: ev.endDate.toJSDate() };
    });
  } catch (err) {
    console.warn('Calendar fetch failed for', proxyUrl, err);
    return [];
  }
}

async function loadCalendar() {
  if (typeof CONFIG === 'undefined') { renderCalendar(); return; }

  const urls = [
    CONFIG.ical_proxy_url,
    CONFIG.ical_proxy_url_vrbo,
  ].filter(u => u && u !== 'https://YOUR_WORKER.workers.dev/ical');

  const results = await Promise.allSettled(urls.map(fetchRanges));
  bookedRanges = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  renderCalendar();
}

function isBooked(date) {
  return bookedRanges.some(r => date >= r.start && date < r.end);
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid || !label) return;

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  label.textContent = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const past = date < today;
    const booked = !past && isBooked(date);
    html += `<div class="cal-day ${past ? 'cal-past' : booked ? 'cal-booked' : 'cal-available'}">${d}</div>`;
  }
  grid.innerHTML = html;
}

document.getElementById('cal-prev').addEventListener('click', () => {
  displayMonth.setMonth(displayMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  displayMonth.setMonth(displayMonth.getMonth() + 1);
  renderCalendar();
});

document.addEventListener('DOMContentLoaded', loadCalendar);
