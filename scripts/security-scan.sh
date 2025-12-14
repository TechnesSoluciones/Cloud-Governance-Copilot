#!/bin/bash
# ============================================================
# Cloud Governance Copilot - Security Scanning Script
# ============================================================
# Runs comprehensive security scans on codebase and containers
# Usage: ./scripts/security-scan.sh [--full] [--fix]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/security-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

FULL_SCAN=false
AUTO_FIX=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# Functions
# ============================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
}

# ============================================================
# Create Report Directory
# ============================================================
create_report_dir() {
    mkdir -p "${REPORT_DIR}"
}

# ============================================================
# NPM Audit - Check for Vulnerable Dependencies
# ============================================================
run_npm_audit() {
    log_info "Running npm audit..."

    local report_file="${REPORT_DIR}/npm-audit-${TIMESTAMP}.json"

    # Run audit for all packages
    (cd "${PROJECT_ROOT}" && npm audit --json > "${report_file}" 2>/dev/null) || true
    (cd "${PROJECT_ROOT}/apps/api-gateway" && npm audit --json >> "${report_file}" 2>/dev/null) || true
    (cd "${PROJECT_ROOT}/apps/frontend" && npm audit --json >> "${report_file}" 2>/dev/null) || true

    # Count vulnerabilities
    local critical=$(cat "${report_file}" | jq -r '.metadata.vulnerabilities.critical // 0' | head -1)
    local high=$(cat "${report_file}" | jq -r '.metadata.vulnerabilities.high // 0' | head -1)
    local moderate=$(cat "${report_file}" | jq -r '.metadata.vulnerabilities.moderate // 0' | head -1)
    local low=$(cat "${report_file}" | jq -r '.metadata.vulnerabilities.low // 0' | head -1)

    log_info "Vulnerabilities found:"
    log_error "  Critical: ${critical}"
    log_warning "  High: ${high}"
    log_warning "  Moderate: ${moderate}"
    log_info "  Low: ${low}"

    if [[ "${AUTO_FIX}" == true ]]; then
        log_info "Attempting to fix vulnerabilities..."
        npm audit fix
        (cd "${PROJECT_ROOT}/apps/api-gateway" && npm audit fix) || true
        (cd "${PROJECT_ROOT}/apps/frontend" && npm audit fix) || true
    fi

    log_success "NPM audit report saved: ${report_file}"
}

# ============================================================
# Trivy - Container Image Scanning
# ============================================================
run_trivy_scan() {
    log_info "Running Trivy container scan..."

    # Check if Trivy is installed
    if ! command -v trivy &> /dev/null; then
        log_warning "Trivy not installed. Installing..."
        curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    fi

    local images=("api-gateway" "frontend")

    for image in "${images[@]}"; do
        local report_file="${REPORT_DIR}/trivy-${image}-${TIMESTAMP}.json"

        log_info "Scanning ${image}..."

        # Scan Docker image
        trivy image \
            --severity CRITICAL,HIGH,MEDIUM \
            --format json \
            --output "${report_file}" \
            "copilot-${image}:latest" || true

        # Print summary
        local critical=$(cat "${report_file}" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length')
        local high=$(cat "${report_file}" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="HIGH")] | length')

        log_info "${image} vulnerabilities - Critical: ${critical}, High: ${high}"
    done

    log_success "Trivy scan completed"
}

# ============================================================
# Trivy - Filesystem Scanning
# ============================================================
run_trivy_fs_scan() {
    log_info "Running Trivy filesystem scan..."

    if ! command -v trivy &> /dev/null; then
        log_warning "Trivy not installed. Skipping filesystem scan."
        return 0
    fi

    local report_file="${REPORT_DIR}/trivy-fs-${TIMESTAMP}.json"

    trivy fs \
        --severity CRITICAL,HIGH \
        --format json \
        --output "${report_file}" \
        "${PROJECT_ROOT}" || true

    log_success "Trivy filesystem scan completed: ${report_file}"
}

# ============================================================
# Gitleaks - Secret Scanning
# ============================================================
run_gitleaks_scan() {
    log_info "Running Gitleaks secret scan..."

    # Check if Gitleaks is installed
    if ! command -v gitleaks &> /dev/null; then
        log_warning "Gitleaks not installed. Installing..."
        brew install gitleaks || {
            log_warning "Failed to install Gitleaks via brew. Skipping secret scan."
            return 0
        }
    fi

    local report_file="${REPORT_DIR}/gitleaks-${TIMESTAMP}.json"

    # Run Gitleaks
    gitleaks detect \
        --source="${PROJECT_ROOT}" \
        --report-path="${report_file}" \
        --report-format=json \
        --no-git || true

    # Check if secrets were found
    if [[ -f "${report_file}" ]] && [[ $(cat "${report_file}" | jq length) -gt 0 ]]; then
        log_error "Secrets detected! Review: ${report_file}"
    else
        log_success "No secrets detected"
    fi
}

# ============================================================
# ESLint Security Plugin
# ============================================================
run_eslint_security() {
    log_info "Running ESLint security checks..."

    # Check if eslint-plugin-security is installed
    if ! npm list eslint-plugin-security &> /dev/null; then
        log_warning "eslint-plugin-security not installed. Skipping."
        return 0
    fi

    local report_file="${REPORT_DIR}/eslint-security-${TIMESTAMP}.json"

    # Run ESLint with security plugin
    npx eslint \
        --ext .js,.ts,.jsx,.tsx \
        --format json \
        --output-file "${report_file}" \
        "${PROJECT_ROOT}/apps" || true

    log_success "ESLint security check completed: ${report_file}"
}

