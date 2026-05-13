# TerraChain Military Audit Ledger - MarEye
Immutable AI decision logging on Stellar using native Stellar transactions.

## Deployment Summary

| Item | Value |
|-------|-------|
| **Network** | Stellar Testnet |
| **Explorer** | https://stellar.expert/explorer/testnet |
| **AI Agent** | `GCQZLSZS5POGTKV2UDP4E4PJ5AA7BPVDV33RQGSVBQIQSFGKDTU64MQN` |

## How It Works

Uses **native Stellar ManageData operations** to log AI decisions immutably to the ledger.

## Environment Variables

```bash
STELLAR_AGENT_SECRET=SCNMOOYP6PON2VWNPQKECL6M7ZX2BJXUUJDJYL2TQYRCQ6HW6WO5K5UX
```

## Usage

```bash
cd smart_contracts
node stellar-client.js init
node stellar-client.js log "SUBMARINE" "Rerouted Vikrant" "yolo_detection.jpg"
```