# Aerodrome / Base Contribution Helpers

This folder contains utilities to help find and make contributions to Aerodrome Finance projects (and similar Base ecosystem repos). Use `clone-aerodrome.sh` to fetch the repos and `scripts/find-aerodrome-good-first-issues.sh` to list beginner issues (requires `gh`).

Usage:
1. Make the scripts executable:
   ```bash
   chmod +x clone-aerodrome.sh scripts/find-aerodrome-good-first-issues.sh
   ```
2. Clone repos (HTTPS default):
   ```bash
   ./clone-aerodrome.sh
   ```
3. Install and authenticate GitHub CLI (`gh auth login`) then run:
   ```bash
   ./scripts/find-aerodrome-good-first-issues.sh
   ```

After you have a list of candidate issues, pick one and:
- Fork the target repo (GitHub UI)
- Create a branch, make changes, run tests, push branch to your fork
- Open a PR and link it in the meta-issue `Track and Plan Contributions to Base Ecosystem and Crypto/Web3 Projects` in this repo
