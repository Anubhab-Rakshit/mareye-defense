import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import type { NextRequest } from 'next/server'

const LOG_DIRECTORY = path.join(process.cwd(), '.security')
const LOG_FILE = path.join(LOG_DIRECTORY, 'honeypot-events.ndjson')
const MAX_BODY_LENGTH = 4096

const INDICATOR_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'path-probe-dotenv', pattern: /\.env/i },
  { label: 'path-probe-git', pattern: /\.git/i },
  { label: 'path-probe-admin', pattern: /admin|wp-login|phpmyadmin/i },
  { label: 'sqli-pattern', pattern: /(\bor\b\s+1=1|union\s+select|sleep\(|information_schema|--)/i },
  { label: 'xss-pattern', pattern: /<script|javascript:|onerror=|onload=/i },
  { label: 'path-traversal-pattern', pattern: /(\.\/.\.\.|\.{2}\/|%2e%2e%2f)/i },
  { label: 'rce-pattern', pattern: /(\b(?:bash|sh|cmd|powershell)\b|;\s*cat\s+|\$\(|`)/i },
  { label: 'scanner-signature', pattern: /(sqlmap|nmap|nikto|acunetix|burpsuite|curl\/|python-requests)/i },
  {
    label: 'decoy-credential-reuse',
    pattern: /decoy-credential-reuse|canary_hp_|hp_api_|hp_jwt_|akiahoneypot/i,
  },
]

export type HoneypotEvent = {
  id: string
  timestamp: string
  ip: string
  ipHash: string
  userAgent: string
  method: string
  targetPath: string
  query: Record<string, string>
  bodySample: string
  indicators: string[]
  riskScore: number
  requestHeaders: {
    referer: string
    acceptLanguage: string
    origin: string
  }
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return 'unknown'
}

function hashIp(ipAddress: string): string {
  return crypto.createHash('sha256').update(ipAddress).digest('hex').slice(0, 16)
}

function normalizeBodySample(rawBody: string): string {
  if (!rawBody) {
    return ''
  }

  const compact = rawBody.replace(/\s+/g, ' ').trim()
  if (compact.length <= MAX_BODY_LENGTH) {
    return compact
  }

  return `${compact.slice(0, MAX_BODY_LENGTH)}...[truncated]`
}

function collectIndicators(...inputs: string[]): string[] {
  const joined = inputs.join(' ')
  const matched = new Set<string>()

  for (const rule of INDICATOR_RULES) {
    if (rule.pattern.test(joined)) {
      matched.add(rule.label)
    }
  }

  return Array.from(matched)
}

function calculateRiskScore(method: string, indicators: string[], targetPath: string): number {
  let score = 15

  if (method !== 'GET' && method !== 'HEAD') {
    score += 15
  }

  if (/admin|debug|internal|\.env|\.git|phpmyadmin|wp-login/i.test(targetPath)) {
    score += 30
  }

  if (indicators.includes('decoy-credential-reuse')) {
    score += 45
  }

  score += indicators.length * 10

  return Math.min(score, 100)
}

export async function logHoneypotEvent(
  request: NextRequest,
  options: {
    targetPath: string
    bodySample?: string
  },
): Promise<HoneypotEvent> {
  const requestUrl = new URL(request.url)
  const queryEntries = Object.fromEntries(requestUrl.searchParams.entries())
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const bodySample = normalizeBodySample(options.bodySample ?? '')

  const indicators = collectIndicators(
    options.targetPath,
    requestUrl.search,
    userAgent,
    bodySample,
  )

  const event: HoneypotEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ip,
    ipHash: hashIp(ip),
    userAgent,
    method: request.method,
    targetPath: options.targetPath,
    query: queryEntries,
    bodySample,
    indicators,
    riskScore: calculateRiskScore(request.method, indicators, options.targetPath),
    requestHeaders: {
      referer: request.headers.get('referer') ?? '',
      acceptLanguage: request.headers.get('accept-language') ?? '',
      origin: request.headers.get('origin') ?? '',
    },
  }

  await fs.mkdir(LOG_DIRECTORY, { recursive: true })
  await fs.appendFile(LOG_FILE, `${JSON.stringify(event)}\n`, 'utf8')

  return event
}

export async function readHoneypotEvents(limit = 100): Promise<HoneypotEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 500))

  try {
    const content = await fs.readFile(LOG_FILE, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as HoneypotEvent
        } catch {
          return null
        }
      })
      .filter((event): event is HoneypotEvent => Boolean(event))

    return parsed.slice(-safeLimit).reverse()
  } catch {
    return []
  }
}

export async function maybeSendHoneypotAlert(event: HoneypotEvent): Promise<void> {
  const webhookUrl = process.env.HONEYPOT_ALERT_WEBHOOK_URL
  if (!webhookUrl) {
    return
  }

  const threshold = Number(process.env.HONEYPOT_ALERT_THRESHOLD ?? '70')
  if (event.riskScore < threshold) {
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        source: 'mareye-honeypot',
        level: 'high',
        timestamp: event.timestamp,
        riskScore: event.riskScore,
        targetPath: event.targetPath,
        ip: event.ip,
        indicators: event.indicators,
      }),
    })
  } catch {
    // Alerts are best-effort and must never affect app responses.
  }
}

export async function readHoneypotAdminToken(): Promise<string | null> {
  const envToken = process.env.HONEYPOT_ADMIN_TOKEN
  if (envToken && envToken.trim()) {
    return envToken.trim()
  }

  const tokenFilePath = path.join(LOG_DIRECTORY, 'honeypot-admin-token')
  try {
    const token = await fs.readFile(tokenFilePath, 'utf8')
    const trimmed = token.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}
