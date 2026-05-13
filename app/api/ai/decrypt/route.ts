import { generateGroqResponse } from "@/lib/groq-client";
import { NextResponse } from "next/server";

const DECRYPT_PROMPT = `
You are an advanced military decryption AI, 'MARINE-SIGINT-V4'.
Your task is to take a garbled, encrypted radio intercept and "decrypt" it into a highly formal, classified tactical alert.

INPUT FORMAT: Always simulated radio static and pirate slang.
OUTPUT FORMAT:
1. STRICTLY formatted as a military intelligence terminal readout.
2. Must contain: [CLASSIFICATION LEVEL], [SOURCE BEARING], [DECRYPTED MESSAGE], and [RECOMMENDED ACTION].
3. DO NOT include any conversational filler (e.g., "Here is your decryption"). Start immediately with the readout.
4. Keep it tense, realistic, and max 4 lines long.

Example Output:
[CLASSIFICATION: TOP SECRET // NOFORN]
[BEARING: 045 TAG 12.8N 77.5E]
[MESSAGE]: "Target acquired. Cargo vessel inbound. Speed 15 knots. Scramble intercept."
[ACTION]: SCRAMBLE QRF TO SECTOR 7
`;

export async function POST(req: Request) {
  try {
    const { intercept } = await req.json();

    if (!intercept) {
      return NextResponse.json(
        { error: "No intercept provided." },
        { status: 400 },
      );
    }

    const prompt = `Decrypt the following intercepted signal:\n\n${intercept}`;
    const response = await generateGroqResponse(prompt, DECRYPT_PROMPT);

    return NextResponse.json({ decryption: response });
  } catch (error: any) {
    console.error("Decryption error:", error);
    return NextResponse.json(
      { error: "Failed to decrypt signal: " + error.message },
      { status: 500 },
    );
  }
}
