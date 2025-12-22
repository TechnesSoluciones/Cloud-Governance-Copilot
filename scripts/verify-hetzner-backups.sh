#!/bin/bash
# ============================================================
# Hetzner Storage Box - Backup Verification Script
# ============================================================
# Verifies integrity and health of backups in Storage Box
# ============================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STORAGEBOX_USER="${STORAGEBOX_USER:?Error: STORAGEBOX_USER not set}"
STORAGEBOX_HOST="${STORAGEBOX_HOST:?Error: STORAGEBOX_HOST not set}"
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
STORAGEBOX_SSH_KEY="${STORAGEBOX_SSH_KEY:-$HOME/.ssh/hetzner_storagebox_rsa}"
STORAGEBOX_REMOTE_DIR="${STORAGEBOX_REMOTE_DIR:-/backups/postgresql}"
DB_NAME="${DB_NAME:-copilot_main}"

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_connection() {
    print_header "Testing Connection to Storage Box"

    if ssh -p "${STORAGEBOX_PORT}" \
           -i "${STORAGEBOX_SSH_KEY}" \
           -o ConnectTimeout=10 \
           -o StrictHostKeyChecking=no \
           -o UserKnownHostsFile=/dev/null \
           -q \
           "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
           "echo 'Connection successful'" &>/dev/null; then
        print_success "SSH connection successful"
        return 0
    else
        print_error "Cannot connect to Storage Box"
        print_info "Check your credentials and SSH key"
        return 1
    fi
}

