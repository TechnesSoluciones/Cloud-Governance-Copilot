#!/bin/bash
# ============================================================
# PostgreSQL Backup System - Installation Script
# ============================================================
# Description: One-command installation and setup
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/josegomez/Documents/Code/SaaS/Copilot"
BACKUP_DIR="${PROJECT_ROOT}/backups/postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# FUNCTIONS
# ============================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$@"
    echo "=========================================="
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"

    local missing_deps=()

    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_warn "PostgreSQL client (psql) not found"
        missing_deps+=("postgresql-client")
    else
        log_success "PostgreSQL client: $(psql --version | head -1)"
    fi

    # Check pg_dump
    if ! command -v pg_dump &> /dev/null; then
        log_warn "pg_dump not found"
        missing_deps+=("postgresql-client")
    else
        log_success "pg_dump: found"
    fi

    # Check gzip
    if ! command -v gzip &> /dev/null; then
        log_error "gzip not found (required)"
        missing_deps+=("gzip")
    else
        log_success "gzip: found"
    fi

    # Check rsync
    if ! command -v rsync &> /dev/null; then
        log_warn "rsync not found (needed for Hetzner upload)"
        missing_deps+=("rsync")
    else
        log_success "rsync: found"
    fi

    # Check ssh
    if ! command -v ssh &> /dev/null; then
        log_warn "ssh not found (needed for Hetzner upload)"
        missing_deps+=("openssh-client")
    else
        log_success "ssh: found"
    fi

    # Check cron
    if ! command -v crontab &> /dev/null; then
        log_warn "cron not found (needed for automation)"
        missing_deps+=("cron")
    else
        log_success "cron: found"
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo ""
        log_warn "Missing dependencies detected"
        echo ""
        echo "To install on macOS (using Homebrew):"
        echo "  brew install postgresql rsync"
        echo ""
        echo "To install on Ubuntu/Debian:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install postgresql-client rsync openssh-client cron"
        echo ""
        echo "To install on CentOS/RHEL:"
        echo "  sudo yum install postgresql rsync openssh-clients cronie"
        echo ""

        read -p "Continue anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_error "Installation cancelled"
            exit 1
        fi
    fi
}

# Create directory structure
create_directories() {
    print_header "CREATING DIRECTORY STRUCTURE"

    local dirs=(
        "$BACKUP_DIR"
        "${SCRIPT_DIR}/logs"
        "${SCRIPT_DIR}/configs"
        "${BACKUP_DIR}/tmp"
    )

    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log_info "Directory exists: $dir"
        else
            mkdir -p "$dir"
            log_success "Created: $dir"
        fi
    done

    # Set secure permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "${SCRIPT_DIR}/logs"

    log_success "Directory structure created"
}

# Configure backup settings
configure_backup() {
    print_header "CONFIGURING BACKUP SETTINGS"

    local config_file="${SCRIPT_DIR}/configs/backup.conf"

    if [[ -f "$config_file" ]]; then
        log_info "Configuration file already exists"

        read -p "Reconfigure? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Keeping existing configuration"
            return 0
        fi

        # Backup existing config
        cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up existing configuration"
    fi

    echo ""
    echo "Database configuration will be loaded from .env file"
    echo ""

    # Check if .env exists
    local env_file="${PROJECT_ROOT}/.env"
    if [[ -f "$env_file" ]]; then
        log_success "Found .env file: $env_file"

        # Extract database credentials
        source "$env_file"

        echo ""
        echo "Detected database configuration:"
        echo "  Host: ${DB_HOST:-46.224.33.191}"
        echo "  Port: ${DB_PORT:-5432}"
        echo "  Database: ${DB_NAME:-copilot_dev}"
        echo "  User: ${DB_USER:-copilot_dev}"
        echo ""

        read -p "Use these settings? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            # Already configured in backup.conf
            log_success "Database configuration confirmed"
        fi
    else
        log_warn ".env file not found, using default configuration"
    fi

    # Configure notifications
    echo ""
    read -p "Enable email notifications? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        read -p "Enter notification email address: " notify_email
        sed -i.tmp "s|^NOTIFY_EMAIL=.*|NOTIFY_EMAIL=\"$notify_email\"|" "$config_file"
        sed -i.tmp "s|^NOTIFICATIONS_ENABLED=.*|NOTIFICATIONS_ENABLED=true|" "$config_file"
        log_success "Email notifications configured: $notify_email"
    fi

    # Configure retention
    echo ""
    read -p "How many days to retain local backups? (default: 30): " retention_days
    retention_days=${retention_days:-30}
    sed -i.tmp "s|^RETENTION_DAYS=.*|RETENTION_DAYS=$retention_days|" "$config_file"

    read -p "Maximum number of local backups to keep? (default: 14): " max_backups
    max_backups=${max_backups:-14}
    sed -i.tmp "s|^MAX_LOCAL_BACKUPS=.*|MAX_LOCAL_BACKUPS=$max_backups|" "$config_file"

    rm -f "${config_file}.tmp"

    log_success "Backup configuration complete"
}

