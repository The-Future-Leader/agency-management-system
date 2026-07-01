#!/bin/bash
# One-time GitHub push setup script
# Run this in the Replit Shell: bash push-to-github.sh

TOKEN="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "❌ No GitHub token found. Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN in Replit Secrets."
  exit 1
fi

# Store credentials so Replit's Git UI works too
git config --global credential.helper store
echo "https://nileshrajput203:${TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

echo "✅ Credentials configured"

# Push all commits
git push origin main

echo ""
echo "✅ Done! Your code is now on GitHub."
echo "   Replit's Git UI will also work from now on."
