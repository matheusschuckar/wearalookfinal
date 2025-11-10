// api/delete-account.ts
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE')
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })

  function decodeSubFromJwt(token: string): string | null {
    try {
      const parts = token.split('.')
      if (parts.length < 2) return null
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
      return payload.sub || payload.user_id || null
    } catch {
      return null
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_bearer_token' })
  }

  const userJwt = authHeader.replace(/^Bearer\s+/i, '')
  const uid = decodeSubFromJwt(userJwt)
  if (!uid) return res.status(400).json({ error: 'invalid_token_payload' })

  try {
    // Apaga o usuário no Auth
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
    if (delErr) {
      console.error('deleteUser error:', delErr)
      return res.status(500).json({ error: 'failed_delete_auth', detail: delErr.message })
    }

    // Apaga a linha em user_profiles
    const { error: pErr } = await supabaseAdmin.from('user_profiles').delete().eq('id', uid)
    if (pErr) {
      console.error('failed delete profile row:', pErr)
      return res.status(500).json({ error: 'failed_delete_profile', detail: pErr.message })
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('delete-account exception', err)
    return res.status(500).json({ error: 'internal_error', detail: err?.message ?? String(err) })
  }
}
