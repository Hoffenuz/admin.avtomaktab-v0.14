const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    // ignore
  }
}

// Use ADMIN_JWT_SECRET primarily; accept common fallbacks for compatibility
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'change-me-in-prod';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    let token = authHeader.replace(/^Bearer\s+/i, '');

    // If header missing, try to read token from body (fallback)
    let bodyParsed;
    if (!token) {
      try {
        bodyParsed = JSON.parse(event.body || '{}');
        token = (bodyParsed && (bodyParsed.token || bodyParsed.authToken || ''));
        if (!token && bodyParsed && bodyParsed.headers) {
          const h = bodyParsed.headers.Authorization || bodyParsed.headers.authorization || '';
          token = h.replace(/^Bearer\s+/i, '');
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    console.log('admin-proxy headers keys:', Object.keys(event.headers || {}));
    console.log('admin-proxy token present:', !!token);

    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing token', headers: Object.keys(event.headers || {}), bodyHasToken: !!(bodyParsed && (bodyParsed.token || bodyParsed.authToken)) })
      };
    }

    const admin = verifyAdminToken(token);
    if (!admin) return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unauthorized' }) };

    // Token is valid — allow limited proxy actions (only SELECT on 'admin' table for now)
    const body = JSON.parse(event.body || '{}');
    const { action, table, select, data, filters, limit, order } = body || {};
    if (!action || !table) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing action or table' }) };

    if (table !== 'admin') {
      return { statusCode: 403, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Forbidden table' }) };
    }

    // Only support select for now
    if (action === 'select') {
      const sel = (select && typeof select === 'string') ? select : 'id,username';
      let query = supabase.from(table).select(sel);
      if (filters && typeof filters === 'object') {
        Object.keys(filters).forEach((k) => {
          query = query.eq(k, filters[k]);
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
      // sanitize: never return password field
      const sanitized = (resData || []).map(r => {
        if (r && r.password) delete r.password;
        return r;
      });
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: sanitized }) };
    }

    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Unknown or unsupported action' }) };
  } catch (err) {
    console.error('admin-proxy error', err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};


