#!/usr/bin/env bash
# Verify the cdn-rewrite initContainer renders with an immutable CDN URL, conservative resource requests/limits, and that misconfiguration fails fast so a broken rewrite blocks the rollout instead of deploying hash-less asset URLs.
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
  --set cdn.contentRef=abc1234 \
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
check 'CDN_REF="abc1234"'
check 'CDN_URL="${CDN_BASE_URL}/sugar-suite/${CDN_REF}"'
check 'relative asset references not rewritten to'

# 2a. Resource requests and limits render for the cdn-rewrite initContainer.
# Extract just the initContainer block so the checks don't match the nginx container's identical resource values.
init_block="$(awk '/name: cdn-rewrite/{f=1} f{print} f&&/volumeMounts:/{exit}' <<<"${out}")"
check_in_block() {
  # Anchor to end-of-line so e.g. 'memory: 128Mi' can't match '1128Mi'.
  if grep -qE "$2[[:space:]]*$" <<<"$1"; then
    pass "initContainer contains: $2"
  else
    err "initContainer missing: $2"
  fi
}
check_in_block "${init_block}" 'cpu: 100m'
check_in_block "${init_block}" 'cpu: 50m'
check_in_block "${init_block}" 'memory: 64Mi'
check_in_block "${init_block}" 'memory: 128Mi'

# 3. Enabled but missing contentRef must fail render (required guard).
if helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.baseUrl=https://cdn.example/bcit-ltc \
  --set 'cdn.assetExtensions={css,js}' >/dev/null 2>&1; then
  err "missing cdn.contentRef should fail render"
else
  pass "missing cdn.contentRef fails render"
fi

# 4. Enabled but missing baseUrl must fail render (required guard).
if helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.contentRef=abc1234 \
  --set 'cdn.assetExtensions={css,js}' >/dev/null 2>&1; then
  err "missing cdn.baseUrl should fail render"
else
  pass "missing cdn.baseUrl fails render"
fi

# 5. Enabled with a schemeless baseUrl must fail render (scheme guard — a schemeless scheme+host gets treated as a relative URL by browsers and corrupts asset paths).
if helm template t "${CHART_DIR}" \
  --set cdn.enabled=true \
  --set cdn.baseUrl=cdn.example.com \
  --set cdn.contentRef=abc1234 \
  --set 'cdn.assetExtensions={css,js}' >/dev/null 2>&1; then
  err "schemeless cdn.baseUrl should fail render"
else
  pass "schemeless cdn.baseUrl fails render"
fi

# 6a. Behavioural: run the rendered initContainer script against a fixture dist containing quoted AND unquoted HTML asset attributes (minified production output) and verify every relative AND root-relative reference is rewritten — both branches of the rewrite must stay covered.
if command -v yq >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT

  helm template t "${CHART_DIR}" \
    --set cdn.enabled=true \
    --set cdn.baseUrl=https://cdn.example/bcit-ltc \
    --set cdn.contentRef=abc1234 \
    --set 'cdn.assetExtensions={css,js,ico,png}' \
    --show-only templates/deployment.yaml \
    | yq -r '.spec.template.spec.initContainers[0].args[0]' > "${tmp}/rewrite.sh"

  # Retarget absolute container paths into the temp dir: the source dist first (it contains /html as a substring), then the shared /html volume.
  # Portable in-place edit (BSD/macOS sed requires a -i suffix argument)
  sed -e "s#/usr/share/nginx/html#${tmp}/src#g" -e "s#/html#${tmp}/html#g" \
    "${tmp}/rewrite.sh" > "${tmp}/rewrite.sh.new" && mv "${tmp}/rewrite.sh.new" "${tmp}/rewrite.sh"

  mkdir -p "${tmp}/src" "${tmp}/html"
  cat > "${tmp}/src/index.html" <<'EOF'
<!doctype html><html lang=en><head><link rel=icon type=image/x-icon href=/favicon.ico><title>t</title><script defer src=main_bundle.js></script><link rel="stylesheet" href="./style.css"></head><body><img src='./bcit_rev.png'><img src="/bcit_logo.png"><a href="https://example.org/x.png">ext</a></body></html>
EOF
  echo 'const a="./bcit_rev.png"; const b="/bcit_logo.png";' > "${tmp}/src/main_bundle.js"
  echo 'body{background:url(./bcit_rev.png)} a{background:url(/bcit_logo.png)}' > "${tmp}/src/style.css"

  sh "${tmp}/rewrite.sh"

  check_file() {
    if grep -qF "$2" "$1"; then
      pass "$(basename "$1") contains: $2"
    else
      err "$(basename "$1") missing: $2"
    fi
  }

  check_file "${tmp}/html/index.html" 'href="https://cdn.example/bcit-ltc/sugar-suite/abc1234/favicon.ico"'
  check_file "${tmp}/html/index.html" 'src="https://cdn.example/bcit-ltc/sugar-suite/abc1234/main_bundle.js"'
  check_file "${tmp}/html/index.html" 'href="https://cdn.example/bcit-ltc/sugar-suite/abc1234/style.css"'
  check_file "${tmp}/html/index.html" "src='https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_rev.png'"
  check_file "${tmp}/html/index.html" 'src="https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_logo.png"'
  check_file "${tmp}/html/index.html" 'href="https://example.org/x.png"'
  check_file "${tmp}/html/main_bundle.js" '"https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_rev.png"'
  check_file "${tmp}/html/main_bundle.js" '"https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_logo.png"'
  check_file "${tmp}/html/style.css" 'url(https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_rev.png)'
  check_file "${tmp}/html/style.css" 'url(https://cdn.example/bcit-ltc/sugar-suite/abc1234/bcit_logo.png)'

  # 6b. Regression: vendor files whose only extension-like substrings live in comments or prose
  # (alert text, acknowledgements, sourceMappingURL) must not trip the post-rewrite verification
  # — these shipped in js/vendor/ and failed the rollout before verification became grammar-aware.
  tmp2="$(mktemp -d)"
  trap 'rm -rf "${tmp}" "${tmp2}"' EXIT

  helm template t "${CHART_DIR}" \
    --set cdn.enabled=true \
    --set cdn.baseUrl=https://cdn.example/bcit-ltc \
    --set cdn.contentRef=abc1234 \
    --set 'cdn.assetExtensions={js,map}' \
    --show-only templates/deployment.yaml \
    | yq -r '.spec.template.spec.initContainers[0].args[0]' > "${tmp2}/rewrite.sh"
  sed -e "s#/usr/share/nginx/html#${tmp2}/src#g" -e "s#/html#${tmp2}/html#g" \
    "${tmp2}/rewrite.sh" > "${tmp2}/rewrite.sh.new" && mv "${tmp2}/rewrite.sh.new" "${tmp2}/rewrite.sh"

  mkdir -p "${tmp2}/src" "${tmp2}/html"
  cat > "${tmp2}/src/vendor_note.js" <<'EOF'
// Thanks to less.js for some of the basics (see <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js> and jquery.xcolor.js)
alert("DataTables warning: Formatted date without Moment.js or Luxon - https://example.test/tn/17");
//# sourceMappingURL=vendor_note.js.map
EOF

  sh "${tmp2}/rewrite.sh"

  if grep -qF 'https://cdn.example/bcit-ltc/sugar-suite/abc1234' "${tmp2}/html/vendor_note.js"; then
    err "vendor_note.js (comment/prose refs only) should not gain CDN URLs"
  else
    pass "vendor_note.js (comment/prose refs only) passes verification unrewritten"
  fi
else
  err "yq required for behavioural test"
fi

exit "${fail}"
