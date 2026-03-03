#!/usr/bin/env bash
# ============================================================
# 개발/스테이징용 자체서명 TLS 인증서 생성 스크립트
# 프로덕션에서는 Let's Encrypt (Certbot) 를 사용할 것
# ============================================================
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../nginx/certs"
mkdir -p "$CERT_DIR"

DOMAIN="${1:-localhost}"
DAYS=365

echo "자체서명 인증서 생성: ${DOMAIN} (유효 ${DAYS}일)"

openssl req -x509 -nodes \
  -newkey rsa:4096 \
  -keyout  "$CERT_DIR/server.key" \
  -out     "$CERT_DIR/server.crt" \
  -days    "$DAYS" \
  -subj    "/C=KR/ST=Seoul/O=PCA/CN=${DOMAIN}" \
  -addext  "subjectAltName=DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

echo "✓ 생성 완료:"
echo "  인증서: $CERT_DIR/server.crt"
echo "  키:     $CERT_DIR/server.key"
echo ""
echo "브라우저 신뢰 등록 (macOS):"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_DIR/server.crt"
echo ""
echo "브라우저 신뢰 등록 (Ubuntu):"
echo "  sudo cp $CERT_DIR/server.crt /usr/local/share/ca-certificates/pca.crt && sudo update-ca-certificates"
