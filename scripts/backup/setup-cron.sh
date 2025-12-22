#!/bin/bash
# ============================================================
# Setup Automated Backups with Cron
# ============================================================
# Description: Configure cron jobs for automated PostgreSQL backups
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-backup.sh"

# ============================================================
# FUNCTIONS
# ============================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@"
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Setup automated PostgreSQL backups using cron.

OPTIONS:
    --install           Install cron jobs
    --auto              Install cron jobs automatically (no prompts)
    --uninstall         Remove cron jobs
    --status            Show current cron configuration
    --test              Test backup script
    -h, --help          Display this help message

CRON SCHEDULE:
    Daily backup:       02:00 AM (every day)
    Weekly verify:      03:00 AM (every Sunday)
    Monthly report:     04:00 AM (1st of each month)

EXAMPLES:
    # Install cron jobs
    $0 --install

    # Check current configuration
    $0 --status

    # Remove cron jobs
    $0 --uninstall

    # Test backup script
    $0 --test

EOF
    exit 1
}

# Check if running on macOS or Linux
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Install cron jobs
install_cron() {
    local os=$(detect_os)

    log "Installing cron jobs for PostgreSQL backup..."

    # Make scripts executable
    chmod +x "$BACKUP_SCRIPT"
    chmod +x "$VERIFY_SCRIPT"

    log "Scripts made executable"

    # Create temporary cron file
    local temp_cron=$(mktemp)

    # Get existing cron jobs (excluding our backup jobs)
    crontab -l 2>/dev/null | grep -v "# PostgreSQL Backup" | grep -v "$BACKUP_SCRIPT" | grep -v "$VERIFY_SCRIPT" > "$temp_cron" || true

    # Add our cron jobs
    cat >> "$temp_cron" << EOF

# ============================================================
# PostgreSQL Backup - Automated Jobs
# ============================================================
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# Daily backup at 2:00 AM
0 2 * * * $BACKUP_SCRIPT >> ${SCRIPT_DIR}/logs/cron.log 2>&1

# Weekly verification on Sundays at 3:00 AM
0 3 * * 0 $VERIFY_SCRIPT --all >> ${SCRIPT_DIR}/logs/verify_cron.log 2>&1

# Monthly health report on 1st at 4:00 AM
0 4 1 * * $VERIFY_SCRIPT --report >> ${SCRIPT_DIR}/logs/report_cron.log 2>&1

EOF

    # Install cron jobs
    if crontab "$temp_cron"; then
        log "Cron jobs installed successfully"
        rm -f "$temp_cron"
    else
        log "ERROR: Failed to install cron jobs"
        rm -f "$temp_cron"
        exit 1
    fi

    # Display installed jobs
    echo ""
    echo "=========================================="
    echo "INSTALLED CRON JOBS"
    echo "=========================================="
    crontab -l | grep -A 10 "PostgreSQL Backup"
    echo "=========================================="
    echo ""

    log "Setup complete!"
    echo ""
    echo "Backup schedule:"
    echo "  - Daily backups:    02:00 AM"
    echo "  - Weekly verify:    03:00 AM (Sundays)"
    echo "  - Monthly reports:  04:00 AM (1st of month)"
    echo ""
    echo "Log files:"
    echo "  - Backup logs:  ${SCRIPT_DIR}/logs/"
    echo "  - Cron logs:    ${SCRIPT_DIR}/logs/cron.log"
    echo ""
}

# Uninstall cron jobs
uninstall_cron() {
    log "Removing PostgreSQL backup cron jobs..."

    # Create temporary cron file
    local temp_cron=$(mktemp)

    # Get existing cron jobs (excluding our backup jobs)
    crontab -l 2>/dev/null | grep -v "# PostgreSQL Backup" | grep -v "$BACKUP_SCRIPT" | grep -v "$VERIFY_SCRIPT" > "$temp_cron" || true

    # Install cleaned cron jobs
    if crontab "$temp_cron"; then
        log "Cron jobs removed successfully"
        rm -f "$temp_cron"
    else
        log "ERROR: Failed to remove cron jobs"
        rm -f "$temp_cron"
        exit 1
    fi

    echo ""
    log "Uninstall complete!"
}

