/**
 * In-memory blocked-IP set — Edge-runtime safe (no fs, no crypto).
 * Shared across middleware and API routes in the same Node process.
 */

const blockedIps = new Set<string>()

export function memoryBlockIp(ip: string): void {
  blockedIps.add(ip)
}

export function memoryUnblockIp(ip: string): void {
  blockedIps.delete(ip)
}

export function isIpBlockedInMemory(ip: string): boolean {
  return blockedIps.has(ip)
}

export function getBlockedIpCount(): number {
  return blockedIps.size
}

export function syncBlockedIps(ips: string[]): void {
  blockedIps.clear()
  for (const ip of ips) {
    blockedIps.add(ip)
  }
}
