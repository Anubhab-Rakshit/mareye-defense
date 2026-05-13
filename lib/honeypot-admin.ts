import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'
const ADMIN_SESSION_COOKIE = 'honeypot_admin_token'
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type HoneypotAdminClaims = {
  type: 'honeypot-admin'
  email: string
}

function configuredAdminEmail(): string {
  return (process.env.HONEYPOT_ADMIN_EMAIL || '').trim().toLowerCase()
}

function configuredAdminPassword(): string {
  return process.env.HONEYPOT_ADMIN_PASSWORD || ''
}

export function isConfiguredHoneypotAdminCredential(email: string, password: string): boolean {
  const adminEmail = configuredAdminEmail()
  const adminPassword = configuredAdminPassword()

  if (!adminEmail || !adminPassword) {
    return false
  }

  return email.trim().toLowerCase() === adminEmail && password === adminPassword
}

export function isConfiguredHoneypotAdminEmail(email: string): boolean {
  const adminEmail = configuredAdminEmail()
  if (!adminEmail) {
    return false
  }

  return email.trim().toLowerCase() === adminEmail
}

export function createHoneypotAdminSessionToken(email: string): string {
  const payload: HoneypotAdminClaims = {
    type: 'honeypot-admin',
    email: email.trim().toLowerCase(),
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS })
}

export function verifyHoneypotAdminSessionToken(token: string | undefined): HoneypotAdminClaims | null {
  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as HoneypotAdminClaims
    if (decoded.type !== 'honeypot-admin') {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

export function isHoneypotAdminRequest(request: NextRequest, authenticatedEmail?: string): boolean {
  const adminSessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const claims = verifyHoneypotAdminSessionToken(adminSessionToken)
  if (!claims) {
    return false
  }

  const configuredEmail = configuredAdminEmail()
  if (!configuredEmail || claims.email !== configuredEmail) {
    return false
  }

  if (authenticatedEmail && claims.email !== authenticatedEmail.trim().toLowerCase()) {
    return false
  }

  return true
}

export function honeypotAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
    expires: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000),
  }
}

export function honeypotAdminCookieName(): string {
  return ADMIN_SESSION_COOKIE
}
