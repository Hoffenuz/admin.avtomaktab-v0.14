const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    // ignore
  }
}

// Use ADMIN_JWT_SECRET primarily; accept common fallbacks for compatibility
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'change-me-in-prod';

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

    // If header missing, try to read token from body (fallback for clients that send token in payload)
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

    // Debug logs (do not print the token itself)
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

    // For now, return minimal success payload so frontend can treat user as logged-in.
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Token valid', admin })
    };
  } catch (err) {
    console.error('admin-proxy error', err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};


