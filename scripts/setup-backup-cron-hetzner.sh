#!/bin/bash
# ============================================================
# Setup Automated Cron Jobs for Hetzner Storage Box Backups
# ============================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"
BACKUP_SCRIPT="${SCRIPT_DIR}/hetzner-storagebox-backup.sh"
ENV_FILE="${PROJECT_DIR}/.env"

print_header() {
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}============================================================${NC}\n"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if backup script exists
    if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
        print_error "Backup script not found: ${BACKUP_SCRIPT}"
        exit 1
    fi

    # Check if executable
    if [[ ! -x "${BACKUP_SCRIPT}" ]]; then
        print_warning "Making backup script executable..."
        chmod +x "${BACKUP_SCRIPT}"
    fi

    # Check if .env exists
    if [[ ! -f "${ENV_FILE}" ]]; then
        print_error "Environment file not found: ${ENV_FILE}"
        print_info "Please create .env file with necessary configuration"
        exit 1
    fi

    print_info "All prerequisites met"
}

show_schedule_options() {
    print_header "Backup Schedule Options"

    echo "Select backup frequency:"
    echo ""
    echo "1) Every 6 hours (recommended for critical production)"
    echo "2) Daily at 2:00 AM (recommended for standard production)"
    echo "3) Daily at custom time"
    echo "4) Twice daily (2:00 AM and 2:00 PM)"
    echo "5) Weekly (Sundays at 2:00 AM)"
    echo "6) Custom cron expression"
    echo "7) Skip cron setup (manual execution only)"
    echo ""
    read -p "Enter option (1-7): " schedule_option
    echo ""
}

get_cron_expression() {
    local option="$1"
    local cron_expr=""

    case "${option}" in
        1)
            cron_expr="0 */6 * * *"
            print_info "Schedule: Every 6 hours"
            ;;
        2)
            cron_expr="0 2 * * *"
            print_info "Schedule: Daily at 2:00 AM"
            ;;
        3)
            read -p "Enter hour (0-23): " hour
            read -p "Enter minute (0-59): " minute
            cron_expr="${minute} ${hour} * * *"
            print_info "Schedule: Daily at ${hour}:${minute}"
            ;;
        4)
            cron_expr="0 2,14 * * *"
            print_info "Schedule: Twice daily at 2:00 AM and 2:00 PM"
            ;;
        5)
            cron_expr="0 2 * * 0"
            print_info "Schedule: Weekly on Sundays at 2:00 AM"
            ;;
        6)
            read -p "Enter custom cron expression: " cron_expr
            print_info "Schedule: Custom (${cron_expr})"
            ;;
        7)
            print_info "Skipping cron setup"
            return 1
            ;;
        *)
            print_error "Invalid option"
            return 1
            ;;
    esac

    echo "${cron_expr}"
}

create_cron_wrapper() {
    local wrapper_script="/tmp/hetzner-backup-cron-wrapper.sh"

    print_info "Creating cron wrapper script..."

    cat > "${wrapper_script}" <<'EOF'
#!/bin/bash
# Wrapper script for cron execution

# Source environment variables
if [[ -f "%%ENV_FILE%%" ]]; then
    set -a
    source "%%ENV_FILE%%"
    set +a
fi

# Execute backup script
"%%BACKUP_SCRIPT%%" >> /var/log/hetzner-backup-cron.log 2>&1

# Check exit status
if [[ $? -eq 0 ]]; then
    echo "[$(date)] Backup completed successfully" >> /var/log/hetzner-backup-cron.log
else
    echo "[$(date)] Backup failed!" >> /var/log/hetzner-backup-cron.log

    # Optional: Send email notification on failure
    # echo "Backup failed at $(date)" | mail -s "Backup Failure Alert" admin@yourdomain.com
fi
EOF

    # Replace placeholders
    sed -i.bak "s|%%ENV_FILE%%|${ENV_FILE}|g" "${wrapper_script}"
    sed -i.bak "s|%%BACKUP_SCRIPT%%|${BACKUP_SCRIPT}|g" "${wrapper_script}"
    rm "${wrapper_script}.bak"

    chmod +x "${wrapper_script}"

    echo "${wrapper_script}"
}

setup_cron_job() {
    local cron_expr="$1"
    local wrapper_script="$2"

    print_header "Setting Up Cron Job"

    # Backup existing crontab
    crontab -l > /tmp/crontab.backup 2>/dev/null || true

    # Check if job already exists
    if crontab -l 2>/dev/null | grep -q "hetzner-storagebox-backup"; then
        print_warning "Existing Hetzner backup cron job found"
        read -p "Do you want to replace it? (yes/no): " replace
        if [[ "${replace}" != "yes" ]]; then
            print_info "Keeping existing cron job"
            return 0
        fi
        # Remove existing job
        crontab -l | grep -v "hetzner-storagebox-backup" | crontab -
    fi

    # Add new cron job
    (crontab -l 2>/dev/null; echo "${cron_expr} ${wrapper_script}  # Hetzner Storage Box PostgreSQL Backup") | crontab -

    print_info "Cron job added successfully"
    print_info ""
    print_info "Current crontab:"
    crontab -l | grep "hetzner-storagebox-backup"
}

