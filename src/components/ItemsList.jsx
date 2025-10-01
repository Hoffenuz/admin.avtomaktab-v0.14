import React, { useEffect, useState } from 'react';
// Import your existing Supabase client instance that manages auth/session on the frontend.
// Adjust the import path if your project keeps the client in a different file.
import { supabase } from '../lib/supabaseClient';

export default function ItemsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      setLoading(true);
      setErrorMessage(null);

      try {
        // Obtain the current user's access token in a way that supports both
        // supabase-js v1 and v2 client APIs.
        let accessToken = null;

        if (supabase && supabase.auth) {
          // v2: supabase.auth.getSession() -> { data: { session } }
          if (typeof supabase.auth.getSession === 'function') {
            const sessionResult = await supabase.auth.getSession();
            accessToken = sessionResult?.data?.session?.access_token || null;
          }

          // v1 fallback: supabase.auth.session()
          if (!accessToken && typeof supabase.auth.session === 'function') {
            const session = supabase.auth.session();
            accessToken = session?.access_token || null;
          }
        }

        if (!accessToken) {
          setErrorMessage('Not authenticated. Please sign in.');
          setItems([]);
          return;
        }

        const response = await fetch('/api/fetch-items', {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} ${text}`);
        }

        const json = await response.json();
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load items', err);
          setErrorMessage('Failed to load items.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadItems();
    return () => controller.abort();
  }, []);

  if (loading) return <div>Loading items…</div>;
  if (errorMessage) return <div>{errorMessage}</div>;

  return (
    <ul>
      {items.length === 0 ? (
        <li>No items found.</li>
      ) : (
        items.map((item) => (
          <li key={item.id}>{item.name ?? '(no name)'}</li>
        ))
      )}
    </ul>
  );
}


