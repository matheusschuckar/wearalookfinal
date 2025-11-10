// api/delete-account.ts
// Vercel serverless (Node + TypeScript). Avoids import of @vercel/node types to minimize typing issues.

import { createClient } from '@supabase/supabase-js'
import jwtDecode from 'jwt-decode'

type DecodedAny = { [k: string]: any }

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn('Supabase env vars missing. SUPABASE_URL or SUPABASE_SERVICE_ROLE not set.')
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    // Authorization header expected: "Bearer <user_access_token>"
    const authHeader = (req.headers?.authorization || req.headers?.Authorization || '') as string
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Authorization header missing or malformed' })
    }
    const userToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!userToken) {
      return res.status(401).json({ ok: false, error: 'Empty token' })
    }

    // Try to decode token to find sub / user_id for debug
    let uidFromToken: string | null = null
    try {
      const decoded = jwtDecode<DecodedAny>(userToken)
      uidFromToken = decoded?.sub || decoded?.user_id || null
    } catch (err) {
      // not fatal — just log
      console.warn('Failed to decode token for debug:', (err as any).message || err)
    }

    // Provide informative logs for Vercel
    console.log('delete-account called. uidFromToken=', uidFromToken ?? '(not found in token)')

    // Create supabase admin client using service_role key
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    })

    // Determine target UID: prefer uidFromToken if present, otherwise allow optional body param
    // (client can pass { uid: "<id>" } for admin-level deletion, but we prefer token-derived UID)
    let targetUid = uidFromToken
    if (!targetUid) {
      // check body (application/json) for uid
      const body = req.body || {}
      if (body && typeof body.uid === 'string' && body.uid.length > 0) {
        targetUid = body.uid
        console.log('Using uid from request body:', targetUid)
      }
    }

    if (!targetUid) {
      return res.status(400).json({ ok: false, error: 'Could not determine user id (uid). Provide token or body.uid.' })
    }

    // 1) Try supabase-js admin delete (v2)
    let adminResultOk = false
    let adminResultDetails: any = null

    try {
      // supabase-js v2 exposes admin functions under auth.admin
      // try to call deleteUser
      // @ts-ignore - runtime call; if not present, will throw
      const deleteResp = await (supabaseAdmin.auth as any).admin.deleteUser(targetUid)
      adminResultDetails = deleteResp
      // deleteResp.error exists on non-ok; deleteResp.data on success depending on SDK
      const error = deleteResp?.error
      if (!error) {
        adminResultOk = true
        console.log('supabase.auth.admin.deleteUser succeeded', deleteResp)
      } else {
        console.warn('supabase.auth.admin.deleteUser returned error', error)
      }
    } catch (err) {
      console.warn('supabase.auth.admin.deleteUser threw, will fallback to REST delete. err=', (err as any).message || err)
    }

    // Fallback: call admin REST endpoint directly if admin.deleteUser didn't succeed
    if (!adminResultOk) {
      try {
        const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(targetUid)}`
        console.log('Fallback: calling REST DELETE', adminUrl)
        const fetchResp = await fetch(adminUrl, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            'Content-Type': 'application/json'
          }
        })
        const text = await fetchResp.text()
        adminResultDetails = { status: fetchResp.status, text }
        if (fetchResp.ok) {
          adminResultOk = true
          console.log('REST admin delete OK:', fetchResp.status, text)
        } else {
          console.warn('REST admin delete failed:', fetchResp.status, text)
        }
      } catch (err) {
        console.error('Fallback REST admin delete threw:', (err as any).message || err)
      }
    }

    // 2) delete user_profiles row (safe / idempotent)
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', targetUid)

      if (error) {
        console.warn('Failed to delete user_profiles row:', error)
      } else {
        console.log('Deleted user_profiles row count:', (data as any)?.length ?? data)
      }
    } catch (err) {
      console.warn('Exception deleting user_profiles row:', (err as any).message || err)
    }

    // If still not deleted on auth side, return verbose error
    if (!adminResultOk) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to delete Auth user via admin API',
        adminResult: adminResultDetails
      })
    }

    // success
    return res.status(200).json({
      ok: true,
      message: 'Account deleted (auth + profile).',
      uid: targetUid,
      adminResult: adminResultDetails
    })
  } catch (e) {
    console.error('Unhandled error in delete-account handler:', (e as any).message || e)
    return res.status(500).json({ ok: false, error: 'Internal server error', detail: (e as any).message || e })
  }
}