# Show cron status
show_status() {
    echo "=========================================="
    echo "CURRENT CRON CONFIGURATION"
    echo "=========================================="
    echo ""

    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        echo "Status: INSTALLED"
        echo ""
        echo "Active jobs:"
        crontab -l | grep -A 10 "PostgreSQL Backup" || echo "No backup jobs found"
    else
        echo "Status: NOT INSTALLED"
        echo ""
        echo "Run '$0 --install' to setup automated backups"
    fi

    echo ""
    echo "=========================================="
    echo "SCRIPT LOCATIONS"
    echo "=========================================="
    echo "Backup script:  $BACKUP_SCRIPT"
    echo "Verify script:  $VERIFY_SCRIPT"
    echo "Log directory:  ${SCRIPT_DIR}/logs/"
    echo ""

    # Check if scripts are executable
    if [[ -x "$BACKUP_SCRIPT" ]]; then
        echo "Backup script: EXECUTABLE"
    else
        echo "Backup script: NOT EXECUTABLE (run chmod +x)"
    fi

    if [[ -x "$VERIFY_SCRIPT" ]]; then
        echo "Verify script: EXECUTABLE"
    else
        echo "Verify script: NOT EXECUTABLE (run chmod +x)"
    fi

    echo ""
}

# Test backup script
test_backup() {
    log "Testing backup script..."

    if [[ ! -x "$BACKUP_SCRIPT" ]]; then
        log "Making backup script executable..."
        chmod +x "$BACKUP_SCRIPT"
    fi

    echo ""
    echo "=========================================="
    echo "RUNNING TEST BACKUP"
    echo "=========================================="
    echo ""

    if $BACKUP_SCRIPT; then
        echo ""
        log "Test backup completed successfully!"
    else
        echo ""
        log "ERROR: Test backup failed"
        exit 1
    fi
}

# Setup systemd timer (Linux alternative to cron)
setup_systemd_timer() {
    log "Setting up systemd timer..."

    local service_file="/etc/systemd/system/postgres-backup.service"
    local timer_file="/etc/systemd/system/postgres-backup.timer"

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log "ERROR: This operation requires root privileges"
        log "Run with: sudo $0 --install-systemd"
        exit 1
    fi

    # Create service file
    cat > "$service_file" << EOF
[Unit]
Description=PostgreSQL Backup Service
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=$BACKUP_SCRIPT
User=$USER
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Create timer file
    cat > "$timer_file" << EOF
[Unit]
Description=PostgreSQL Backup Timer
Requires=postgres-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Reload systemd
    systemctl daemon-reload

    # Enable and start timer
    systemctl enable postgres-backup.timer
    systemctl start postgres-backup.timer

    log "Systemd timer installed successfully"

    # Show status
    systemctl status postgres-backup.timer
}

# ============================================================
# MAIN EXECUTION
# ============================================================

# Check if scripts exist
if [[ ! -f "$BACKUP_SCRIPT" ]]; then
    log "ERROR: Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

if [[ ! -f "$VERIFY_SCRIPT" ]]; then
    log "ERROR: Verify script not found: $VERIFY_SCRIPT"
    exit 1
fi

# Parse arguments
if [[ $# -eq 0 ]]; then
    usage
fi

case $1 in
    --install|--auto)
        install_cron
        ;;
    --uninstall)
        uninstall_cron
        ;;
    --status)
        show_status
        ;;
    --test)
        test_backup
        ;;
    --install-systemd)
        setup_systemd_timer
        ;;
    -h|--help)
        usage
        ;;
    *)
        echo "Unknown option: $1"
        usage
        ;;
esac

exit 0
