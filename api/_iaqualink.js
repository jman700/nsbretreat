// api/_iaqualink.js
// Shared iAqualink API helper — not a public route (Vercel ignores _ prefix)

const LOGIN_URL  = 'https://prod.zodiac-io.com/users/v1/login';
const API_BASE   = 'https://r-api.iaqualink.net/v2/mobile/session.json';
// Public API key shared across all iAqualink mobile clients — not a secret.
const API_KEY    = 'EOOEMOW4YR6QNB07';

const HEADERS = {
  'Content-Type': 'application/json',
  'user-agent':   'okhttp/3.14.7',
};

/**
 * Authenticate with iAqualink.
 * Returns { clientId, idToken } needed for subsequent device requests.
 * Throws on failure.
 */
export async function authenticate() {
  const res = await fetch(LOGIN_URL, {
    method:  'POST',
    headers: HEADERS,
    body: JSON.stringify({
      email:    process.env.IAQUALINK_EMAIL,
      password: process.env.IAQUALINK_PASSWORD,
      api_key:  API_KEY,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`iAqualink login failed: ${res.status} ${body}`);
  }

  const data = await res.json();

  // Log keys for debugging — remove once working
  console.log('[iaqualink-auth] response keys:', Object.keys(data).join(', '));

  if (!data.client_id || !data.id_token) {
    // Fall back to authentication_token if id_token not present
    const token = data.id_token || data.authentication_token;
    const clientId = data.client_id || data.id || data.user_id;
    if (!token || !clientId) {
      throw new Error(`iAqualink login: unexpected response shape. Keys: ${Object.keys(data).join(', ')}`);
    }
    return { clientId, idToken: token };
  }

  return { clientId: data.client_id, idToken: data.id_token };
}

/**
 * Make a request to the iAqualink session API.
 * @param {{ clientId: string, idToken: string }} auth  - from authenticate()
 * @param {string} command    - e.g. "get_home", "set_spa_heater"
 * @param {Record<string,string|number>} extra - additional query params
 */
export async function deviceRequest(auth, command, extra = {}) {
  const serial = process.env.IAQUALINK_DEVICE_SERIAL;
  if (!serial) {
    throw new Error('IAQUALINK_DEVICE_SERIAL env var is not set');
  }

  const params = new URLSearchParams({
    actionID:  'command',
    command,
    serial,
    sessionID: auth.clientId,
    ...extra,
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${auth.idToken}`,
      'api_key':       API_KEY,
      'user-agent':    'okhttp/3.14.7',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`iAqualink command "${command}" failed: ${res.status} ${body}`);
  }

  return res.json();
}
