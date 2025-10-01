const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-prod';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: detect bcrypt-hashed string (starts with $2a$, $2b$, or $2y$)
function isHashedPassword(pw) {
  return typeof pw === 'string' && /^\$2[aby]\$/.test(pw);
}

exports.handler = async function (event) {
  // Basic CORS preflight handling
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

    const body = JSON.parse(event.body || '{}');
    const { username, password } = body || {};
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing username or password' }) };
    }

    // Look up admin by username
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .limit(1)
      .single();

    if (error) {
      console.error('Supabase error while fetching admin', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }

    if (!admin) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const stored = admin.password;
    let passwordMatches = false;

    if (isHashedPassword(stored)) {
      // Compare using bcrypt
      passwordMatches = await bcrypt.compare(password, stored);
    } else {
      // Legacy plaintext: compare directly, then migrate to hashed password
      passwordMatches = stored === password;
      if (passwordMatches) {
        try {
          const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
          const { error: updateErr } = await supabase
            .from('admins')
            .update({ password: hashed })
            .eq('id', admin.id);
          if (updateErr) {
            console.error('Failed to migrate admin password to hash for id', admin.id, updateErr);
          } else {
            console.log('Migrated admin password to bcrypt hash for id', admin.id);
          }
        } catch (mErr) {
          console.error('Error hashing/migrating password for admin id', admin.id, mErr);
        }
      }
    }

    if (!passwordMatches) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Issue a signed admin token (short-lived)
    const tokenPayload = { sub: admin.id, username: admin.username, role: 'admin' };
    const token = jwt.sign(tokenPayload, ADMIN_JWT_SECRET, { expiresIn: '4h' });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    console.error('Unexpected error in admin-login', err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};


