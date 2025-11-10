// file: api/delete-account.js  (Node 18+)
import fetch from "node-fetch"; // no need on Vercel (native), keep for local dev

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers["authorization"] || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing user token" });

  const userJwt = auth.split(" ")[1];

  // Get user id from JWT. Two options:
  // 1) decode JWT (no verification) and read sub.  OR
  // 2) call Supabase /auth/v1/user with the JWT to get user info.
  // We'll call /auth/v1/user (safer because it verifies token).
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL; // ex: https://xyz.supabase.co
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Server not configured" });
    }

    // 1) fetch the user (verify JWT)
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userJwt}` }
    });

    if (!userResp.ok) {
      const txt = await userResp.text();
      return res.status(401).json({ error: "Invalid user token", detail: txt });
    }
    const userJson = await userResp.json();
    const userId = userJson.id;
    if (!userId) return res.status(400).json({ error: "Cannot determine user id" });

    // 2) delete user_profiles row (service role)
    const delProfileResp = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal"
      }
    });

    if (!delProfileResp.ok && delProfileResp.status !== 404) {
      const txt = await delProfileResp.text();
      return res.status(500).json({ error: "Failed deleting user profile", detail: txt });
    }

    // 3) delete auth user (admin)
    const delAuthResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!delAuthResp.ok) {
      const txt = await delAuthResp.text();
      return res.status(500).json({ error: "Failed deleting auth user", detail: txt });
    }

    // 4) success
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}
