#!/usr/bin/env bash
# clone-aerodrome.sh
# Usage:
#   HTTPS (default): ./clone-aerodrome.sh
#   SSH: CLONE_SSH=1 ./clone-aerodrome.sh
set -euo pipefail

ROOT_DIR="${1:-aerodrome-repos}"
USE_SSH="${CLONE_SSH:-0}"

REPOS=(
  "contracts"
  "slipstream"
  "relay"
  "docs"
  "bots"
)

ORG="aerodrome-finance"
mkdir -p "$ROOT_DIR"
cd "$ROOT_DIR"

echo "Cloning ${#REPOS[@]} repositories from ${ORG} into $(pwd)..."
for repo in "${REPOS[@]}"; do
  if [ "$USE_SSH" = "1" ]; then
    url="git@github.com:${ORG}/${repo}.git"
  else
    url="https://github.com/${ORG}/${repo}.git"
  fi

  if [ -d "$repo" ]; then
    echo "Skipping ${repo} (directory already exists)"
    continue
  fi

  echo "Cloning ${repo}..."
  git clone "$url" || { echo "Failed to clone ${repo}"; exit 1; }
done

echo "All done. Repositories cloned into: $(pwd)"
