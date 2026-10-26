#!/bin/sh
set -eu
LC_ALL=C
export LC_ALL
cd "$(dirname "$0")/.."

HTML=index.html
ALLOW=tools/allowed-links.txt

# 現在承認済みの訪問者カウンター用スクリプトのSHA-256
SCRIPT_SHA=33be5e6867c2fae18d1e9471f02925cf9ac90a57f07ef107714cf5df284faa34
ENDPOINT=https://kendo-support-counter.shusosai.workers.dev

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[ -f "$HTML" ] || fail "index.html not found"
[ -f "$ALLOW" ] || fail "allowed-links.txt not found"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

# 1. hrefの追加・削除・変更・重複を確認
grep -Eio 'href[[:space:]]*=[[:space:]]*"[^"]*"' "$HTML" |
  sed 's/^[^"]*"//;s/"$//' | sort > "$TMP/links-actual"

sort "$ALLOW" > "$TMP/links-allowed"

if ! diff -u "$TMP/links-allowed" "$TMP/links-actual"; then
  fail "href links added, deleted, or changed"
fi

# 2. 危険な記述や未承認の埋め込みを検出
if grep -Eiq 'href[[:space:]]*=[[:space:]]*[^"[:space:]]|http://|javascript:|data:text/html|<([[:space:]]*)(iframe|object|embed|form|base|link|img)([[:space:]>])|[[:space:]]on[a-z]+[[:space:]]*=|@import|document[.]write[[:space:]]*[(]|eval[[:space:]]*[(]' "$HTML"; then
  fail "potentially unsafe HTML / CSS / JavaScript found"
fi

# 3. script要素が1つだけであることを確認
OPEN=$(grep -Eio '<[[:space:]]*script([[:space:]>])' "$HTML" | wc -l | tr -d ' ')
CLOSE=$(grep -Eio '</[[:space:]]*script[[:space:]]*>' "$HTML" | wc -l | tr -d ' ')

[ "$OPEN" = 1 ] && [ "$CLOSE" = 1 ] ||
  fail "expected exactly one inline script"

# 4. JavaScriptの内容をSHA-256で照合
sed -n '/^[[:space:]]*<script>$/,/^[[:space:]]*<\/script>$/p' "$HTML" > "$TMP/script"

[ -s "$TMP/script" ] || fail "inline script not found"

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA=$(sha256sum "$TMP/script" | cut -d ' ' -f 1)
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA=$(shasum -a 256 "$TMP/script" | cut -d ' ' -f 1)
else
  fail "SHA-256 command missing"
fi

[ "$ACTUAL_SHA" = "$SCRIPT_SHA" ] ||
  fail "inline script has changed"

# 5. 訪問者カウンターの通信先を確認（CSPの許可先表記は別途check-csp.mjsで検査）
[ "$(grep -Fo "$ENDPOINT" "$TMP/script" | wc -l | tr -d ' ')" = 1 ] ||
  fail "counter endpoint changed or duplicated"

# 6. CSSの背景画像を確認
CSS_URLS=$(grep -Eo 'url[(][^)]*[)]' "$HTML" | wc -l | tr -d ' ')

[ "$CSS_URLS" = 2 ] || fail "CSS image URLs changed"

grep -Fq 'url("画像.png")' "$HTML" ||
  fail "desktop background changed"

grep -Fq 'url("iphone-support-background.jpg")' "$HTML" ||
  fail "mobile background changed"

# 7. 予期しないファイルが混入していないか確認
find . -path './.git' -prune -o -type f -print |
while IFS= read -r path; do
  case "$path" in
    ./.DS_Store|*/.DS_Store|./.gitignore|./index.html|./iphone-support-background.jpg|./画像.png|./counter/README.md|./counter/worker.js|./tools/check-site.sh|./tools/check-csp.mjs|./tools/allowed-links.txt|./.github/workflows/security-check.yml|./.github/workflows/published-integrity.yml)
      ;;
    *)
      printf 'ERROR: unexpected file: %s\n' "$path" >&2
      exit 1
      ;;
  esac
done

printf 'OK: security checks passed\n'
