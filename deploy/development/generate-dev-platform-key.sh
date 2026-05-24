#!/usr/bin/env bash
# Generate a per-developer Ed25519 platform keypair for local dev testing.
#
# Produces:
#   web/source/backend/keys/platform/beheld-platform-2026-q2-dev.pub
#   web/source/backend/keys/platform/beheld-platform-2026-q2-dev.info.json
#   .env updated with BEHELD_PLATFORM_KEY_ID + BEHELD_PLATFORM_PRIVATE_KEY
#
# The .pub + .info.json are gitignored (see web/.gitignore). The .priv
# stays only in .env (also gitignored). The committed prod key is never
# touched. This keeps dev attestations cryptographically separable from
# production — a CLI binary released to users (which has only the
# embedded prod pub) cannot verify dev-signed attestations, which is
# exactly the property we want.
#
# Idempotent: re-running rotates the dev key.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

KEY_ID="beheld-platform-2026-q2-dev"
KEYS_DIR="$WEB_ROOT/source/backend/keys/platform"
PUB_PATH="$KEYS_DIR/$KEY_ID.pub"
INFO_PATH="$KEYS_DIR/$KEY_ID.info.json"
ENV_FILE="$SCRIPT_DIR/.env"

GREEN=$'\033[32m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'

mkdir -p "$KEYS_DIR"

tmp_pem=$(mktemp -t beheld-dev-platform.XXXXXX)
trap 'shred -uz "$tmp_pem" 2>/dev/null || rm -f "$tmp_pem"' EXIT

openssl genpkey -algorithm ED25519 -out "$tmp_pem" 2>/dev/null

PRIV_B64=$(openssl pkey -in "$tmp_pem" -outform DER | tail -c 32 | base64 -w 0 2>/dev/null || \
           openssl pkey -in "$tmp_pem" -outform DER | tail -c 32 | base64)
PRIV_B64=$(echo -n "$PRIV_B64" | tr -d '\n')

PUB_B64=$(openssl pkey -in "$tmp_pem" -pubout -outform DER | tail -c 32 | base64 -w 0 2>/dev/null || \
          openssl pkey -in "$tmp_pem" -pubout -outform DER | tail -c 32 | base64)
PUB_B64=$(echo -n "$PUB_B64" | tr -d '\n')

FP=$(openssl pkey -in "$tmp_pem" -pubout -outform DER | tail -c 32 | sha256sum | cut -d' ' -f1)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "$PUB_B64" > "$PUB_PATH"

cat > "$INFO_PATH" <<EOF
{
  "key_id": "$KEY_ID",
  "algorithm": "ed25519",
  "fingerprint_sha256": "$FP",
  "created_at": "$NOW",
  "active": true,
  "revoked": false,
  "rotated_at": null
}
EOF

# Update .env (create from example if missing)
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$SCRIPT_DIR/.env.example" ]]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
  else
    touch "$ENV_FILE"
  fi
fi

# Replace or append the two vars
python3 - "$ENV_FILE" "$KEY_ID" "$PRIV_B64" <<'PY'
import sys, re
path, key_id, priv = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    content = f.read()
def upsert(content, key, value):
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    if pattern.search(content):
        return pattern.sub(f"{key}={value}", content)
    if content and not content.endswith("\n"):
        content += "\n"
    return content + f"{key}={value}\n"
content = upsert(content, "BEHELD_PLATFORM_KEY_ID", key_id)
content = upsert(content, "BEHELD_PLATFORM_PRIVATE_KEY", priv)
with open(path, "w") as f:
    f.write(content)
PY

printf "\n  %s✓%s  Dev platform key gerada\n" "$GREEN" "$RESET"
printf "      %s%s%s\n" "$DIM" "key_id:      $KEY_ID" "$RESET"
printf "      %s%s%s\n" "$DIM" "fingerprint: $FP" "$RESET"
printf "      %s%s%s\n" "$DIM" "pub:         $PUB_PATH (gitignored)" "$RESET"
printf "      %s%s%s\n" "$DIM" "priv:        $ENV_FILE (gitignored)" "$RESET"
printf "\n  ${BOLD}Reinicie o backend para o Rails recarregar o keys/platform/:${RESET}\n"
printf "      ${DIM}docker compose -f $SCRIPT_DIR/docker-compose.yml restart backend${RESET}\n"
printf "\n  ${BOLD}Verificar:${RESET}\n"
printf "      ${DIM}curl -s http://localhost:3000/api/platform-keys | jq '.keys[].key_id'${RESET}\n"
printf "      ${DIM}# deve listar tanto -q2 (prod) quanto -q2-dev${RESET}\n\n"
