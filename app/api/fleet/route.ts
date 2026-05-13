import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FLEET_DB = path.join(process.cwd(), 'data', 'fleet.json');

export async function GET() {
  try {
    const raw = fs.readFileSync(FLEET_DB, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Fleet DB read error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = fs.readFileSync(FLEET_DB, 'utf-8');
    const data = JSON.parse(raw);

    if (body.action === 'reset') {
      // Reset all ships to patrolling state
      data.vessels = data.vessels.map((v: any) => ({
        ...v,
        status: 'PATROLLING',
        last_updated: new Date().toISOString(),
      }));
      data.active_threats = [];
    }

    fs.writeFileSync(FLEET_DB, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
