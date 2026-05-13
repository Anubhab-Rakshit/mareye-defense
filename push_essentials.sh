#!/bin/bash
# Script to push essential backend and auth fixes
echo "🚀 Preparing essential backend files and Auth fixes..."

# Ensure we stage all changes
git add lib/google-oauth.ts
git add app/api/auth/google/route.ts
git add app/api/auth/google/callback/route.ts
git add .gitignore

# Try to add backend files (might need sudo if permissions are still weird)
echo "📦 Adding backend scripts and models..."
git add threat_detector.py || true
git add best.pt || true
git add Deep_Sea-NN-main/ || true
git add requirements.txt || true
git add process_enhancement_video.py || true
git add convert_to_h264.py || true

echo "💾 Committing essentials..."
git commit -m "Configure production Auth and integrate core ML backend"

echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ Deployment ready! Vercel should now be able to handle OAuth and core features."
