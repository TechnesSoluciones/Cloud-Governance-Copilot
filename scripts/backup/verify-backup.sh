#!/bin/bash
# ============================================================
# PostgreSQL Backup Verification Script
# ============================================================
# Description: Verify backup integrity and health
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/configs/backup.conf"

# Source configuration
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

source "$CONFIG_FILE"

# ============================================================
# VARIABLES
# ============================================================
VERIFY_LOG="${LOG_DIR}/verify_$(date +%Y%m%d_%H%M%S).log"
TEMP_DIR="${BACKUP_DIR}/tmp"

# ============================================================
# FUNCTIONS
# ============================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$VERIFY_LOG"
}

# Verify all local backups
verify_all_local_backups() {
    log "INFO" "Verifying all local backups..."

    local backups=($(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | sort))

    if [[ ${#backups[@]} -eq 0 ]]; then
        log "WARN" "No backups found in $BACKUP_DIR"
        return 0
    fi

    local total=${#backups[@]}
    local success=0
    local failed=0

    echo ""
    echo "=========================================="
    echo "BACKUP VERIFICATION REPORT"
    echo "=========================================="
    echo "Total backups: $total"
    echo ""

    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)

        echo -n "Verifying $filename ($size)... "

        # Check if file is readable
        if [[ ! -r "$backup" ]]; then
            echo "FAILED (not readable)"
            log "ERROR" "Backup not readable: $backup"
            ((failed++))
            continue
        fi

        # Decompress and verify
        local temp_file="${TEMP_DIR}/verify_$(basename "$backup" .gz)"
        mkdir -p "$TEMP_DIR"

        if ! gunzip -c "$backup" > "$temp_file" 2>> "$VERIFY_LOG"; then
            echo "FAILED (decompression error)"
            log "ERROR" "Failed to decompress: $backup"
            ((failed++))
            rm -f "$temp_file"
            continue
        fi

        # Verify based on file type
        local verified=false

        if [[ "$temp_file" == *.custom ]]; then
            # Custom format - use pg_restore
            if pg_restore --list "$temp_file" > /dev/null 2>&1; then
                verified=true
            fi
        else
            # SQL format - check for PostgreSQL dump header
            if head -100 "$temp_file" | grep -q "PostgreSQL database dump"; then
                verified=true
            fi
        fi

        rm -f "$temp_file"

        if $verified; then
            echo "OK"
            ((success++))
        else
            echo "FAILED (invalid format)"
            log "ERROR" "Invalid backup format: $backup"
            ((failed++))
        fi
    done

    echo ""
    echo "=========================================="
    echo "SUMMARY"
    echo "=========================================="
    echo "Total: $total"
    echo "Success: $success"
    echo "Failed: $failed"
    echo "=========================================="
    echo ""

    # Cleanup
    rm -rf "$TEMP_DIR"

    if [[ $failed -gt 0 ]]; then
        log "WARN" "Verification completed with $failed failures"
        return 1
    else
        log "INFO" "All backups verified successfully"
        return 0
    fi
}

# Check backup freshness
check_backup_freshness() {
    log "INFO" "Checking backup freshness..."

    local latest_backup=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

    if [[ -z "$latest_backup" ]]; then
        log "ERROR" "No backups found"
        return 1
    fi

    local backup_age=$(( ($(date +%s) - $(stat -f %m "$latest_backup")) / 3600 ))
    local filename=$(basename "$latest_backup")

    echo ""
    echo "Latest backup: $filename"
    echo "Age: $backup_age hours"
    echo ""

    if [[ $backup_age -gt 48 ]]; then
        log "WARN" "Latest backup is older than 48 hours"
        return 1
    elif [[ $backup_age -gt 24 ]]; then
        log "WARN" "Latest backup is older than 24 hours"
        return 0
    else
        log "INFO" "Latest backup is fresh (< 24 hours old)"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log "INFO" "Checking disk space..."

    local backup_dir_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local available_space=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    local usage_percent=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')

    echo ""
    echo "Backup directory size: $backup_dir_size"
    echo "Available space: $available_space"
    echo "Disk usage: $usage_percent%"
    echo ""

    if [[ $usage_percent -gt 90 ]]; then
        log "ERROR" "Disk usage is critical (> 90%)"
        return 1
    elif [[ $usage_percent -gt 80 ]]; then
        log "WARN" "Disk usage is high (> 80%)"
        return 0
    else
        log "INFO" "Disk space is adequate"
        return 0
    fi
}

# Generate health report
generate_health_report() {
    log "INFO" "Generating health report..."

    local report_file="${LOG_DIR}/backup_health_report_$(date +%Y%m%d).txt"

    cat > "$report_file" << EOF
========================================
POSTGRESQL BACKUP HEALTH REPORT
========================================
Generated: $(date '+%Y-%m-%d %H:%M:%S')
Database: $DB_NAME
Backup Directory: $BACKUP_DIR

========================================
BACKUP STATISTICS
========================================
EOF

    # Count backups
    local total_backups=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)

    echo "Total backups: $total_backups" >> "$report_file"
    echo "Total size: $total_size" >> "$report_file"
    echo "" >> "$report_file"

    # Latest backup info
    local latest_backup=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

    if [[ -n "$latest_backup" ]]; then
        local latest_name=$(basename "$latest_backup")
        local latest_size=$(du -h "$latest_backup" | cut -f1)
        local latest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$latest_backup")

        echo "Latest backup:" >> "$report_file"
        echo "  Name: $latest_name" >> "$report_file"
        echo "  Size: $latest_size" >> "$report_file"
        echo "  Date: $latest_date" >> "$report_file"
        echo "" >> "$report_file"
    fi

    # Oldest backup info
    local oldest_backup=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' | sort -n | head -1 | cut -d' ' -f2-)

    if [[ -n "$oldest_backup" ]]; then
        local oldest_name=$(basename "$oldest_backup")
        local oldest_size=$(du -h "$oldest_backup" | cut -f1)
        local oldest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$oldest_backup")

        echo "Oldest backup:" >> "$report_file"
        echo "  Name: $oldest_name" >> "$report_file"
        echo "  Size: $oldest_size" >> "$report_file"
        echo "  Date: $oldest_date" >> "$report_file"
        echo "" >> "$report_file"
    fi

    # Disk space
    cat >> "$report_file" << EOF
========================================
DISK SPACE
========================================
EOF

    df -h "$BACKUP_DIR" | tail -1 >> "$report_file"
    echo "" >> "$report_file"

    # Hetzner info
    if [[ "$HETZNER_ENABLED" == "true" && -n "$HETZNER_USER" && -n "$HETZNER_HOST" && -f "$HETZNER_SSH_KEY" ]]; then
        cat >> "$report_file" << EOF
========================================
HETZNER STORAGE BOX
========================================
Status: Configured
Remote directory: $HETZNER_REMOTE_DIR
EOF

        local hetzner_backups=$(ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no \
            "${HETZNER_USER}@${HETZNER_HOST}" \
            "ls ${HETZNER_REMOTE_DIR}/${BACKUP_PREFIX}_*.gz 2>/dev/null | wc -l" || echo "0")

        echo "Remote backups: $hetzner_backups" >> "$report_file"
        echo "" >> "$report_file"
    fi

    cat >> "$report_file" << EOF
========================================
CONFIGURATION
========================================
Retention (local): $RETENTION_DAYS days
Max local backups: $MAX_LOCAL_BACKUPS
Compression level: $COMPRESSION_LEVEL
Parallel jobs: $PARALLEL_JOBS
========================================
EOF

    log "INFO" "Health report generated: $report_file"
    cat "$report_file"
}

# ============================================================
# MAIN EXECUTION
# ============================================================

mkdir -p "$LOG_DIR" "$TEMP_DIR"
touch "$VERIFY_LOG"

log "INFO" "=========================================="
log "INFO" "Backup Verification Started"
log "INFO" "=========================================="

# Parse arguments
if [[ $# -gt 0 ]]; then
    case $1 in
        --all)
            verify_all_local_backups
            ;;
        --freshness)
            check_backup_freshness
            ;;
        --disk-space)
            check_disk_space
            ;;
        --report)
            generate_health_report
            ;;
        *)
            echo "Usage: $0 [--all|--freshness|--disk-space|--report]"
            echo ""
            echo "Options:"
            echo "  --all         Verify all local backups"
            echo "  --freshness   Check if backups are recent"
            echo "  --disk-space  Check available disk space"
            echo "  --report      Generate comprehensive health report"
            echo ""
            echo "If no option is provided, all checks will be run."
            exit 1
            ;;
    esac
else
    # Run all checks
    check_backup_freshness
    echo ""
    check_disk_space
    echo ""
    verify_all_local_backups
    echo ""
    generate_health_report
fi

log "INFO" "=========================================="
log "INFO" "Verification Completed"
log "INFO" "=========================================="

exit 0