# ============================================================
# Docker Bench Security
# ============================================================
run_docker_bench() {
    log_info "Running Docker Bench Security..."

    # Check if Docker Bench is available
    if ! docker run --rm docker/docker-bench-security &> /dev/null; then
        log_warning "Docker Bench Security not available. Skipping."
        return 0
    fi

    local report_file="${REPORT_DIR}/docker-bench-${TIMESTAMP}.log"

    # Run Docker Bench Security
    docker run --rm \
        --net host \
        --pid host \
        --userns host \
        --cap-add audit_control \
        -v /etc:/etc:ro \
        -v /usr/bin/containerd:/usr/bin/containerd:ro \
        -v /usr/bin/runc:/usr/bin/runc:ro \
        -v /usr/lib/systemd:/usr/lib/systemd:ro \
        -v /var/lib:/var/lib:ro \
        -v /var/run/docker.sock:/var/run/docker.sock:ro \
        docker/docker-bench-security > "${report_file}" || true

    log_success "Docker Bench Security completed: ${report_file}"
}

# ============================================================
# OWASP Dependency Check
# ============================================================
run_owasp_check() {
    if [[ "${FULL_SCAN}" != true ]]; then
        return 0
    fi

    log_info "Running OWASP Dependency Check (this may take a while)..."

    # Check if dependency-check is installed
    if ! command -v dependency-check &> /dev/null; then
        log_warning "OWASP Dependency Check not installed. Skipping."
        return 0
    fi

    local report_file="${REPORT_DIR}/owasp-${TIMESTAMP}"

    dependency-check \
        --project "Cloud Governance Copilot" \
        --scan "${PROJECT_ROOT}" \
        --format JSON \
        --out "${report_file}" || true

    log_success "OWASP Dependency Check completed: ${report_file}"
}

# ============================================================
# Check Environment Variables
# ============================================================
check_env_security() {
    log_info "Checking environment variable security..."

    local env_files=(".env" ".env.production" ".env.example" ".env.production.example")
    local issues=0

    for env_file in "${env_files[@]}"; do
        local file_path="${PROJECT_ROOT}/${env_file}"

        if [[ ! -f "${file_path}" ]]; then
            continue
        fi

        # Check for CHANGE_ME values
        if grep -q "CHANGE_ME" "${file_path}"; then
            log_error "${env_file} contains CHANGE_ME placeholders"
            ((issues++))
        fi

        # Check for weak passwords
        if grep -E "(password|secret|key).*=.{0,8}$" "${file_path}" &> /dev/null; then
            log_warning "${env_file} may contain weak passwords (less than 8 chars)"
            ((issues++))
        fi
    done

    if [[ ${issues} -eq 0 ]]; then
        log_success "Environment variables look secure"
    else
        log_warning "Found ${issues} potential environment variable issues"
    fi
}

# ============================================================
# Check File Permissions
# ============================================================
check_file_permissions() {
    log_info "Checking file permissions..."

    # Check for world-readable sensitive files
    local sensitive_files=(
        ".env"
        ".env.production"
        "*.key"
        "*.pem"
        "*secret*"
    )

    local issues=0

    for pattern in "${sensitive_files[@]}"; do
        while IFS= read -r file; do
            if [[ -f "${file}" ]]; then
                local perms=$(stat -f "%A" "${file}")
                if [[ "${perms: -1}" != "0" ]]; then
                    log_warning "File ${file} is world-readable (${perms})"
                    ((issues++))

                    if [[ "${AUTO_FIX}" == true ]]; then
                        chmod 600 "${file}"
                        log_info "Fixed permissions for ${file}"
                    fi
                fi
            fi
        done < <(find "${PROJECT_ROOT}" -name "${pattern}" 2>/dev/null)
    done

    if [[ ${issues} -eq 0 ]]; then
        log_success "File permissions look secure"
    else
        log_warning "Found ${issues} files with incorrect permissions"
    fi
}

# ============================================================
# Generate Summary Report
# ============================================================
generate_summary() {
    log_info "Generating security summary..."

    local summary_file="${REPORT_DIR}/security-summary-${TIMESTAMP}.txt"

    cat > "${summary_file}" <<EOF
========================================
Security Scan Summary
========================================
Date: $(date)
Project: Cloud Governance Copilot
Scan Type: $([ "${FULL_SCAN}" == true ] && echo "Full" || echo "Quick")

========================================
Reports Generated:
========================================
EOF

    ls -lh "${REPORT_DIR}"/*-${TIMESTAMP}* >> "${summary_file}"

    log_success "Summary report saved: ${summary_file}"
}

# ============================================================
# Main Function
# ============================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --full)
                FULL_SCAN=true
                shift
                ;;
            --fix)
                AUTO_FIX=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    log_info "========================================"
    log_info "Cloud Governance Copilot - Security Scan"
    log_info "========================================"
    log_info "Started at: $(date)"
    log_info "Scan Type: $([ "${FULL_SCAN}" == true ] && echo "Full" || echo "Quick")"
    log_info "Auto-fix: $([ "${AUTO_FIX}" == true ] && echo "Enabled" || echo "Disabled")"
    log_info "========================================"

    # Create report directory
    create_report_dir

    # Run scans
    run_npm_audit
    run_trivy_fs_scan
    run_gitleaks_scan
    run_eslint_security
    check_env_security
    check_file_permissions

    # Full scan only
    if [[ "${FULL_SCAN}" == true ]]; then
        run_trivy_scan
        run_docker_bench
        run_owasp_check
    fi

    # Generate summary
    generate_summary

    log_success "========================================"
    log_success "Security scan completed!"
    log_success "========================================"
    log_info "Reports saved in: ${REPORT_DIR}"
    log_success "========================================"
}

# ============================================================
# Execute Main Function
# ============================================================
main "$@"
