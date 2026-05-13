#!/usr/bin/env node
const { Keypair, TransactionBuilder, Account, Operation, Memo, Networks } = require("@stellar/stellar-sdk");
const crypto = require("crypto");

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const AGENT_SECRET = process.env.STELLAR_AGENT_SECRET || "SCNMOOYP6PON2VWNPQKECL6M7ZX2BJXUUJDJYL2TQYRCQ6HW6WO5K5UX";

async function submitTransaction(envelopeXdr) {
  const res = await fetch(`${HORIZON_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `tx=${envelopeXdr}`,
  });
  return res.json();
}

async function getAccountSeq(pubKey) {
  const res = await fetch(`${HORIZON_URL}/accounts/${pubKey}`);
  const data = await res.json();
  return data.sequence;
}

async function logAIDecision(threatClass, decisionMatrix, evidenceData) {
  const payer = Keypair.fromSecret(AGENT_SECRET);
  const evidenceHash = crypto.createHash("sha256").update(evidenceData).digest("hex");
  
  console.log("Logging AI decision...");
  console.log("  Threat Class:", threatClass);
  console.log("  Decision:", decisionMatrix);
  console.log("  Evidence Hash:", evidenceHash.substring(0, 16) + "...");

  const timestamp = Date.now().toString();
  const seqNum = await getAccountSeq(payer.publicKey());
  const account = new Account(payer.publicKey(), seqNum);

  const transaction = new TransactionBuilder(account, {
    fee: 500,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .setTimeout(300)
    .addOperation(Operation.manageData({
      name: `threat_${timestamp}`,
      value: threatClass,
    }))
    .addOperation(Operation.manageData({
      name: `action_${timestamp}`,
      value: decisionMatrix,
    }))
    .addOperation(Operation.manageData({
      name: `evidence_${timestamp}`,
      value: evidenceHash,
    }))
    .addOperation(Operation.manageData({
      name: `agent_${timestamp}`,
      value: payer.publicKey(),
    }))
    .addMemo(Memo.hash(evidenceHash))
    .build();

  transaction.sign(payer);
  const envelopeXdr = Buffer.isBuffer(transaction.toEnvelope().toXDR()) 
    ? transaction.toEnvelope().toXDR().toString("base64")
    : transaction.toEnvelope().toXDR();
  
  const result = await submitTransaction(envelopeXdr);
  
  if (result.successful) {
    console.log("Transaction submitted!");
    console.log("   Hash:", result.hash);
    console.log("   Ledger:", result.ledger);
    return result;
  } else {
    throw new Error(JSON.stringify(result));
  }
}

async function initialize() {
  const payer = Keypair.fromSecret(AGENT_SECRET);
  console.log("Initializing AI agent:", payer.publicKey());

  const seqNum = await getAccountSeq(payer.publicKey());
  const account = new Account(payer.publicKey(), seqNum);

  const transaction = new TransactionBuilder(account, {
    fee: 500,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .setTimeout(300)
    .addOperation(Operation.manageData({
      name: "authorized_agent",
      value: payer.publicKey(),
    }))
    .addMemo(Memo.text("MarEye AI Initialization"))
    .build();

  transaction.sign(payer);
  const envelopeXdr = Buffer.isBuffer(transaction.toEnvelope().toXDR()) 
    ? transaction.toEnvelope().toXDR().toString("base64")
    : transaction.toEnvelope().toXDR();
  
  const result = await submitTransaction(envelopeXdr);
  
  if (result.successful) {
    console.log("Transaction submitted!");
    console.log("   Hash:", result.hash);
    return result;
  } else {
    throw new Error(JSON.stringify(result));
  }
}

module.exports = { logAIDecision, initialize };