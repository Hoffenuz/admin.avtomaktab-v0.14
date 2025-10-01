import React, { useEffect, useState } from 'react';
import { getAdminToken } from './AdminLoginForm';

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
        // Use admin token (stored after admin login) to authenticate to server endpoints
        const accessToken = getAdminToken() || localStorage.getItem('adminAuthToken');
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


