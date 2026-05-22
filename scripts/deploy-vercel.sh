#!/usr/bin/env bash
set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI is not installed. Install with: npm i -g vercel"
  exit 1
fi

echo "Deploying VoicePreserve to Vercel production..."
vercel --prod
