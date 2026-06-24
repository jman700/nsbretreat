// api/_supabase.js
// Shared Supabase client for serverless API routes — not a public route (Vercel ignores _ prefix)
import { createClient } from '@supabase/supabase-js';

let _client = null;
let _anonClient = null;

export function getSupabase() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var not set');
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

export function getAnonSupabase() {
  if (!_anonClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY env var not set');
    _anonClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return _anonClient;
}
