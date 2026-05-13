import { basename, extname, resolve, sep } from "path"
import { randomUUID } from "crypto"

const SAFE_NAME_CHARS = /[^a-zA-Z0-9._-]/g

export function generateSafeUploadFilename(originalName: string, prefix = "upload"): string {
  const baseName = basename(originalName || "file")
  const extension = extname(baseName).toLowerCase().replace(SAFE_NAME_CHARS, "")
  const safeExtension = extension.length > 0 && extension.length <= 10 ? extension : ""
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}${safeExtension}`
}

export function sanitizeFileSegment(segment: string): string {
  return basename(segment || "").replace(SAFE_NAME_CHARS, "_")
}

export function isPathInside(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = resolve(baseDir)
  const resolvedCandidate = resolve(candidatePath)
  return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(`${resolvedBase}${sep}`)
}

export function resolveInsideBase(baseDir: string, ...segments: string[]): string | null {
  const candidate = resolve(baseDir, ...segments)
  return isPathInside(baseDir, candidate) ? candidate : null
}

export function decodeBase64PathSegment(value: string): string | null {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8")
    if (!decoded || decoded.includes("\0")) return null
    return decoded
  } catch {
    return null
  }
}
