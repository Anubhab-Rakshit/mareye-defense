import type { NextApiRequest, NextApiResponse } from "next";
import { logAIDecision } from "../stellar-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { threatClass, decisionMatrix, evidenceData } = req.body;

  if (!threatClass || !decisionMatrix || !evidenceData) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await logAIDecision(threatClass, decisionMatrix, evidenceData);
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