#!/bin/bash
# SSL/TLS Configuration Verification Script
# Usage: ./verify-ssl.sh <domain>

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <base_domain>"
    echo ""
    echo "Example:"
    echo "  $0 example.com"
    echo ""
    echo "This will verify SSL for all subdomains:"
    echo "  - copilot.example.com"
    echo "  - api.example.com"
    echo "  - onecloud.example.com"
    echo "  - spend.example.com"
    echo "  - security.example.com"
    echo "  - asset.example.com"
    echo "  - incident.example.com"
    echo "  - advisor.example.com"
    exit 1
fi

BASE_DOMAIN="$1"

echo "🔍 SSL/TLS Verification for ${BASE_DOMAIN}"
echo "=========================================="
echo ""

# Define all subdomains
SUBDOMAINS=(
    "copilot"
    "api"
    "onecloud"
    "spend"
    "security"
    "asset"
    "incident"
    "advisor"
)

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check SSL certificate
check_ssl() {
    local subdomain=$1
    local full_domain="${subdomain}.${BASE_DOMAIN}"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Checking: ${full_domain}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check DNS resolution
    echo -n "1. DNS Resolution: "
    if dig +short "${full_domain}" | grep -q '^[0-9]'; then
        echo -e "${GREEN}✓ OK${NC}"
        IP=$(dig +short "${full_domain}" | head -1)
        echo "   IP: ${IP}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "   DNS does not resolve"
        ((FAILED++))
        return 1
    fi

    # Check HTTP redirect
    echo -n "2. HTTP → HTTPS Redirect: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://${full_domain}" 2>/dev/null || echo "000")
    if [ "${HTTP_CODE}" = "301" ] || [ "${HTTP_CODE}" = "302" ] || [ "${HTTP_CODE}" = "308" ]; then
        echo -e "${GREEN}✓ OK${NC} (${HTTP_CODE})"
    else
        echo -e "${YELLOW}⚠ WARNING${NC} (Got ${HTTP_CODE})"
        ((WARNINGS++))
    fi

    # Check HTTPS connectivity
    echo -n "3. HTTPS Connectivity: "
    if curl -s -o /dev/null -w "%{http_code}" "https://${full_domain}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi

    # Check certificate validity
    echo "4. Certificate Details:"
    if command -v openssl &> /dev/null; then
        CERT_INFO=$(echo | openssl s_client -servername "${full_domain}" -connect "${full_domain}:443" 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null)

        if [ $? -eq 0 ]; then
            # Extract dates
            NOT_BEFORE=$(echo "${CERT_INFO}" | grep "notBefore" | cut -d= -f2-)
            NOT_AFTER=$(echo "${CERT_INFO}" | grep "notAfter" | cut -d= -f2-)
            SUBJECT=$(echo "${CERT_INFO}" | grep "subject" | cut -d= -f2-)
            ISSUER=$(echo "${CERT_INFO}" | grep "issuer" | cut -d= -f2-)

            echo "   Valid from: ${NOT_BEFORE}"
            echo "   Valid until: ${NOT_AFTER}"
            echo "   Subject: ${SUBJECT}"
            echo "   Issuer: ${ISSUER}"

            # Check expiry
            EXPIRY_DATE=$(date -d "${NOT_AFTER}" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "${NOT_AFTER}" +%s 2>/dev/null)
            CURRENT_DATE=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))

            if [ ${DAYS_UNTIL_EXPIRY} -lt 0 ]; then
                echo -e "   Status: ${RED}✗ EXPIRED${NC}"
                ((FAILED++))
            elif [ ${DAYS_UNTIL_EXPIRY} -lt 30 ]; then
                echo -e "   Status: ${YELLOW}⚠ EXPIRES SOON${NC} (${DAYS_UNTIL_EXPIRY} days)"
                ((WARNINGS++))
            else
                echo -e "   Status: ${GREEN}✓ VALID${NC} (${DAYS_UNTIL_EXPIRY} days remaining)"
                ((PASSED++))
            fi
        else
            echo -e "   ${RED}✗ Could not retrieve certificate${NC}"
            ((FAILED++))
        fi
    else
        echo "   ⚠ openssl not available, skipping detailed check"
    fi

    # Check security headers
    echo "5. Security Headers:"
    HEADERS=$(curl -s -I "https://${full_domain}" 2>/dev/null)

    check_header() {
        local header=$1
        if echo "${HEADERS}" | grep -qi "${header}"; then
            echo -e "   ${GREEN}✓${NC} ${header}"
        else
            echo -e "   ${YELLOW}⚠${NC} ${header} missing"
        fi
    }

    check_header "Strict-Transport-Security"
    check_header "X-Content-Type-Options"
    check_header "X-Frame-Options"

    # Check TLS version
    echo -n "6. TLS Version: "
    TLS_VERSION=$(echo | openssl s_client -servername "${full_domain}" -connect "${full_domain}:443" 2>/dev/null | grep "Protocol" | awk '{print $3}')
    if [[ "${TLS_VERSION}" =~ TLSv1\.[23] ]]; then
        echo -e "${GREEN}✓ ${TLS_VERSION}${NC}"
    else
        echo -e "${YELLOW}⚠ ${TLS_VERSION}${NC} (TLS 1.2+ recommended)"
    fi

    echo ""
}

# Check certbot status
echo "📋 Certbot Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v certbot &> /dev/null; then
    certbot certificates 2>/dev/null || echo "No certificates found or certbot not configured"
else
    echo "Certbot not installed"
fi
echo ""

# Check all subdomains
for subdomain in "${SUBDOMAINS[@]}"; do
    check_ssl "${subdomain}"
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed:${NC} ${PASSED}"
echo -e "${YELLOW}Warnings:${NC} ${WARNINGS}"
echo -e "${RED}Failed:${NC} ${FAILED}"
echo ""

if [ ${FAILED} -eq 0 ] && [ ${WARNINGS} -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
elif [ ${FAILED} -eq 0 ]; then
    echo -e "${YELLOW}⚠ All checks passed with warnings${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    exit 1
fi
