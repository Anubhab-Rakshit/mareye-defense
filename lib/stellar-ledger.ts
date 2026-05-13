import crypto from 'crypto'
import { createRequire } from 'module'

type LedgerAuditInput = {
  threatClass: string
  actionTaken: string
  lat: number
  lng: number
  threatLevel?: string
}

type LedgerAuditResult = {
  success: boolean
  network: string
  transactionHash: string
  evidenceHash: string
  publicKey: string
  timestamp: string
  skipped?: boolean
  reason?: string
  error?: string
}

const NETWORK = 'Stellar Testnet'

function getSalt(): string {
  const salt = process.env.LEDGER_SALT
  if (!salt) {
    throw new Error('LEDGER_SALT is not configured')
  }
  return salt
}

function buildEvidencePayload(input: LedgerAuditInput, timestamp: string): string {
  return JSON.stringify({
    threatClass: input.threatClass,
    actionTaken: input.actionTaken,
    lat: input.lat,
    lng: input.lng,
    threatLevel: input.threatLevel ?? 'UNKNOWN',
    timestamp,
  })
}

function computeEvidenceHash(payload: string, salt: string): string {
  return crypto.createHash('sha256').update(`${payload}:${salt}`).digest('hex')
}

export async function auditThreatToStellar(
  input: LedgerAuditInput,
): Promise<LedgerAuditResult> {
  const normalized = input.threatClass.toLowerCase().trim()
  const isTargetThreat = /(\bmine\b|\bmines\b|\bsubmarine\b|\bmayin\b)/i.test(normalized)
  if (!isTargetThreat) {
    return {
      success: true,
      network: NETWORK,
      transactionHash: '',
      evidenceHash: '',
      publicKey: '',
      timestamp: new Date().toISOString(),
      skipped: true,
      reason: `Threat class '${input.threatClass}' not audited`,
    }
  }

  const timestamp = new Date().toISOString()
  let salt = ''
  let payload = ''
  let evidenceHash = ''

  try {
    salt = getSalt()
    payload = buildEvidencePayload(input, timestamp)
    evidenceHash = computeEvidenceHash(payload, salt)
  } catch (error) {
    return {
      success: false,
      network: NETWORK,
      transactionHash: '',
      evidenceHash: '',
      publicKey: '',
      timestamp,
      error: error instanceof Error ? error.message : 'Ledger audit failed',
    }
  }

  const require = createRequire(import.meta.url)
  const ledgerClient = require('../smart_contracts/stellar-client.js')
  if (!ledgerClient?.logAIDecision) {
    return {
      success: false,
      network: NETWORK,
      transactionHash: '',
      evidenceHash,
      publicKey: '',
      timestamp,
      error: 'Stellar ledger client is unavailable',
    }
  }

  const actionSummary = `${input.actionTaken} | level=${input.threatLevel ?? 'UNKNOWN'}`
  try {
    const result = await ledgerClient.logAIDecision(
      input.threatClass,
      actionSummary,
      evidenceHash,
    )

    return {
      success: Boolean(result?.successful),
      network: NETWORK,
      transactionHash: result?.hash ?? '',
      evidenceHash,
      publicKey: result?.source_account ?? '',
      timestamp,
      error: result?.error || result?.extras?.result_codes ? JSON.stringify(result?.extras?.result_codes) : undefined,
    }
  } catch (error) {
    return {
      success: false,
      network: NETWORK,
      transactionHash: '',
      evidenceHash,
      publicKey: '',
      timestamp,
      error: error instanceof Error ? error.message : 'Ledger audit failed',
    }
  }
}
