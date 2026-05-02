document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('qv-wifi-name').textContent = CONFIG.wifi_name;
  document.getElementById('qv-wifi-pass').textContent = CONFIG.wifi_password;
  document.getElementById('qv-door').textContent = CONFIG.door_code_note;
  document.getElementById('qv-checkout').textContent = CONFIG.checkout_time;

  document.querySelectorAll('.quick-card[data-copy-key]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.copyKey;
      const value = CONFIG[key];
      if (!value) return;
      navigator.clipboard.writeText(value).then(() => showToast());
    });
  });

  const sections = document.querySelectorAll('.manual-section[id]');
  const tabLinks = document.querySelectorAll('.tab-link');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tabLinks.forEach(t => t.classList.remove('active'));
        const active = document.querySelector(`.tab-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(s => observer.observe(s));
});

function showToast() {
  const toast = document.getElementById('copy-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

document.querySelectorAll('.acc-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    trigger.closest('.acc-item').classList.toggle('open');
  });
});

document.querySelectorAll('.around-code[data-copy-val]').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.copyVal).then(() => showToast());
  });
});

document.querySelectorAll('[id$="-phone"]').forEach(el => {
  el.href = 'tel:' + CONFIG.host_phone.replace(/\D/g, '');
  el.textContent = CONFIG.host_phone;
});
