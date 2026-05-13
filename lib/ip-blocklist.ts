import fs from 'fs/promises'
import path from 'path'

const SECURITY_DIR = path.join(process.cwd(), '.security')
const BLOCKLIST_FILE = path.join(SECURITY_DIR, 'blocked-ips.json')

export type BlockedIpEntry = {
  ip: string
  blockedAt: string
  reason: string
  /** 'manual' = admin clicked block, 'auto' = auto-blocked by risk threshold */
  source: 'manual' | 'auto'
  /** optional expiry ISO string; null = permanent */
  expiresAt: string | null
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(SECURITY_DIR, { recursive: true })
}

export async function loadBlocklist(): Promise<BlockedIpEntry[]> {
  try {
    const raw = await fs.readFile(BLOCKLIST_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Remove expired entries
    const now = new Date().toISOString()
    return parsed.filter(
      (e: BlockedIpEntry) => !e.expiresAt || e.expiresAt > now,
    )
  } catch {
    return []
  }
}

async function saveBlocklist(list: BlockedIpEntry[]): Promise<void> {
  await ensureDir()
  await fs.writeFile(BLOCKLIST_FILE, JSON.stringify(list, null, 2), 'utf8')
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  const list = await loadBlocklist()
  return list.some((entry) => entry.ip === ip)
}

export async function blockIp(
  ip: string,
  reason: string,
  source: 'manual' | 'auto' = 'manual',
  expiresAt: string | null = null,
): Promise<BlockedIpEntry> {
  const list = await loadBlocklist()

  // Don't duplicate
  const existing = list.find((e) => e.ip === ip)
  if (existing) {
    existing.reason = reason
    existing.source = source
    existing.expiresAt = expiresAt
    await saveBlocklist(list)
    return existing
  }

  const entry: BlockedIpEntry = {
    ip,
    blockedAt: new Date().toISOString(),
    reason,
    source,
    expiresAt,
  }
  list.push(entry)
  await saveBlocklist(list)
  return entry
}

export async function unblockIp(ip: string): Promise<boolean> {
  const list = await loadBlocklist()
  const filtered = list.filter((e) => e.ip !== ip)
  if (filtered.length === list.length) return false
  await saveBlocklist(filtered)
  return true
}
