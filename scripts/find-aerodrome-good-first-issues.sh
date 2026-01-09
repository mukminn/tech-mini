#!/usr/bin/env bash
# Requires: GitHub CLI (gh) logged in
set -euo pipefail

ORG="aerodrome-finance"
REPOS=(contracts slipstream relay docs bots)

for repo in "${REPOS[@]}"; do
  echo -e "\n=== ${ORG}/${repo} ==="
  echo "Good first issues / Help wanted:"
  gh issue list --repo "${ORG}/${repo}" --label "good first issue" --label "help wanted" --state open --limit 50 --json number,title,url,labels || true
  echo "Documentation issues (label: docs):"
  gh issue list --repo "${ORG}/${repo}" --label "docs" --state open --limit 50 --json number,title,url,labels || true
done
