import { NextRequest, NextResponse } from 'next/server'
import { readHoneypotEvents } from '@/lib/honeypot'
import jwt from 'jsonwebtoken'
import { isHoneypotAdminRequest } from '@/lib/honeypot-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authToken = request.cookies.get('auth_token')?.value
  if (!authToken) {
    return false
  }

  const jwtSecret = process.env.JWT_SECRET || 'supersecret'

  try {
    const decoded = jwt.verify(authToken, jwtSecret) as { email?: string }
    const email = decoded.email ?? ''
    if (!email) {
      return false
    }
    return isHoneypotAdminRequest(request, email)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (process.env.HONEYPOT_ENABLED === 'false') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const requestedLimit = Number(searchParams.get('limit') ?? '100')
  const events = await readHoneypotEvents(requestedLimit)

  return NextResponse.json(
    {
      ok: true,
      count: events.length,
      events,
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  )
}
