// api/_email.js — minimal Resend transactional email wrapper.
// fetchImpl is injectable for tests; defaults to global fetch.
export function makeMailer(fetchImpl = fetch) {
  return {
    // `to` overrides the default recipient (ALERT_EMAIL_TO) — used to route
    // heater safety alerts to SAFETY_ALERT_TO.
    async sendAlert(subject, text, to) {
      const key = process.env.RESEND_API_KEY;
      if (!key) { console.error('[email] RESEND_API_KEY not set — skipping alert'); return; }
      try {
        const res = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.ALERT_EMAIL_FROM,
            to:   to || process.env.ALERT_EMAIL_TO,
            subject,
            text,
          }),
        });
        if (!res.ok) console.error('[email] send failed', res.status, await res.text().catch(() => ''));
      } catch (e) {
        console.error('[email] error', e.message);
      }
    },
  };
}
