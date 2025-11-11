// app/api/delete-account/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function decodeJwtPayload(token: string): any | null {
  // base64url -> base64
  const parts = token.split('.')
  if (parts.length < 2) return null
  let payload = parts[1]
  payload = payload.replace(/-/g, '+').replace(/_/g, '/')
  const pad = payload.length % 4
  if (pad === 2) payload += '=='
  else if (pad === 3) payload += '='
  else if (pad === 1) return null
  try {
    const decoded = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Server misconfigured: missing SUPABASE env vars' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  const userToken = authHeader.replace(/^Bearer\s+/i, '')

  const payload = decodeJwtPayload(userToken)
  const uid = (payload && (payload.sub || payload.user_id || payload.uid)) ?? null

  if (!uid || typeof uid !== 'string') {
    return NextResponse.json({ error: 'Invalid token payload: cannot determine user id' }, { status: 400 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })

  // 1) delete auth user via Supabase admin REST endpoint
  try {
    const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(uid)}`
    const adminResp = await fetch(adminUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json'
      }
    })

    if (!adminResp.ok) {
      const text = await adminResp.text()
      return NextResponse.json({ error: 'Failed to delete auth user', detail: text }, { status: adminResp.status })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error deleting auth user', detail: String(err) }, { status: 500 })
  }

  // 2) delete user_profiles row (idempotente)
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', uid)

    if (error) {
      // log and continue? aqui retornamos erro — ajustar se preferir tolerância
      return NextResponse.json({ error: 'Failed to delete user profile', detail: error.message }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error deleting user profile', detail: String(err) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uid })
}
