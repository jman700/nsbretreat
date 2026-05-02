// Copy this file to config.js and fill in real values. Never commit config.js.
const CONFIG = {
  wifi_name: "YourNetworkName",
  wifi_password: "YourPassword",
  door_code_note: "Check your Airbnb app for your door code.",
  checkout_time: "10:00 AM",
  checkin_time: "4:00 PM",
  host_phone: "+1 (XXX) XXX-XXXX",
  airbnb_url: "https://www.airbnb.com/rooms/YOUR_LISTING_ID",
  // This must be a proxy URL (Cloudflare Worker) — NOT the raw Airbnb iCal URL.
  // Fetching the Airbnb URL directly from the browser fails due to CORS.
  ical_proxy_url: "https://YOUR_WORKER.workers.dev/ical",
  supabase_url: "https://YOUR_PROJECT.supabase.co",
  // Use the anon/public key — NOT the service role key (that would be a security risk).
  supabase_anon_key: "YOUR_ANON_KEY"
};
