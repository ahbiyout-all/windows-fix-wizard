#!/usr/bin/env bash
set -uo pipefail

# Windows Fix Wizard - Automated curl-based 3-Way Sync & Security Verification Suite
# Non-destructive verification for:
#   1. Express Server Health, Version Parity & Security Headers
#   2. Local Dataset & GitHub Feed Integrity
#   3. Webhook Auth & HTML-Redirect Gate Guard (/api/github/sync)
#   4. Admin Endpoint Auth Guards & Masked Token Protection
#   5. Server PAT Proxy Telemetry & Input Validation
#   6. Auto-Integrate Resilience (non-destructive)
#   7. Optional Remote 3-Way Endpoints (--check-remote / --strict-remote)
#   8. Optional TypeScript Lint & VitePWA Pages Build (--with-build)

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PAGES_URL="${PAGES_URL:-https://ahbiyout-all.github.io/windows-fix-wizard}"
SHARED_URL="${SHARED_APP_URL:-}"
CRON_SECRET_VAL="${VERIFY_CRON_SECRET:-${CRON_SECRET:-}}"
CHECK_REMOTE=0
STRICT_REMOTE=0
WITH_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-$BASE_URL}"
      shift 2
      ;;
    --pages-url)
      PAGES_URL="${2:-$PAGES_URL}"
      shift 2
      ;;
    --shared-url)
      SHARED_URL="${2:-}"
      shift 2
      ;;
    --cron-secret)
      CRON_SECRET_VAL="${2:-}"
      shift 2
      ;;
    --check-remote)
      CHECK_REMOTE=1
      shift
      ;;
    --strict-remote)
      CHECK_REMOTE=1
      STRICT_REMOTE=1
      shift
      ;;
    --with-build)
      WITH_BUILD=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: bash scripts/verify-sync-pipeline.sh [options]

