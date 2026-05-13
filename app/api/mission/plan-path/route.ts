/**
 * POST /api/mission/plan-path
 *
 * Body: {
 *   start:        { lat: number, lng: number }
 *   goal:         { lat: number, lng: number }
 *   threat_zones: Array<{ lat, lon, radius, threatLevel }>
 *   vessel_speed?: number   (knots, default 18)
 *   utc_hour?:    number
 *   month?:       number
 * }
 *
 * Calls Python run_planner.py via subprocess and returns the result.
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// How long to wait for the planner (ms)
const PLANNER_TIMEOUT_MS = 60_000

function getPythonExec(): string {
  const candidates = [
    path.join(process.cwd(), '.venv', 'Scripts', 'python.exe'),     // Windows venv
    path.join(process.cwd(), '.venv', 'bin', 'python3'),            // Linux/Mac venv
    path.join(process.cwd(), '.venv', 'bin', 'python'),
    'python3',
    'python',
  ]
  for (const c of candidates) {
    if (c.endsWith('.exe') || c.endsWith('python') || c.endsWith('python3')) {
      if (c.includes('.venv')) {
        if (fs.existsSync(c)) return c
      } else {
        return c
      }
    }
  }
  return 'python'
}

function runPlanner(inputJson: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = getPythonExec()
    const script = path.join(process.cwd(), 'detection', 'path_planner', 'run_planner.py')

    // Write input to a temp file (avoids shell escaping issues)
    const tmpId = crypto.randomBytes(6).toString('hex')
    const tmpIn  = path.join(os.tmpdir(), `planner_in_${tmpId}.json`)
    const tmpOut = path.join(os.tmpdir(), `planner_out_${tmpId}.json`)

    try {
      fs.writeFileSync(tmpIn, inputJson, 'utf8')
    } catch (e) {
      reject(new Error(`Failed to write planner input: ${e}`))
      return
    }

    const child = spawn(python, [script, '--input', tmpIn, '--output', tmpOut], {
      cwd: process.cwd(),
      timeout: PLANNER_TIMEOUT_MS,
    })

    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d.toString() })

    child.on('close', (code) => {
      // Cleanup input
      try { fs.unlinkSync(tmpIn) } catch {}

      if (code !== 0) {
        try { fs.unlinkSync(tmpOut) } catch {}
        reject(new Error(`Planner exited ${code}: ${stderr.slice(-1000)}`))
        return
      }

      try {
        const output = fs.readFileSync(tmpOut, 'utf8')
        fs.unlinkSync(tmpOut)
        resolve(output)
      } catch (e) {
        reject(new Error(`Failed to read planner output: ${e}\nstderr: ${stderr}`))
      }
    })

    child.on('error', (err) => {
      try { fs.unlinkSync(tmpIn) } catch {}
      try { fs.unlinkSync(tmpOut) } catch {}
      reject(new Error(`Planner spawn error: ${err.message}`))
    })
  })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { start, goal, threat_zones, vessel_speed, utc_hour, month } = body as any

  if (!start?.lat || !start?.lng || !goal?.lat || !goal?.lng) {
    return NextResponse.json(
      { ok: false, error: 'start and goal with lat/lng are required' },
      { status: 400 },
    )
  }

  const inputPayload = JSON.stringify({
    start,
    goal,
    threat_zones: threat_zones ?? [],
    vessel_speed: vessel_speed ?? 18,
    utc_hour:     utc_hour  ?? new Date().getUTCHours(),
    month:        month     ?? new Date().getMonth() + 1,
  })

  try {
    const outputJson = await runPlanner(inputPayload)
    const result = JSON.parse(outputJson)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[plan-path] Error:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    )
  }
}
