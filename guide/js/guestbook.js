let supabase;
let selectedRating = 0;

function initGuestbook() {
  const url = typeof CONFIG !== 'undefined' ? CONFIG.supabase_url : null;
  const key = typeof CONFIG !== 'undefined' ? CONFIG.supabase_anon_key : null;
  const notConfigured = !url || url.includes('YOUR_PROJECT') || !key || key.includes('YOUR_ANON');

  if (notConfigured) {
    document.getElementById('gb-entries').innerHTML =
      '<p style="color:var(--charcoal-light); font-size:0.9rem">Guest book coming soon!</p>';
    document.getElementById('gb-form').style.display = 'none';
    return;
  }

  supabase = window.supabase.createClient(url, key);
  loadEntries();
  initStars();

  document.getElementById('gb-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('gb-name').value.trim();
    const city = document.getElementById('gb-city').value.trim();
    const message = document.getElementById('gb-message').value.trim();
    const status = document.getElementById('gb-status');

    if (!name || !message) return;

    const { error } = await supabase.from('guestbook').insert([{
      name, city, message,
      rating: selectedRating || null
    }]);

    if (error) {
      status.textContent = 'Something went wrong. Please try again.';
      status.style.color = 'red';
    } else {
      status.textContent = 'Thank you for your note!';
      status.style.color = 'var(--accent)';
      document.getElementById('gb-form').reset();
      selectedRating = 0;
      document.querySelectorAll('.stars button').forEach(b => b.classList.remove('active'));
      loadEntries();
    }
  });
}

function initStars() {
  const buttons = document.querySelectorAll('#gb-stars button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      buttons.forEach((b, i) => b.classList.toggle('active', i < selectedRating));
    });
  });
}

async function loadEntries() {
  const container = document.getElementById('gb-entries');
  const { data, error } = await supabase
    .from('guestbook')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal-light); font-size:0.9rem">No entries yet. Be the first!</p>';
    return;
  }

  container.innerHTML = data.map(entry => `
    <div class="gb-entry">
      <div class="gb-entry-header">
        <strong>${escapeHtml(entry.name)}</strong>
        ${entry.city ? `<span class="gb-city">${escapeHtml(entry.city)}</span>` : ''}
        ${entry.rating ? `<span class="gb-stars-display">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</span>` : ''}
      </div>
      <p class="gb-entry-message">${escapeHtml(entry.message)}</p>
      <span class="gb-entry-date">${new Date(entry.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', initGuestbook);
