let bookedRanges = [];
let displayMonth = new Date();
displayMonth.setDate(1);

async function loadCalendar() {
  const proxyUrl = typeof CONFIG !== 'undefined' ? CONFIG.ical_proxy_url : null;
  if (proxyUrl && proxyUrl !== 'https://YOUR_WORKER.workers.dev/ical') {
    try {
      const res = await fetch(proxyUrl);
      const text = await res.text();
      const jcal = ICAL.parse(text);
      const comp = new ICAL.Component(jcal);
      const events = comp.getAllSubcomponents('vevent');
      bookedRanges = events.map(e => {
        const ev = new ICAL.Event(e);
        return { start: ev.startDate.toJSDate(), end: ev.endDate.toJSDate() };
      });
    } catch (err) {
      console.warn('Calendar load failed:', err);
    }
  }
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