Options:
  --base-url <url>     Local/target server base URL (default: http://127.0.0.1:3000)
  --pages-url <url>    GitHub Pages base URL (default: https://ahbiyout-all.github.io/windows-fix-wizard)
  --shared-url <url>   Optional AI Studio Shared App URL (ais-pre-*) to probe
  --cron-secret <val>  Optional CRON_SECRET to test authenticated empty-payload validation
  --check-remote       Probe GitHub Pages static JSONs (and --shared-url if set)
  --strict-remote      Fail suite if remote GitHub Pages/Shared URL probes are not HTTP 200
  --with-build         Also run `npm run lint` and `npm run build:pages` asset checks
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

BASE_URL="${BASE_URL%/}"
PAGES_URL="${PAGES_URL%/}"
SHARED_URL="${SHARED_URL%/}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf "  [PASS] %s\n" "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf "  [FAIL] %s\n" "$1" >&2
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf "  [WARN] %s\n" "$1"
}

http_req() {
  local method="$1"
  local url="$2"
  local out_body="$3"
  local out_headers="$4"
  shift 4
  curl -sS -m 15 -X "$method" -D "$out_headers" -o "$out_body" -w "%{http_code}" "$@" "$url" || echo "000"
}

assert_json_expr() {
  local body_file="$1"
  local expr="$2"
  node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(process.argv[1], "utf8");
    if (/^\s*<(?:!doctype|html)/i.test(raw)) {
      console.error("HTML response received instead of JSON");
      process.exit(1);
    }
    const data = JSON.parse(raw);
    const fn = new Function("d", "return Boolean(" + process.argv[2] + ");");
    if (!fn(data)) {
      console.error("Assertion failed:", process.argv[2], "Payload:", raw.slice(0, 240));
      process.exit(1);
    }
  ' "$body_file" "$expr"
}

PKG_VERSION="$(node -e 'console.log(require("./package.json").version)')"
LOCAL_ISSUES_COUNT="$(node -e 'const d=require("./data/issues.json"); console.log(Array.isArray(d)?d.length:0)')"

echo "========================================================================"
echo " Windows Fix Wizard - Automated 3-Way Sync & Security Verification"
echo " Target Server : ${BASE_URL}"
echo " App Version   : v${PKG_VERSION}"
echo " Local Dataset : ${LOCAL_ISSUES_COUNT} issues"
echo "========================================================================"

echo ""
echo "[1/8] Server Health, Version & Security Headers"
H_BODY="$TMP_DIR/health.body"
H_HDR="$TMP_DIR/health.hdr"
H_CODE="$(http_req GET "${BASE_URL}/api/health" "$H_BODY" "$H_HDR")"
if [[ "$H_CODE" == "200" ]] && assert_json_expr "$H_BODY" 'd.status === "ok"'; then
  pass "GET /api/health returned HTTP 200 with status=ok"
else
  fail "GET /api/health failed (HTTP ${H_CODE})"
fi

if grep -qi "^x-content-type-options: *nosniff" "$H_HDR" \
  && grep -qi "^x-xss-protection: *1; *mode=block" "$H_HDR" \
  && grep -qi "^referrer-policy: *strict-origin-when-cross-origin" "$H_HDR" \
  && ! grep -qi "^x-powered-by:" "$H_HDR"; then
  pass "Security headers valid (nosniff, XSS-Protection, Referrer-Policy, X-Powered-By disabled)"
else
  fail "Missing expected security headers or X-Powered-By exposed on /api/health"
fi

echo ""
echo "[2/8] Version Parity (/api/github/check-update)"
U_BODY="$TMP_DIR/update.body"
U_HDR="$TMP_DIR/update.hdr"
U_CODE="$(http_req GET "${BASE_URL}/api/github/check-update" "$U_BODY" "$U_HDR")"
if [[ "$U_CODE" == "200" ]] && assert_json_expr "$U_BODY" "d.success === true && d.currentVersion === '${PKG_VERSION}'"; then
  pass "GET /api/github/check-update matches package.json version (${PKG_VERSION})"
else
  fail "GET /api/github/check-update version mismatch or error (HTTP ${U_CODE})"
fi

echo ""
echo "[3/8] Public Issues & Category Counts Integrity"
I_BODY="$TMP_DIR/issues.body"
I_HDR="$TMP_DIR/issues.hdr"
I_CODE="$(http_req GET "${BASE_URL}/api/issues" "$I_BODY" "$I_HDR")"
C_BODY="$TMP_DIR/counts.body"
C_HDR="$TMP_DIR/counts.hdr"
C_CODE="$(http_req GET "${BASE_URL}/api/issues/counts" "$C_BODY" "$C_HDR")"
if [[ "$I_CODE" == "200" ]] && assert_json_expr "$I_BODY" "d.success === true && Array.isArray(d.issues) && d.issues.length >= ${LOCAL_ISSUES_COUNT}"; then
  pass "GET /api/issues returned ${LOCAL_ISSUES_COUNT}+ issues with scripts"
else
  fail "GET /api/issues integrity check failed (HTTP ${I_CODE})"
fi

if [[ "$C_CODE" == "200" ]] && assert_json_expr "$C_BODY" "d.success === true && d.counts && d.counts['전체'] >= ${LOCAL_ISSUES_COUNT}"; then
  pass "GET /api/issues/counts total matches dataset (${LOCAL_ISSUES_COUNT}+)"
else
  fail "GET /api/issues/counts check failed (HTTP ${C_CODE})"
fi

echo ""
echo "[4/8] GitHub Feed Integrity (/api/github/feed)"
F_BODY="$TMP_DIR/feed.body"
F_HDR="$TMP_DIR/feed.hdr"
F_CODE="$(http_req GET "${BASE_URL}/api/github/feed" "$F_BODY" "$F_HDR")"
if [[ "$F_CODE" == "200" ]] && assert_json_expr "$F_BODY" 'd.success === true && typeof d.totalIssuesCount === "number" && d.totalIssuesCount >= 157 && d.feed && !Number.isNaN(Date.parse(d.feed.lastCollectedAt)) && Array.isArray(d.feed.newIssues)'; then
  pass "GET /api/github/feed returned valid feed metadata and totalIssuesCount >= 157"
else
  fail "GET /api/github/feed failed schema/count assertion (HTTP ${F_CODE})"
fi

echo ""
echo "[5/8] Webhook Auth & HTML-Redirect Gate Guard (/api/github/sync)"
S1_BODY="$TMP_DIR/sync1.body"
S1_HDR="$TMP_DIR/sync1.hdr"
S1_CODE="$(http_req POST "${BASE_URL}/api/github/sync" "$S1_BODY" "$S1_HDR" -H "Content-Type: application/json" -d '{"issues":[]}')"
if [[ "$S1_CODE" == "401" ]] && assert_json_expr "$S1_BODY" 'd.success === false'; then
  pass "Unauthenticated POST /api/github/sync rejected with HTTP 401 JSON"
else
  fail "Unauthenticated POST /api/github/sync expected 401 JSON, got HTTP ${S1_CODE}"
fi

S2_BODY="$TMP_DIR/sync2.body"
S2_HDR="$TMP_DIR/sync2.hdr"
S2_CODE="$(http_req POST "${BASE_URL}/api/github/sync" "$S2_BODY" "$S2_HDR" -H "Content-Type: application/json" -H "x-cron-secret: invalid-verify-secret-000" -d '{"issues":[]}')"
if [[ "$S2_CODE" == "401" ]] && assert_json_expr "$S2_BODY" 'd.success === false'; then
  pass "Invalid x-cron-secret POST /api/github/sync rejected with HTTP 401 JSON"
else
  fail "Invalid x-cron-secret POST /api/github/sync expected 401 JSON, got HTTP ${S2_CODE}"
fi

if [[ -n "$CRON_SECRET_VAL" ]]; then
  S3_BODY="$TMP_DIR/sync3.body"
  S3_HDR="$TMP_DIR/sync3.hdr"
  S3_CODE="$(http_req POST "${BASE_URL}/api/github/sync" "$S3_BODY" "$S3_HDR" -H "Content-Type: application/json" -H "x-cron-secret: ${CRON_SECRET_VAL}" -d '{"issues":[]}')"
  if [[ "$S3_CODE" == "400" ]] && assert_json_expr "$S3_BODY" 'd.success === false && /No valid issues array/i.test(d.error || "")'; then
    pass "Valid x-cron-secret authenticated and non-destructively validated empty payload (HTTP 400)"
  else
    fail "Valid x-cron-secret non-destructive check expected HTTP 400, got HTTP ${S3_CODE}"
  fi
fi

echo ""
echo "[6/8] Admin Mutation Endpoints Auth Guard & Masked Token Isolation"
for route in \
  "POST:/api/github/deploy-pages" \
  "POST:/api/github/dispatch-workflow" \
  "POST:/api/github/push-collector-options" \
  "POST:/api/github/push-to-repo" \
  "POST:/api/github/pull-from-repo" \
  "GET:/api/github/config" \
  "POST:/api/github/config"
do
  method="${route%%:*}"
  path="${route#*:}"
  G_BODY="$TMP_DIR/guard_$(echo "$path" | tr '/:' '_').body"
  G_HDR="$TMP_DIR/guard_$(echo "$path" | tr '/:' '_').hdr"
  if [[ "$method" == "POST" ]]; then
    G_CODE="$(http_req POST "${BASE_URL}${path}" "$G_BODY" "$G_HDR" -H "Content-Type: application/json" -d '{"token":"••••"}')"
  else
    G_CODE="$(http_req GET "${BASE_URL}${path}" "$G_BODY" "$G_HDR")"
  fi
  if [[ "$G_CODE" == "401" ]] && assert_json_expr "$G_BODY" 'd.success === false'; then
    pass "${method} ${path} unauthenticated guard -> HTTP 401"
  else
    fail "${method} ${path} expected HTTP 401, got HTTP ${G_CODE}"
  fi
done

echo ""
echo "[7/8] Server PAT Proxy Telemetry & Input Validation"
for wf in "windows-fix-collector.yml" "deploy-pages.yml"; do
  W_BODY="$TMP_DIR/wf_${wf}.body"
  W_HDR="$TMP_DIR/wf_${wf}.hdr"
  W_CODE="$(http_req GET "${BASE_URL}/api/github/workflow-status?workflowFile=${wf}" "$W_BODY" "$W_HDR")"
  if [[ "$W_CODE" == "200" ]] && assert_json_expr "$W_BODY" 'd.success === true && (Boolean(d.run && d.run.id) || d.rateLimited === true || d.notFound === true)'; then
    if assert_json_expr "$W_BODY" 'Boolean(d.run && d.run.id)' 2>/dev/null; then
      pass "GET /api/github/workflow-status (${wf}) returned live run"
    else
      warn "GET /api/github/workflow-status (${wf}) hit GitHub rate-limit/notFound cleanly without synthetic fallback"
    fi
  else
    fail "GET /api/github/workflow-status (${wf}) failed (HTTP ${W_CODE})"
  fi
done

R_BODY="$TMP_DIR/wfruns.body"
R_HDR="$TMP_DIR/wfruns.hdr"
R_CODE="$(http_req GET "${BASE_URL}/api/github/workflow-runs?perPage=5" "$R_BODY" "$R_HDR")"
if [[ "$R_CODE" == "200" ]] && assert_json_expr "$R_BODY" 'd.success === true && Array.isArray(d.runs)'; then
  pass "GET /api/github/workflow-runs returned valid array structure"
else
  fail "GET /api/github/workflow-runs failed (HTTP ${R_CODE})"
fi

BAD_BODY="$TMP_DIR/wfbad.body"
BAD_HDR="$TMP_DIR/wfbad.hdr"
BAD_CODE="$(http_req GET "${BASE_URL}/api/github/workflow-status?workflowFile=../etc/passwd" "$BAD_BODY" "$BAD_HDR")"
if [[ "$BAD_CODE" == "400" ]] && assert_json_expr "$BAD_BODY" 'd.success === false'; then
  pass "GET /api/github/workflow-status rejects path traversal input with HTTP 400"
else
  fail "GET /api/github/workflow-status path traversal check expected 400, got HTTP ${BAD_CODE}"
fi

echo ""
echo "[8/8] Auto-Integrate Endpoint & Local Dataset Preservation"
A_BODY="$TMP_DIR/autoint.body"
A_HDR="$TMP_DIR/autoint.hdr"
A_CODE="$(http_req POST "${BASE_URL}/api/github/auto-integrate" "$A_BODY" "$A_HDR" -H "Content-Type: application/json" -d '{}')"
if [[ "$A_CODE" == "200" || "$A_CODE" == "429" ]] && assert_json_expr "$A_BODY" 'typeof d === "object" && d !== null'; then
  AFTER_COUNT="$(node -e 'const d=require("./data/issues.json"); console.log(Array.isArray(d)?d.length:0)')"
  if [[ "$AFTER_COUNT" -ge "$LOCAL_ISSUES_COUNT" ]]; then
    pass "POST /api/github/auto-integrate returned HTTP ${A_CODE} and preserved ${AFTER_COUNT} issues"
  else
    fail "Dataset count shrank after auto-integrate (${LOCAL_ISSUES_COUNT} -> ${AFTER_COUNT})"
  fi
else
  fail "POST /api/github/auto-integrate unexpected response (HTTP ${A_CODE})"
fi

if [[ "$CHECK_REMOTE" == "1" ]]; then
  echo ""
  echo "[Remote Probe] GitHub Pages Runtime JSONs (${PAGES_URL})"
  for asset in \
    "data/issues.json" \
    "data/github-feed.json" \
    "data/ai-model-registry.json" \
    "data/github-collector-options.json"
  do
    P_BODY="$TMP_DIR/pages_$(basename "$asset").body"
    P_HDR="$TMP_DIR/pages_$(basename "$asset").hdr"
    P_CODE="$(http_req GET "${PAGES_URL}/${asset}" "$P_BODY" "$P_HDR")"
    if [[ "$P_CODE" == "200" ]] && assert_json_expr "$P_BODY" 'd !== null' 2>/dev/null; then
      pass "Pages ${asset} -> HTTP 200 valid JSON"
    else
      if [[ "$STRICT_REMOTE" == "1" ]]; then
        fail "Pages ${asset} -> HTTP ${P_CODE} (strict-remote)"
      else
        warn "Pages ${asset} -> HTTP ${P_CODE} (push main & run deploy-pages.yml to sync)"
      fi
    fi
  done

  if [[ -n "$SHARED_URL" ]]; then
    echo ""
    echo "[Remote Probe] Shared App URL (${SHARED_URL})"
    SH_BODY="$TMP_DIR/shared_health.body"
    SH_HDR="$TMP_DIR/shared_health.hdr"
    SH_CODE="$(http_req GET "${SHARED_URL}/api/health" "$SH_BODY" "$SH_HDR")"
    if [[ "$SH_CODE" == "200" ]] && assert_json_expr "$SH_BODY" 'd.status === "ok"' 2>/dev/null; then
      pass "Shared App URL /api/health -> HTTP 200 ok"
    else
      if [[ "$STRICT_REMOTE" == "1" ]]; then
        fail "Shared App URL /api/health -> HTTP ${SH_CODE} (Publish/Share app to activate)"
      else
        warn "Shared App URL /api/health -> HTTP ${SH_CODE} (Publish/Share app to activate ais-pre-*)"
      fi
    fi
  fi
fi

if [[ "$WITH_BUILD" == "1" ]]; then
  echo ""
  echo "[Build & Lint] TypeScript Check & GitHub Pages PWA Bundle"
  if npm run lint >/dev/null 2>&1; then
    pass "npm run lint (tsc --noEmit) passed with 0 errors"
  else
    fail "npm run lint failed"
  fi

  if npm run build:pages >/dev/null 2>&1; then
    if [[ -f "dist/sw.js" && -f "dist/manifest.webmanifest" ]] && grep -q "NetworkOnly" dist/sw.js; then
      pass "npm run build:pages generated dist/sw.js (with NetworkOnly) and dist/manifest.webmanifest"
    else
      fail "npm run build:pages missing dist/sw.js, NetworkOnly rule, or dist/manifest.webmanifest"
    fi
  else
    fail "npm run build:pages failed"
  fi
fi

echo ""
echo "========================================================================"
printf " Summary: PASS=%d | WARN=%d | FAIL=%d\n" "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"
echo "========================================================================"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
exit 0
