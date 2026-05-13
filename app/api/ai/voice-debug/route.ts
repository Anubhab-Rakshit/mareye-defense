import { NextResponse } from "next/server";

type VoiceDebugPayload = {
  event?: string;
  state?: string;
  transcript?: string;
  detected?: boolean;
  error?: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VoiceDebugPayload;
    const timestamp = new Date().toISOString();

    // Terminal-first live diagnostics for speech recognition pipeline.
    console.log(
      `[VOICE-DEBUG ${timestamp}] event=${body.event ?? "unknown"} state=${body.state ?? "unknown"} detected=${String(body.detected ?? false)} transcript="${(body.transcript ?? "").slice(0, 180)}" error=${body.error ?? "none"}`,
    );

    if (body.meta && Object.keys(body.meta).length > 0) {
      console.log(`[VOICE-DEBUG ${timestamp}] meta=`, body.meta);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VOICE-DEBUG] failed to parse payload", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
