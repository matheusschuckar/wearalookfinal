import { NextResponse } from 'next/server'
import { createClient, PostgrestError } from '@supabase/supabase-js'

// --- UTIL: decodifica o payload do JWT sem depender de jwt-decode ---
function decodeJwtPayload(token: string): Record<string, unknown> | null {
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

// --- HANDLER ---
export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' },
      { status: 500 }
    )
  }

  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const payload = decodeJwtPayload(userToken)
  const uid = (payload?.sub as string) || (payload?.user_id as string) || null

  if (!uid) {
    return NextResponse.json({ error: 'Invalid token payload: missing user id' }, { status: 400 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  // 1) Deletar o usuário do Auth via REST (admin)
  try {
    const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(uid)}`
    const adminResp = await fetch(adminUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
    })

    if (!adminResp.ok) {
      const text = await adminResp.text()
      return NextResponse.json(
        { error: 'Failed to delete auth user', detail: text },
        { status: adminResp.status }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Error deleting auth user', detail: message }, { status: 500 })
  }

  // 2) Deletar o perfil no banco (idempotente)
  try {
    const { error }: { error: PostgrestError | null } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', uid)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete user profile', detail: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Error deleting user profile', detail: message }, { status: 500 })
  }

  // 3) Retorno final
  return NextResponse.json({ ok: true, uid })
}
