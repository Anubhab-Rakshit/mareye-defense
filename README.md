<div align="center">
  <img src="public/mareye-logo.svg" width="100" height="100" alt="Marine Security Logo">
  <h1>Marine Security AI Defense System</h1>
  <p><strong>Next-Gen Maritime Domain Awareness & Threat Intelligence Platform</strong></p>
</div>

---

## 🌊 Overview

Marine Security is an advanced, AI-powered maritime defense and surveillance platform designed to provide real-time threat detection, zone-based intelligence, and operational command capabilities. Built with modern, tactical UI paradigms, Marine Security integrates machine learning directly into a high-performance web application to empower naval operations.

> **Note on Deployment:** This repository represents the **Production Frontend & Core API Architecture**. To ensure a smooth browser experience and high-availability deployment on serverless platforms (like Vercel), the heaviest machine-learning background services and edge-device hardware integrations are maintained in dedicated microservice repositories. Essential ML scripts and optimized model weights (e.g., `best.pt`, `Deep_Sea-NN-main/`) are included here to provide native detection and enhancement capabilities via our Next.js API routes.

---

## 🛡️ Key Features (Currently Deployed)

### 1. Tactical Command Dashboards
- **Command Center:** Live alerting, simulated system health telemetry (CPU/Memory/Network), and aggregated threat statistics.
- **Intelligence Zone Mapping:** Real-time zone-wise naval intelligence, incorporating weather, wave heights, and AI-calculated threat severity.
- **War Room & Threat Prediction:** Interactive global visualizations for forward-looking risk insights across operational domains.

### 2. AI & Machine Learning Integrations
- **Threat Detection (YOLO Pipeline):** Upload image/video media to instantly detect and classify maritime threats (submarines, vessels, divers, mines) with confidence scores and bounding boxes.
- **CNN Underwater Enhancement:** Advanced image/video enhancement pipelines to clarify turbid underwater media, outputting measurable quality improvements (PSNR, SSIM, UIQM).
- **AI Intelligence Assistant (Text & Voice):** A Groq-backed conversational AI tuned for military terminology, capable of answering strategic queries, responding to voice wake commands, and summarizing situational reports.

### 3. Defense-Grade Security & Authentication
- **Multi-Modal Login:** Secure authentication using NextAuth/JWT with conventional, Google OAuth, and OTP workflows.
- **Honeypot Trap Architecture:** Advanced middleware that protects sensitive routes. Suspicious probes (e.g., `/wp-admin`, `/.env`) are silently redirected to a high-fidelity honeypot, logging the attacker's IP.
- **Active IP Firewall:** In-memory blocklist management with admin oversight to instantly ban hostile sources.

### 4. Mission & Operations Planning
- **Tactical Path Planner:** Algorithmic routing generation taking known threat zones, shallow waters, and mission parameters into account.
- **Analytics & History:** Comprehensive logging of all platform scans, model inventories, and enhanced media artifacts.

---

## 🏗️ Technical Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Radix UI (Shadcn), Framer Motion (Tactical Animations), Three.js / React-Leaflet (Mapping).
- **Backend (API Routes):** Next.js Serverless Functions, MongoDB (Atlas).
- **AI / ML Integration:** Python scripts executed via `child_process` bridging Next.js to OpenCV, YOLO (Ultralytics), and custom CNN PyTorch models. 
- **LLM Integrations:** Vercel AI SDK alongside Groq for near-instant inference.

---

## 🔒 Security Posture

- **JWT Session Tokens:** Secure, HTTP-only cookie-based authentication.
- **Middleware Protections:** Strict route guarding forcing unauthenticated users back to the landing/demo paths.
- **Decoys & Telemetry:** Integrated honeypot routes feed directly into an admin-only security console for real-time attack analysis.

---

## 🚀 Getting Started (Local Development)

1. Clone the repository and install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Install Python requirements for the ML pipeline:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.local` to your environment (ensure `MONGODB_URI`, `JWT_SECRET`, and `GROQ_API_KEY` are set).
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to access the MarEye interface.

---

*Designed and developed by Anubhab Rakshit for the Hack Among Us Hackathon.*
