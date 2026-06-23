#!/usr/bin/env bash
# Verify the cdn-rewrite initContainer renders an immutable CDN URL and that
# misconfiguration fails fast, so a broken rewrite blocks the rollout instead
# of deploying hash-less asset URLs.
set -euo pipefail

CHART_DIR="${CHART_DIR:-charts}"
fail=0

pass() { printf 'PASS: %s\n' "$1"; }
err() {
  printf 'FAIL: %s\n' "$1" >&2
  fail=1
}

# 1. Disabled by default: no initContainer rendered.
out="$(helm template t "${CHART_DIR}")"
if grep -q 'name: cdn-rewrite' <<<"${out}"; then
  err "cdn disabled by default should not render cdn-rewrite initContainer"
else
  pass "cdn disabled by default renders no initContainer"
fi

# 2. Enabled with valid config: immutable CDN URL + verification guard present.
out="$(helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.baseUrl=https://cdn.example/bcit-ltc \
  --set cdn.commitSha=abc1234 \
  --set 'cdn.assetExtensions={css,js}')"

check() {
  if grep -qF "$1" <<<"${out}"; then
    pass "render contains: $1"
  else
    err "render missing: $1"
  fi
}
check 'name: cdn-rewrite'
check 'CDN_BASE_URL="https://cdn.example/bcit-ltc"'
check 'CDN_SHA="abc1234"'
check 'CDN_URL="${CDN_BASE_URL}/sugar-suite/${CDN_SHA}"'
check 'rewrite did not inject'

# 3. Enabled but missing commitSha must fail render (required guard).
if helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.baseUrl=https://cdn.example/bcit-ltc \
  --set 'cdn.assetExtensions={css,js}' >/dev/null 2>&1; then
  err "missing cdn.commitSha should fail render"
else
  pass "missing cdn.commitSha fails render"
fi

# 4. Enabled but missing baseUrl must fail render (required guard).
if helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.commitSha=abc1234 \
  --set 'cdn.assetExtensions={css,js}' >/dev/null 2>&1; then
  err "missing cdn.baseUrl should fail render"
else
  pass "missing cdn.baseUrl fails render"
fi

exit "${fail}"