list_recent_backups() {
    print_header "Recent Backups (Last 10)"

    local backups=$(ssh -p "${STORAGEBOX_PORT}" \
                       -i "${STORAGEBOX_SSH_KEY}" \
                       -o StrictHostKeyChecking=no \
                       -o UserKnownHostsFile=/dev/null \
                       "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                       "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -printf '%T@ %p %s\n' 2>/dev/null | sort -rn | head -10")

    if [[ -z "${backups}" ]]; then
        print_warning "No backups found in ${STORAGEBOX_REMOTE_DIR}"
        return 1
    fi

    echo "${backups}" | while IFS= read -r line; do
        local timestamp=$(echo "${line}" | awk '{print $1}')
        local path=$(echo "${line}" | awk '{print $2}')
        local size=$(echo "${line}" | awk '{print $3}')

        # Convert timestamp to readable date
        local date_str=$(date -d "@${timestamp}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "${timestamp}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)

        # Convert size to MB
        local size_mb=$(echo "scale=2; ${size}/1024/1024" | bc)

        # Get filename
        local filename=$(basename "${path}")

        echo -e "${GREEN}${date_str}${NC}  ${filename} (${size_mb} MB)"
    done
}

check_backup_age() {
    print_header "Backup Freshness Check"

    local latest_backup=$(ssh -p "${STORAGEBOX_PORT}" \
                             -i "${STORAGEBOX_SSH_KEY}" \
                             -o StrictHostKeyChecking=no \
                             -o UserKnownHostsFile=/dev/null \
                             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                             "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1")

    if [[ -z "${latest_backup}" ]]; then
        print_error "No backups found"
        return 1
    fi

    local current_time=$(date +%s)
    local age_seconds=$((current_time - ${latest_backup%.*}))
    local age_hours=$((age_seconds / 3600))

    if [[ ${age_hours} -lt 24 ]]; then
        print_success "Latest backup is ${age_hours} hours old (healthy)"
    elif [[ ${age_hours} -lt 48 ]]; then
        print_warning "Latest backup is ${age_hours} hours old (check if backups are running)"
    else
        print_error "Latest backup is ${age_hours} hours old (CRITICAL - backups may have failed)"
    fi
}

verify_backup_integrity() {
    print_header "Verifying Latest Backup Integrity"

    # Get latest backup
    local latest_backup=$(ssh -p "${STORAGEBOX_PORT}" \
                             -i "${STORAGEBOX_SSH_KEY}" \
                             -o StrictHostKeyChecking=no \
                             -o UserKnownHostsFile=/dev/null \
                             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                             "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print \$2}'")

    if [[ -z "${latest_backup}" ]]; then
        print_error "No backup found for verification"
        return 1
    fi

    print_info "Latest backup: ${latest_backup}"

    # Check if checksum file exists
    local checksum_file="${latest_backup}.sha256"
    local has_checksum=$(ssh -p "${STORAGEBOX_PORT}" \
                            -i "${STORAGEBOX_SSH_KEY}" \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                            "test -f ${checksum_file} && echo 'yes' || echo 'no'")

    if [[ "${has_checksum}" == "yes" ]]; then
        print_success "Checksum file exists"

        # Download files for verification
        local temp_dir=$(mktemp -d)
        local backup_filename=$(basename "${latest_backup}")

        print_info "Downloading backup and checksum for verification..."

        sftp -P "${STORAGEBOX_PORT}" \
             -i "${STORAGEBOX_SSH_KEY}" \
             -o StrictHostKeyChecking=no \
             -o UserKnownHostsFile=/dev/null \
             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF &>/dev/null
get ${latest_backup} ${temp_dir}/${backup_filename}
get ${checksum_file} ${temp_dir}/${backup_filename}.sha256
bye
EOF

        # Verify checksum
        cd "${temp_dir}"
        if sha256sum -c "${backup_filename}.sha256" &>/dev/null; then
            print_success "Checksum verification PASSED"
        else
            print_error "Checksum verification FAILED"
            rm -rf "${temp_dir}"
            return 1
        fi

        # Cleanup
        rm -rf "${temp_dir}"
    else
        print_warning "Checksum file not found (backup may be from older script version)"
    fi

    # Verify file is not corrupted (gzip test)
    print_info "Testing gzip integrity..."
    if ssh -p "${STORAGEBOX_PORT}" \
           -i "${STORAGEBOX_SSH_KEY}" \
           -o StrictHostKeyChecking=no \
           -o UserKnownHostsFile=/dev/null \
           "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
           "gzip -t ${latest_backup}" &>/dev/null; then
        print_success "Gzip integrity test PASSED"
    else
        print_error "Gzip integrity test FAILED (file may be corrupted)"
        return 1
    fi
}

calculate_storage_usage() {
    print_header "Storage Usage Analysis"

    # Total number of backups
    local total_backups=$(ssh -p "${STORAGEBOX_PORT}" \
                             -i "${STORAGEBOX_SSH_KEY}" \
                             -o StrictHostKeyChecking=no \
                             -o UserKnownHostsFile=/dev/null \
                             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                             "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f 2>/dev/null | wc -l")

    print_info "Total backups: ${total_backups}"

    # Total storage used
    local storage_info=$(ssh -p "${STORAGEBOX_PORT}" \
                            -i "${STORAGEBOX_SSH_KEY}" \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                            "du -sh ${STORAGEBOX_REMOTE_DIR} 2>/dev/null")

    local storage_used=$(echo "${storage_info}" | awk '{print $1}')
    print_info "Storage used: ${storage_used}"

    # Average backup size
    local total_size=$(ssh -p "${STORAGEBOX_PORT}" \
                          -i "${STORAGEBOX_SSH_KEY}" \
                          -o StrictHostKeyChecking=no \
                          -o UserKnownHostsFile=/dev/null \
                          "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                          "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -printf '%s\n' 2>/dev/null | awk '{sum+=\$1} END {print sum}'")

    if [[ ${total_backups} -gt 0 && -n "${total_size}" ]]; then
        local avg_size=$((total_size / total_backups / 1024 / 1024))
        print_info "Average backup size: ${avg_size} MB"
    fi

    # Storage Box quota (if available)
    local quota_info=$(ssh -p "${STORAGEBOX_PORT}" \
                          -i "${STORAGEBOX_SSH_KEY}" \
                          -o StrictHostKeyChecking=no \
                          -o UserKnownHostsFile=/dev/null \
                          "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                          "quota 2>/dev/null" || echo "")

    if [[ -n "${quota_info}" ]]; then
        echo ""
        print_info "Quota information:"
        echo "${quota_info}"
    fi
}

check_retention_policy() {
    print_header "Retention Policy Check"

    local retention_days="${RETENTION_DAYS:-30}"
    print_info "Configured retention: ${retention_days} days"

    # Count backups older than retention period
    local old_backups=$(ssh -p "${STORAGEBOX_PORT}" \
                           -i "${STORAGEBOX_SSH_KEY}" \
                           -o StrictHostKeyChecking=no \
                           -o UserKnownHostsFile=/dev/null \
                           "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                           "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -mtime +${retention_days} 2>/dev/null | wc -l")

    if [[ ${old_backups} -gt 0 ]]; then
        print_warning "${old_backups} backups older than ${retention_days} days found"
        print_info "Run cleanup script or adjust retention policy"
    else
        print_success "All backups within retention period"
    fi
}

generate_report() {
    print_header "Verification Report Summary"

    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    echo -e "${GREEN}Report Date:${NC} ${timestamp}"
    echo -e "${GREEN}Storage Box:${NC} ${STORAGEBOX_USER}@${STORAGEBOX_HOST}"
    echo -e "${GREEN}Backup Location:${NC} ${STORAGEBOX_REMOTE_DIR}"
    echo ""

    # Overall health status
    local health_status="HEALTHY"
    local health_color="${GREEN}"

    # Check for critical issues
    local latest_backup_age=$(ssh -p "${STORAGEBOX_PORT}" \
                                 -i "${STORAGEBOX_SSH_KEY}" \
                                 -o StrictHostKeyChecking=no \
                                 -o UserKnownHostsFile=/dev/null \
                                 "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                                 "find ${STORAGEBOX_REMOTE_DIR} -name 'backup_*.sql.gz' -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1")

    if [[ -n "${latest_backup_age}" ]]; then
        local current_time=$(date +%s)
        local age_hours=$(( (current_time - ${latest_backup_age%.*}) / 3600 ))

        if [[ ${age_hours} -gt 48 ]]; then
            health_status="CRITICAL"
            health_color="${RED}"
        elif [[ ${age_hours} -gt 24 ]]; then
            health_status="WARNING"
            health_color="${YELLOW}"
        fi
    else
        health_status="CRITICAL - NO BACKUPS"
        health_color="${RED}"
    fi

    echo -e "${GREEN}Overall Health:${NC} ${health_color}${health_status}${NC}"
    echo ""

    print_info "Next recommended actions:"
    echo "  1. Review backup logs: tail -n 100 /var/log/hetzner-backup.log"
    echo "  2. Verify cron job: crontab -l | grep hetzner"
    echo "  3. Test restore process on development environment"
    echo "  4. Monitor storage usage trends"
}

main() {
    print_header "Hetzner Storage Box - Backup Verification"

    # Run all checks
    check_connection || exit 1
    echo ""

    list_recent_backups
    echo ""

    check_backup_age
    echo ""

    verify_backup_integrity
    echo ""

    calculate_storage_usage
    echo ""

    check_retention_policy
    echo ""

    generate_report
}

# Run main function
main
