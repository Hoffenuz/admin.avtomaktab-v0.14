const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-prod';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase env vars for admin-proxy');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function verifyAdminToken(token) {
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET);
  } catch (err) {
    return null;
  }
}

exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const admin = verifyAdminToken(token);
    if (!admin) return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    const body = JSON.parse(event.body || '{}');
    const { action, table, select, data, filters, limit, order } = body || {};
    if (!action || !table) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing action or table' }) };

    // Build query
    let query = supabase.from(table);

    if (action === 'select') {
      query = query.select(select || '*');
      if (filters && typeof filters === 'object') {
        Object.keys(filters).forEach((k) => {
          const v = filters[k];
          query = query.eq(k, v);
        });
      }
      if (order && Array.isArray(order)) {
        order.forEach(o => {
          if (o.column) query = query.order(o.column, { ascending: o.ascending !== false });
        });
      }
      if (limit) query = query.limit(limit);
      const { data: resData, error } = await query;
      if (error) return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: resData }) };
    }

    if (action === 'insert') {
      if (!data) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing data to insert' }) };
      const { data: resData, error } = await query.insert(data);
      if (error) return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: resData }) };
    }

    if (action === 'update') {
      if (!data || !filters) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing data or filters for update' }) };
      Object.keys(filters).forEach((k) => { query = query.eq(k, filters[k]); });
      const { data: resData, error } = await query.update(data).select();
      if (error) return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: resData }) };
    }

    if (action === 'delete') {
      if (!filters) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing filters for delete' }) };
      Object.keys(filters).forEach((k) => { query = query.eq(k, filters[k]); });
      const { data: resData, error } = await query.delete();
      if (error) return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: resData }) };
    }

    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('admin-proxy error', err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};


