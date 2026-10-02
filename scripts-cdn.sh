#!/usr/bin/env bash
# Build and publish dist/ to the `cdn` branch (served by jsDelivr until Vercel is connected). Prints the pinned base URL.
set -e
cd "$(dirname "$0")"
npm run build >/dev/null
TMP=$(mktemp -d)
cp -r dist/. "$TMP"/
git fetch -q origin cdn 2>/dev/null || true
WT=$(mktemp -d)
if git show-ref -q --verify refs/remotes/origin/cdn; then git worktree add -q -B cdn "$WT" origin/cdn; else git worktree add -q --orphan -b cdn "$WT" 2>/dev/null || { git worktree add -q --detach "$WT"; (cd "$WT" && git checkout -q --orphan cdn && git rm -rqf .); }; fi
(cd "$WT" && git rm -rqf . 2>/dev/null || true; cp -r "$TMP"/. . && git add -A && git commit -qm "cdn build $(date -u +%FT%TZ)" && git push -q origin cdn)
SHA=$(cd "$WT" && git rev-parse HEAD)
git worktree remove --force "$WT"
echo "https://cdn.jsdelivr.net/gh/nikita343/givzey-webflow@$SHA/"
