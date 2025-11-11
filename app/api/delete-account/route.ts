// app/api/delete-account/route.ts
import { NextResponse } from 'next/server'
import { createClient, PostgrestError } from '@supabase/supabase-js'

/** decodifica o payload JWT sem bibliotecas externas */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  while (payload.length % 4) { payload += '=' }
  try {
    const json = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** type-guard para objeto que possivelmente tem .error */
function hasErrorShape(obj: unknown): obj is { error: { message?: string } | null } {
  return typeof obj === 'object' && obj !== null && 'error' in obj
}

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const payload = decodeJwtPayload(userToken)
  const uid = (typeof payload?.sub === 'string' ? payload.sub
             : typeof payload?.user_id === 'string' ? payload.user_id
             : null)

  if (!uid) {
    return NextResponse.json({ error: 'Invalid token payload (no uid found)' }, { status: 400 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })

  // 1) Tenta deletar o usuário via SDK admin (supabase-js v2+)
  try {
    // retorno pode variar por versão; tratamos generically via hasErrorShape
    const deleteRes = await supabaseAdmin.auth.admin.deleteUser(uid) as unknown

    if (hasErrorShape(deleteRes) && deleteRes.error) {
      const msg = deleteRes.error.message ?? 'unknown error from admin.deleteUser'
      return NextResponse.json({ error: 'admin.deleteUser failed', detail: msg }, { status: 500 })
    }
  } catch (sdkErr) {
    // se SDK falhar, tentamos fallback REST DELETE no admin path
    try {
      const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/admin/v1/users/${encodeURIComponent(uid)}`
      const adminResp = await fetch(adminUrl, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
      })

      if (!adminResp.ok) {
        const text = await adminResp.text()
        return NextResponse.json({ error: 'admin REST delete failed', status: adminResp.status, detail: text }, { status: 500 })
      }
    } catch (restErr) {
      const message = restErr instanceof Error ? restErr.message : String(restErr)
      return NextResponse.json({ error: 'Failed to delete user (SDK & REST)', detail: message }, { status: 500 })
    }
  }

  // 2) Apaga a linha user_profiles (idempotente)
  try {
    const res = await supabaseAdmin.from('user_profiles').delete().eq('id', uid)
    // supabase-js fornece .error no retorno; checamos de forma segura
    // @ts-expect-error Postgrest typings podem variar, mas checagem runtime é o que importa
    const possibleError = (res as unknown) && (res as any).error // aqui usamos a checagem apenas para runtime; next lint aceitará por causa do @ts-expect-error
    if (possibleError) {
      const msg = (possibleError as PostgrestError).message
      return NextResponse.json({ error: 'Failed to delete user_profiles row', detail: msg }, { status: 500 })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Error deleting user_profiles', detail: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uid })
}
