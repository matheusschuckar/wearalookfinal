// app/api/delete-account/route.ts
import { NextResponse } from 'next/server'

/**
 * Decodifica o payload de um JWT sem bibliotecas externas.
 * Retorna o payload como Record<string, unknown> ou null se falhar.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  while (payload.length % 4 !== 0) { payload += '=' }
  try {
    // Buffer está disponível em runtime Node (Vercel)
    const json = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function extractUidFromPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const sub = payload['sub']
  const user_id = payload['user_id']
  if (typeof sub === 'string' && sub.length > 0) return sub
  if (typeof user_id === 'string' && user_id.length > 0) return user_id
  return null
}

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const payload = decodeJwtPayload(userToken)
  const uid = extractUidFromPayload(payload)

  if (!uid) {
    return NextResponse.json({ error: 'Invalid token payload (no uid found)' }, { status: 400 })
  }

  try {
    // 1) DELETE user from Auth via admin REST endpoint
    // Endpoint: {SUPABASE_URL}/auth/v1/admin/users/{uid}
    const adminAuthUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(uid)}`
    const adminResp = await fetch(adminAuthUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Accept: 'application/json'
      }
    })

    if (!adminResp.ok) {
      const detailText = await adminResp.text()
      // Return the actual HTTP status returned by Supabase admin endpoint to help debug
      return NextResponse.json(
        { error: 'Failed to delete auth user', status: adminResp.status, detail: detailText },
        { status: 500 }
      )
    }

    // 2) DELETE user_profiles row via PostgREST (REST) to be deterministic
    // Endpoint: {SUPABASE_URL}/rest/v1/user_profiles?id=eq.{uid}
    const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/user_profiles?id=eq.${encodeURIComponent(uid)}`
    const restResp = await fetch(restUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Accept: 'application/json'
      }
    })

    if (!restResp.ok && restResp.status !== 204) {
      const detailText = await restResp.text()
      return NextResponse.json(
        { error: 'Failed to delete user_profiles row', status: restResp.status, detail: detailText },
        { status: 500 }
      )
    }

    // tudo ok
    return NextResponse.json({ ok: true, uid }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Unexpected server error', detail: message }, { status: 500 })
  }
}
