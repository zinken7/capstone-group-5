#!/usr/bin/env bash
set -euo pipefail

# Each service owns its toolchain, dependency installation, lint, typecheck and
# tests. Do not guess a language or silently accept code without CI coverage.
if [[ -f services/ci.sh ]]; then
  bash services/ci.sh
  exit 0
fi

while IFS= read -r -d '' file; do
  case "$file" in
    *.md|*.mdx|*.rst|*/.gitkeep) continue ;;
    *) echo "Service code has no CI entry point. Add services/ci.sh with its lint, typecheck and tests." >&2; exit 1 ;;
  esac
done < <(git ls-files -z services)
echo 'No service implementation or checks exist yet; services/ contains documentation only.'
