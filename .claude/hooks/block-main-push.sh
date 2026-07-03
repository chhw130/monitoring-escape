#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('command', ''))" 2>/dev/null || echo "")

if ! echo "$COMMAND" | grep -qE "^git push"; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "⛔ main 브랜치에 직접 push할 수 없습니다. /ship 스킬을 사용하거나 feature 브랜치로 전환하세요." >&2
  exit 2
fi
