// api/delete-account.ts (Vercel serverless / Node + TypeScript)
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE! // service_role (NUNCA no client)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
})

function decodeSubFromJwt(token: string): string | null {
  // pega a segunda parte (payload) e decodifica base64url
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'))
    return payload.sub || payload.user_id || null
  } catch (err) {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // apenas POST aceito
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_bearer_token' })
  }
  const userJwt = authHeader.replace(/^Bearer\s+/i, '')

  const uid = decodeSubFromJwt(userJwt)
  if (!uid) return res.status(400).json({ error: 'invalid_token_payload' })

  try {
    // 1) delete user in Supabase Auth (admin)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
    if (delErr) {
      console.error('supabase.admin.deleteUser error:', delErr)
      return res.status(500).json({ error: 'failed_delete_auth', detail: delErr.message })
    }

    // 2) delete user profile row (idempotent)
    const { error: pErr } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', uid)

    if (pErr) {
      console.error('failed delete profile row:', pErr)
      // profile delete failed, but user auth was removed; return 207 or 500
      return res.status(500).json({ error: 'failed_delete_profile', detail: pErr.message })
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('delete-account exception', err)
    return res.status(500).json({ error: 'internal_error', detail: String(err?.message ?? err) })
  }
}
