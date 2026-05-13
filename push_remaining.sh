#!/bin/bash
# Script to add remaining frontend files that were blocked by permissions
echo "🚀 Adding remaining frontend files and API routes..."
git add app/detection/
git add app/api/detection/process/
git add public/
git add styles/
git add pnpm-lock.yaml
git add server.js

# Note: .gitignore already handles excluding all backend/ML files (*.py, *.pt, etc.)

echo "💾 Committing changes..."
git commit -m "Complete frontend architecture and asset integration"

echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ All done! Only frontend and API routes have been uploaded."
