// api/guest-token.js
// GET /api/guest-token?token=TOKEN — validate a guest access token (public endpoint).

import { getAnonSupabase } from './_supabase.js';

export async function validateToken(token, sb) {
  if (!token) return { valid: false, reason: 'not_found' };
  const { data, error } = await sb
    .from('guest_tokens')
    .select('label, expires_at')
    .eq('token', token)
    .single();
  if (error || !data) return { valid: false, reason: 'not_found' };
  if (new Date(data.expires_at) <= new Date()) return { valid: false, reason: 'expired' };
  return { valid: true, label: data.label };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const result = await validateToken(req.query.token, getAnonSupabase());
    return res.status(200).json(result);
  } catch (err) {
    console.error('[guest-token]', err.message);
    return res.status(500).json({ valid: false, reason: 'error' });
  }
}