setup_systemd_timer() {
    print_header "Setting Up Systemd Timer (Alternative to Cron)"

    read -p "Do you want to use systemd timer instead of cron? (yes/no): " use_systemd
    if [[ "${use_systemd}" != "yes" ]]; then
        return 0
    fi

    # Check if systemd is available
    if ! command -v systemctl &> /dev/null; then
        print_error "systemd not available on this system"
        return 1
    fi

    local service_file="/tmp/hetzner-backup.service"
    local timer_file="/tmp/hetzner-backup.timer"

    # Create service file
    cat > "${service_file}" <<EOF
[Unit]
Description=Hetzner Storage Box PostgreSQL Backup
After=postgresql.service
Wants=postgresql.service

[Service]
Type=oneshot
User=$(whoami)
Group=$(whoami)
EnvironmentFile=${ENV_FILE}
ExecStart=${BACKUP_SCRIPT}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hetzner-backup

[Install]
WantedBy=multi-user.target
EOF

    # Create timer file
    read -p "Enter backup hour (0-23) [default: 2]: " timer_hour
    timer_hour="${timer_hour:-2}"

    cat > "${timer_file}" <<EOF
[Unit]
Description=Hetzner Backup Daily Timer
Requires=hetzner-backup.service

[Timer]
OnCalendar=daily
OnCalendar=${timer_hour}:00
Persistent=true
AccuracySec=1h

[Install]
WantedBy=timers.target
EOF

    print_info "Service and timer files created in /tmp/"
    print_info ""
    print_info "To install systemd timer, run these commands as root:"
    echo ""
    echo "  sudo cp ${service_file} /etc/systemd/system/"
    echo "  sudo cp ${timer_file} /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable hetzner-backup.timer"
    echo "  sudo systemctl start hetzner-backup.timer"
    echo "  sudo systemctl status hetzner-backup.timer"
    echo ""
}

create_log_rotation() {
    print_header "Setting Up Log Rotation"

    local logrotate_file="/tmp/hetzner-backup-logrotate.conf"

    cat > "${logrotate_file}" <<EOF
/var/log/hetzner-backup.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $(whoami) $(whoami)
    sharedscripts
    postrotate
        # Optional: Send log summary via email
        # tail -100 /var/log/hetzner-backup.log | mail -s "Backup Log Summary" admin@yourdomain.com
    endscript
}

/var/log/hetzner-backup-cron.log {
    weekly
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 0640 $(whoami) $(whoami)
}
EOF

    print_info "Logrotate configuration created: ${logrotate_file}"
    print_info ""
    print_info "To install logrotate config, run:"
    echo ""
    echo "  sudo cp ${logrotate_file} /etc/logrotate.d/hetzner-backup"
    echo "  sudo chmod 644 /etc/logrotate.d/hetzner-backup"
    echo ""
}

test_backup_execution() {
    print_header "Testing Backup Execution"

    read -p "Do you want to run a test backup now? (yes/no): " run_test
    if [[ "${run_test}" != "yes" ]]; then
        print_info "Skipping test backup"
        return 0
    fi

    print_info "Running test backup..."
    print_info "(This may take several minutes depending on database size)"
    echo ""

    if "${BACKUP_SCRIPT}"; then
        print_info "Test backup completed successfully!"
    else
        print_error "Test backup failed. Check logs for details."
        return 1
    fi
}

show_next_steps() {
    print_header "Setup Complete!"

    echo "Next steps and verification:"
    echo ""
    echo "1. Verify cron job:"
    echo "   crontab -l | grep hetzner"
    echo ""
    echo "2. Check backup logs:"
    echo "   tail -f /var/log/hetzner-backup.log"
    echo ""
    echo "3. List remote backups:"
    echo "   ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de 'ls -lh /backups/postgresql/'"
    echo ""
    echo "4. Test restore process (on development server):"
    echo "   ${SCRIPT_DIR}/hetzner-storagebox-restore.sh"
    echo ""
    echo "5. Monitor backup health:"
    echo "   - Check Slack notifications (if configured)"
    echo "   - Review logs weekly"
    echo "   - Verify backup integrity monthly"
    echo ""
    echo "6. Next backup scheduled at:"
    crontab -l | grep "hetzner-storagebox-backup" | awk '{print $1,$2,$3,$4,$5}'
    echo ""
    print_info "Automated backup system is now active!"
}

main() {
    print_header "Hetzner Storage Box - Automated Backup Setup"

    check_prerequisites
    show_schedule_options

    cron_expr=$(get_cron_expression "${schedule_option}")
    if [[ $? -ne 0 ]]; then
        show_next_steps
        return 0
    fi

    wrapper_script=$(create_cron_wrapper)
    setup_cron_job "${cron_expr}" "${wrapper_script}"
    setup_systemd_timer
    create_log_rotation
    test_backup_execution
    show_next_steps
}

main
