// Supabase client removed from frontend to prevent exposing API keys in the browser.
// All frontend code should call your Netlify Function endpoints (e.g. /api/fetch-items)
// which run server-side and use the secure SERVICE_ROLE key from environment variables.

// This module exports a proxy that throws when any property is accessed so that
// accidental direct calls to Supabase from the client fail loudly during development.
const throwOnUse = () => {
  throw new Error(
    'Direct Supabase access from the frontend is disabled. Use server endpoints (Netlify Functions) instead.'
  );
};

export const supabase = new Proxy({}, {
  get: () => throwOnUse,
  apply: () => throwOnUse,
});

// NOTE for developers:
// - Remove any VITE_SUPABASE_ANON_KEY from your `.env` files and Netlify build env.
// - Replace direct `supabase.from(...)` calls with fetch to your backend endpoints.