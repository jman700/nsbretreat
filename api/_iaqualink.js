// api/_iaqualink.js
// Shared iAqualink API helper — not a public route (Vercel ignores _ prefix)

const LOGIN_URL  = 'https://prod.zodiac-ios.com/users/v1/login';
const API_BASE   = 'https://iaqualink-api.realtime.io/v1/mobile/session.json';
const API_KEY    = 'EOOEMOW4YR6QNB07';

/**
 * Authenticate with iAqualink and return a session token.
 * Throws on failure.
 */
export async function authenticate() {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.IAQUALINK_EMAIL,
      password: process.env.IAQUALINK_PASSWORD,
      api_key:  API_KEY,
    }),
  });

  if (!res.ok) {
    throw new Error(`iAqualink login failed: ${res.status}`);
  }

  const data = await res.json();

  // Response shape: { id, authentication_token, ... }
  if (!data.authentication_token) {
    throw new Error('iAqualink login: no authentication_token in response');
  }

  return data.authentication_token;
}

/**
 * Make a request to the iAqualink session API.
 * @param {string} token      - authentication_token from authenticate()
 * @param {string} command    - e.g. "get_home_screen", "set_spa_temp"
 * @param {Record<string,string|number>} extra - additional query params
 */
export async function deviceRequest(token, command, extra = {}) {
  const serial = process.env.IAQUALINK_DEVICE_SERIAL;

  const params = new URLSearchParams({
    actionID:  'command',
    command,
    serial,
    sessionID: token,
    api_key:   API_KEY,
    ...extra,
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`iAqualink command "${command}" failed: ${res.status}`);
  }

  return res.json();
}
