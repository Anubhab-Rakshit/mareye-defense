import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { isHoneypotAdminRequest } from '@/lib/honeypot-admin'

export type RoleGuardResult = {
  ok: boolean
  email?: string
  role?: string
}

const COMMAND_ROLE = 'SUPREME_COMMANDER'

export function isCommanderEmail(email: string): boolean {
  const configured = (process.env.COMMANDER_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (configured.length === 0) {
    return false
  }

  return configured.includes(email.trim().toLowerCase())
}

export async function authorizeCommander(
  request: NextRequest,
): Promise<RoleGuardResult> {
  const authToken = request.cookies.get('auth_token')?.value
  if (!authToken) {
    return { ok: false }
  }

  const jwtSecret = process.env.JWT_SECRET || 'supersecret'

  try {
    const decoded = jwt.verify(authToken, jwtSecret) as { email?: string }
    const email = decoded.email ?? ''
    if (!email) {
      return { ok: false }
    }

    if (isHoneypotAdminRequest(request, email) || isCommanderEmail(email)) {
      return { ok: true, email, role: COMMAND_ROLE }
    }

    return { ok: false, email }
  } catch {
    return { ok: false }
  }
}
