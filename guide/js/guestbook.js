// guestbook.js — Guest Book (Supabase-backed)

(function initGuestbook() {
  const form    = document.getElementById('gb-form');
  const status  = document.getElementById('gb-status');
  const entries = document.getElementById('gb-entries');
  const starsEl = document.getElementById('gb-stars');
  let rating = 0;

  // ── Star rating ──
  if (starsEl) {
    starsEl.querySelectorAll('button').forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => {
        starsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('lit', j <= i));
      });
      btn.addEventListener('mouseleave', () => {
        starsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('lit', j < rating));
      });
      btn.addEventListener('click', () => {
        rating = parseInt(btn.dataset.val);
        starsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('lit', j < rating));
      });
    });
  }

  // ── Supabase client ──
  const sbUrl = typeof CONFIG !== 'undefined' ? CONFIG.supabase_url : null;
  const sbKey = typeof CONFIG !== 'undefined' ? CONFIG.supabase_anon_key : null;
  let sb = null;
  if (sbUrl && sbKey && typeof supabase !== 'undefined') {
    sb = supabase.createClient(sbUrl, sbKey);
  }

  // ── Load entries ──
  async function loadEntries() {
    if (!entries) return;
    if (!sb) {
      entries.innerHTML = '<p style="color:var(--charcoal-light);font-size:0.9rem">Guest book coming soon!</p>';
      return;
    }
    const { data, error } = await sb
      .from('guestbook')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error || !data?.length) {
      entries.innerHTML = '<p style="color:var(--charcoal-light);font-size:0.9rem">No entries yet — be the first to leave a note! ✨</p>';
      return;
    }

    entries.innerHTML = data.map(e => `
      <div class="gb-entry">
        <div class="gb-entry-header">
          <span class="gb-entry-name">${esc(e.name)}${e.city ? ' · ' + esc(e.city) : ''}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="gb-entry-stars">${'★'.repeat(Math.min(5, Math.max(1, e.rating || 5)))}</span>
            <span class="gb-entry-meta">${new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        <p class="gb-entry-msg">${esc(e.message)}</p>
      </div>
    `).join('');
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // ── Submit ──
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('gb-name')?.value.trim();
      const city    = document.getElementById('gb-city')?.value.trim();
      const message = document.getElementById('gb-message')?.value.trim();
      if (!name || !message) return;

      if (status) status.textContent = 'Submitting…';

      if (!sb) {
        if (status) status.textContent = 'Guest book not yet active — check back soon!';
        return;
      }

      const { error } = await sb.from('guestbook').insert({
        name,
        city: city || null,
        message,
        rating: rating || 5,
      });

      if (error) {
        if (status) status.textContent = 'Something went wrong — please try again.';
        return;
      }

      if (status) status.textContent = 'Thank you for your note! 🙏';
      form.reset();
      rating = 0;
      starsEl?.querySelectorAll('button').forEach(b => b.classList.remove('lit'));
      setTimeout(() => { if (status) status.textContent = ''; }, 4000);
      loadEntries();
    });
  }

  loadEntries();
})();
