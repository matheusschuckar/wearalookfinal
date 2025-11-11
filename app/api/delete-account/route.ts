// app/api/delete-account/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwtDecode from 'jwt-decode'

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  const userToken = authHeader.replace(/^Bearer\s+/i, '')

  let uid: string | null = null
  try {
    const decoded = jwtDecode<{ sub?: string; user_id?: string }>(userToken)
    uid = decoded.sub || decoded.user_id || null
  } catch {}

  if (!uid) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })

  // tenta deletar via REST admin endpoint
  const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${uid}`
  const adminResp = await fetch(restUrl, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    }
  })

  if (!adminResp.ok) {
    const text = await adminResp.text()
    return NextResponse.json({ error: 'Failed delete', detail: text }, { status: adminResp.status })
  }

  await supabaseAdmin.from('user_profiles').delete().eq('id', uid)

  return NextResponse.json({ ok: true, uid })
}
