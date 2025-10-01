// Helper for frontend to call server-side admin-proxy Netlify Function
const ADMIN_TOKEN_KEY = 'adminAuthToken';

async function callAdminProxy(body) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch('/api/admin-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Admin proxy error: ${res.status} ${txt}`);
  }
  return await res.json();
}

export async function adminSelect(table, opts = {}) {
  const body = { action: 'select', table, ...opts };
  const json = await callAdminProxy(body);
  return json.data;
}

export async function adminInsert(table, data) {
  const body = { action: 'insert', table, data };
  const json = await callAdminProxy(body);
  return json.data;
}

export async function adminUpdate(table, filters, data) {
  const body = { action: 'update', table, filters, data };
  const json = await callAdminProxy(body);
  return json.data;
}

export async function adminDelete(table, filters) {
  const body = { action: 'delete', table, filters };
  const json = await callAdminProxy(body);
  return json.data;
}

export default {
  adminSelect,
  adminInsert,
  adminUpdate,
  adminDelete
};


