import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { logAIDecision } from "../stellar-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { threatClass, decisionMatrix, evidenceData, evidenceHash } = req.body;

  if (!threatClass || !decisionMatrix || (!evidenceData && !evidenceHash)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const finalHash =
      typeof evidenceHash === "string" && evidenceHash.length > 0
        ? evidenceHash
        : crypto.createHash("sha256").update(String(evidenceData)).digest("hex");
    const result = await logAIDecision(threatClass, decisionMatrix, finalHash);
    res.status(200).json({ 
      success: true, 
      txHash: result.hash,
      ledger: result.ledger 
    });
  } catch (error) {
    console.error("Stellar transaction failed:", error);
    res.status(500).json({ error: "Transaction failed" });
  }
}
