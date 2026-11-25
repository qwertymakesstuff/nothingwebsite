// Public configuration. These values are safe to ship to browsers: the Supabase publishable key
// only grants what Row Level Security allows. Never put secret/service-role keys in this app.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fazzxshhvfecpfypqusz.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Cxp0AuCPIeUD_-AeAAVojA_ReEgfYJY';

/** Minimum age to create an account, and to use chat. */
export const MIN_SIGNUP_AGE = 13;
export const MIN_CHAT_AGE = 13;

export const SITE_NAME = 'Rookery';
export const SITE_URL = 'https://chess.missing.website';
