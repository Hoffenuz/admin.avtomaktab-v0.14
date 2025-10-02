const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    // ignore
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Support multiple env var names to avoid name-mismatch between local and Netlify
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'change-me-in-prod';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { username, password } = body;

    console.log("Login attempt:", username, password);

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing username or password" }) };
    }

    // Faqat bitta jadval nomi: admin
    const { data: admin, error } = await supabase
      .from("admin")
      .select("*")
      .eq("username", username)
      .eq("password", password) // oddiy tekshirish (hashsiz)
      .single();

    if (error || !admin) {
      console.error("Login error:", error);
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const token = jwt.sign(
      { sub: admin.id, username: admin.username, role: "admin" },
      ADMIN_JWT_SECRET,
      { expiresIn: "4h" }
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ token })
    };
  } catch (err) {
    console.error("Unexpected error in admin-login", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
}
