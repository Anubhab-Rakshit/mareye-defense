const HONEYPOT_DECOY_ENV = {
  NODE_ENV: "production",
  NEXT_PUBLIC_API_URL: "https://api.mareye-sec.net",
  MONGODB_URI:
    "mongodb+srv://ops_reader:HpReadOnly!783@cluster-sec.mareye-db.net/mareye_prod?retryWrites=true&w=majority",
  JWT_SECRET: "hp_jwt_21f3b0a9d4b54c19afbe0",
  REDIS_URL: "redis://cache_reader:HpRedis!9021@redis.mareye-sec.net:6379/0",
  ADMIN_EMAIL: "ops-control@mareye-sec.net",
  ADMIN_PASSWORD: "HP_Admin#Mareye_2026",
  AWS_ACCESS_KEY_ID: "AKIAHONEYPOTSECNODE",
  AWS_SECRET_ACCESS_KEY: "hp_secret_access_key_64a0df67f9b4f5f92a6",
  OPENAI_API_KEY: "sk-hp-3bbec60c-1e22-4ff2-b9b0-1538a50873d4",
  INTERNAL_API_KEY: "hp_api_5f9f2f799c2a4378b65d",
  HONEYPOT_CANARY: "canary_hp_7f2ddf1c4f244c29",
} as const

const TRACKED_DECOY_KEYS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "REDIS_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "OPENAI_API_KEY",
  "INTERNAL_API_KEY",
  "HONEYPOT_CANARY",
] as const

const TRACKED_DECOY_ENTRIES = TRACKED_DECOY_KEYS.map((key) => ({
  key,
  value: HONEYPOT_DECOY_ENV[key],
}))

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function renderHoneypotDecoyEnvFile(): string {
  return `${Object.entries(HONEYPOT_DECOY_ENV)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`
}

export function findDecoyCredentialHits(rawInput: string): string[] {
  if (!rawInput) return []

  const candidates = [rawInput, decodeSafely(rawInput)].map((value) =>
    value.toLowerCase(),
  )

  const matched = new Set<string>()

  for (const entry of TRACKED_DECOY_ENTRIES) {
    const needle = entry.value.toLowerCase()
    if (candidates.some((candidate) => candidate.includes(needle))) {
      matched.add(entry.key)
    }
  }

  return Array.from(matched)
}

export function getDecoyAdminCredentials() {
  return {
    email: HONEYPOT_DECOY_ENV.ADMIN_EMAIL,
    password: HONEYPOT_DECOY_ENV.ADMIN_PASSWORD,
  }
}
