import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { isHoneypotAdminRequest } from '@/lib/honeypot-admin'
import { blockIp, unblockIp, loadBlocklist } from '@/lib/ip-blocklist'
import {
  memoryBlockIp,
  memoryUnblockIp,
  syncBlockedIps,
} from '@/lib/blocked-ips-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authToken = request.cookies.get('auth_token')?.value
  if (!authToken) return false

  const jwtSecret = process.env.JWT_SECRET || 'supersecret'
  try {
    const decoded = jwt.verify(authToken, jwtSecret) as { email?: string }
    const email = decoded.email ?? ''
    if (!email) return false
    return isHoneypotAdminRequest(request, email)
  } catch {
    return false
  }
}

/** GET — list all currently blocked IPs */
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const list = await loadBlocklist()

  // Sync in-memory set from file on each load
  syncBlockedIps(list.map((e) => e.ip))

  return NextResponse.json({ ok: true, blocked: list })
}

/** POST — block an IP   body: { ip, reason?, expiresAt? } */
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const ip = body.ip?.trim()
  if (!ip) {
    return NextResponse.json({ error: 'ip is required' }, { status: 400 })
  }

  const reason = body.reason || 'Manually blocked from honeypot console'
  const expiresAt = body.expiresAt || null

  const entry = await blockIp(ip, reason, 'manual', expiresAt)
  memoryBlockIp(ip)

  console.log(`[FIREWALL] IP BLOCKED: ${ip} — ${reason}`)

  return NextResponse.json({ ok: true, entry })
}

/** DELETE — unblock an IP   body: { ip } */
export async function DELETE(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const ip = body.ip?.trim()
  if (!ip) {
    return NextResponse.json({ error: 'ip is required' }, { status: 400 })
  }

  const removed = await unblockIp(ip)
  memoryUnblockIp(ip)

  console.log(`[FIREWALL] IP UNBLOCKED: ${ip}`)

  return NextResponse.json({ ok: true, removed })
}