# Make scripts executable
setup_scripts() {
    print_header "SETTING UP SCRIPTS"

    local scripts=(
        "${SCRIPT_DIR}/backup.sh"
        "${SCRIPT_DIR}/restore.sh"
        "${SCRIPT_DIR}/verify-backup.sh"
        "${SCRIPT_DIR}/setup-cron.sh"
        "${SCRIPT_DIR}/setup-hetzner.sh"
    )

    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            chmod +x "$script"
            log_success "Made executable: $(basename $script)"
        else
            log_warn "Script not found: $(basename $script)"
        fi
    done
}

# Test database connection
test_database() {
    print_header "TESTING DATABASE CONNECTION"

    source "${SCRIPT_DIR}/configs/backup.conf"

    export PGPASSWORD="$DB_PASSWORD"

    log_info "Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Database connection successful"

        # Get database info
        local db_version=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -1 | xargs)
        local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)

        echo ""
        echo "Database information:"
        echo "  Version: $db_version"
        echo "  Size: $db_size"
        echo ""

        return 0
    else
        log_error "Cannot connect to database"
        log_error "Please check credentials in configs/backup.conf"
        return 1
    fi
}

# Run test backup
run_test_backup() {
    print_header "RUNNING TEST BACKUP"

    echo "This will create a test backup of your database."
    echo "Depending on database size, this may take a few minutes."
    echo ""

    read -p "Proceed with test backup? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Test backup skipped"
        return 0
    fi

    log_info "Starting test backup..."

    if "${SCRIPT_DIR}/backup.sh"; then
        log_success "Test backup completed successfully!"

        # Show backup info
        local latest_backup=$(find "$BACKUP_DIR" -name "*.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

        if [[ -n "$latest_backup" ]]; then
            local backup_size=$(du -h "$latest_backup" | cut -f1)
            echo ""
            echo "Test backup details:"
            echo "  File: $(basename $latest_backup)"
            echo "  Size: $backup_size"
            echo "  Location: $latest_backup"
            echo ""
        fi

        return 0
    else
        log_error "Test backup failed"
        log_error "Check logs: ${SCRIPT_DIR}/logs/"
        return 1
    fi
}

# Setup automation
setup_automation() {
    print_header "SETTING UP AUTOMATION"

    echo "Configure automated daily backups using cron?"
    echo ""
    echo "Schedule:"
    echo "  - Daily backup:     02:00 AM"
    echo "  - Weekly verify:    03:00 AM (Sundays)"
    echo "  - Monthly report:   04:00 AM (1st of month)"
    echo ""

    read -p "Install cron jobs? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Automation setup skipped"
        log_info "You can run './setup-cron.sh --install' later"
        return 0
    fi

    if "${SCRIPT_DIR}/setup-cron.sh" --install; then
        log_success "Cron jobs installed successfully"
        return 0
    else
        log_error "Failed to install cron jobs"
        return 1
    fi
}

# Configure Hetzner
configure_hetzner() {
    print_header "HETZNER STORAGE BOX CONFIGURATION"

    echo "Hetzner Storage Box provides secure offsite backup storage."
    echo ""

    read -p "Configure Hetzner Storage Box now? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Hetzner configuration skipped"
        log_info "You can run './setup-hetzner.sh --setup' later"
        return 0
    fi

    "${SCRIPT_DIR}/setup-hetzner.sh" --setup
}

# Print summary
print_summary() {
    print_header "INSTALLATION COMPLETE"

    cat << EOF
The PostgreSQL backup system has been installed successfully!

INSTALLED COMPONENTS:
  - Backup scripts:    ${SCRIPT_DIR}
  - Backup directory:  ${BACKUP_DIR}
  - Configuration:     ${SCRIPT_DIR}/configs/backup.conf
  - Log files:         ${SCRIPT_DIR}/logs/

NEXT STEPS:

1. Configure Hetzner Storage Box (if not done):
   cd ${SCRIPT_DIR}
   ./setup-hetzner.sh --setup

2. Run manual backup:
   ./backup.sh

3. Setup automation (if not done):
   ./setup-cron.sh --install

4. Verify backups:
   ./verify-backup.sh --all

5. Test restoration:
   ./restore.sh --list

DOCUMENTATION:
  Read full documentation: ${SCRIPT_DIR}/README.md

SUPPORT:
  - View logs: tail -f ${SCRIPT_DIR}/logs/backup_\$(date +%Y%m).log
  - Health report: ./verify-backup.sh --report
  - Test connection: ./setup-hetzner.sh --test

IMPORTANT:
  - Backups run daily at 02:00 AM (if cron installed)
  - Local retention: configured in backup.conf
  - Test restoration regularly to ensure backups work!

EOF

    log_success "Installation complete!"
}

# ============================================================
# MAIN EXECUTION
# ============================================================

clear

cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   PostgreSQL Backup System Installer                      ║
║   Cloud Governance Copilot                                 ║
║                                                            ║
║   Features:                                                ║
║   - Automated daily backups                                ║
║   - Hetzner Storage Box integration                        ║
║   - Backup rotation and verification                       ║
║   - Email/Webhook notifications                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF

echo ""
read -p "Press Enter to begin installation..."

# Run installation steps
check_prerequisites
create_directories
configure_backup
setup_scripts

echo ""
if test_database; then
    run_test_backup
else
    log_warn "Database connection failed - test backup skipped"
    log_warn "Please configure database credentials manually"
fi

setup_automation
configure_hetzner

print_summary

exit 0
