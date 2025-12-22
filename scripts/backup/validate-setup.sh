#!/bin/bash
# ============================================================
# System Validation Script
# ============================================================
# Description: Validate complete backup system setup
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/configs/backup.conf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# FUNCTIONS
# ============================================================

print_check() {
    local status=$1
    local message=$2

    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            return 0
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            return 1
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            return 1
            ;;
    esac
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================
# VALIDATION CHECKS
# ============================================================

check_scripts() {
    print_section "CHECKING SCRIPTS"

    local scripts=(
        "backup.sh"
        "restore.sh"
        "verify-backup.sh"
        "setup-cron.sh"
        "setup-hetzner.sh"
        "monitor.sh"
        "install.sh"
    )

    local pass=0
    local total=${#scripts[@]}

    for script in "${scripts[@]}"; do
        if [[ -f "${SCRIPT_DIR}/${script}" ]]; then
            if [[ -x "${SCRIPT_DIR}/${script}" ]]; then
                print_check "PASS" "Script ${script}: exists and executable"
                ((pass++))
            else
                print_check "WARN" "Script ${script}: exists but not executable"
            fi
        else
            print_check "FAIL" "Script ${script}: not found"
        fi
    done

    echo ""
    echo "Scripts: $pass/$total OK"
    return 0
}

check_configuration() {
    print_section "CHECKING CONFIGURATION"

    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_check "FAIL" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi

    print_check "PASS" "Configuration file exists"

    # Source config
    source "$CONFIG_FILE"

    # Check database configuration
    local required_vars=(
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "BACKUP_DIR"
    )

    local missing=0

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            print_check "FAIL" "Required variable $var is not set"
            ((missing++))
        else
            print_check "PASS" "Variable $var is configured"
        fi
    done

    if [[ $missing -eq 0 ]]; then
        echo ""
        echo "Configuration: OK"
        return 0
    else
        echo ""
        echo "Configuration: $missing variables missing"
        return 1
    fi
}

check_directories() {
    print_section "CHECKING DIRECTORIES"

    source "$CONFIG_FILE"

    local dirs=(
        "$BACKUP_DIR"
        "$LOG_DIR"
        "${SCRIPT_DIR}/configs"
    )

    local pass=0
    local total=${#dirs[@]}

    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            if [[ -w "$dir" ]]; then
                print_check "PASS" "Directory ${dir}: exists and writable"
                ((pass++))
            else
                print_check "WARN" "Directory ${dir}: exists but not writable"
            fi
        else
            print_check "WARN" "Directory ${dir}: does not exist (will be created)"
        fi
    done

    echo ""
    echo "Directories: $pass/$total OK"
    return 0
}

check_dependencies() {
    print_section "CHECKING DEPENDENCIES"

    local deps=(
        "psql:PostgreSQL client"
        "pg_dump:PostgreSQL dump utility"
        "pg_restore:PostgreSQL restore utility"
        "gzip:Compression utility"
        "rsync:File sync utility"
        "ssh:SSH client"
    )

    local pass=0
    local total=${#deps[@]}

    for dep_info in "${deps[@]}"; do
        local dep="${dep_info%%:*}"
        local desc="${dep_info#*:}"

        if command -v "$dep" &> /dev/null; then
            print_check "PASS" "$desc ($dep): installed"
            ((pass++))
        else
            print_check "WARN" "$desc ($dep): not found"
        fi
    done

    echo ""
    echo "Dependencies: $pass/$total installed"

    if [[ $pass -lt $total ]]; then
        echo ""
        echo "To install missing dependencies:"
        echo "  macOS:   brew install postgresql rsync"
        echo "  Ubuntu:  sudo apt install postgresql-client rsync openssh-client"
    fi

    return 0
}

check_database_connection() {
    print_section "CHECKING DATABASE CONNECTION"

    source "$CONFIG_FILE"

    export PGPASSWORD="$DB_PASSWORD"

    echo "Testing connection to: $DB_HOST:$DB_PORT/$DB_NAME"
    echo ""

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        print_check "PASS" "Database connection successful"

        # Get database info
        local db_version=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
        local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)

        echo ""
        echo "Database information:"
        echo "  Version: $db_version"
        echo "  Size: $db_size"

        return 0
    else
        print_check "FAIL" "Cannot connect to database"
        echo ""
        echo "Please check:"
        echo "  - Database is running"
        echo "  - Credentials are correct in configs/backup.conf"
        echo "  - Network connectivity to $DB_HOST:$DB_PORT"
        return 1
    fi
}

check_hetzner_setup() {
    print_section "CHECKING HETZNER STORAGE BOX"

    source "$CONFIG_FILE"

    if [[ "$HETZNER_ENABLED" != "true" ]]; then
        print_check "WARN" "Hetzner Storage Box is disabled"
        return 0
    fi

    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        print_check "WARN" "Hetzner credentials not configured"
        echo ""
        echo "Run: ./setup-hetzner.sh --setup"
        return 0
    fi

    print_check "PASS" "Hetzner credentials configured"

    if [[ ! -f "$HETZNER_SSH_KEY" ]]; then
        print_check "WARN" "Hetzner SSH key not found: $HETZNER_SSH_KEY"
        echo ""
        echo "Run: ./setup-hetzner.sh --generate-key"
        return 0
    fi

    print_check "PASS" "Hetzner SSH key exists"

    # Test connection
    if ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
        "${HETZNER_USER}@${HETZNER_HOST}" "echo 'test'" > /dev/null 2>&1; then
        print_check "PASS" "Hetzner connection successful"
        return 0
    else
        print_check "WARN" "Cannot connect to Hetzner Storage Box"
        echo ""
        echo "Run: ./setup-hetzner.sh --test"
        return 0
    fi
}

check_cron_setup() {
    print_section "CHECKING CRON AUTOMATION"

    if ! command -v crontab &> /dev/null; then
        print_check "WARN" "cron not available on this system"
        return 0
    fi

    if crontab -l 2>/dev/null | grep -q "${SCRIPT_DIR}/backup.sh"; then
        print_check "PASS" "Cron jobs are installed"

        echo ""
        echo "Scheduled jobs:"
        crontab -l | grep "${SCRIPT_DIR}" || true

        return 0
    else
        print_check "WARN" "Cron jobs not installed"
        echo ""
        echo "Run: ./setup-cron.sh --install"
        return 0
    fi
}

check_disk_space() {
    print_section "CHECKING DISK SPACE"

    source "$CONFIG_FILE"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_check "WARN" "Backup directory does not exist yet"
        return 0
    fi

    local usage=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
    local available=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')

    if [[ $usage -lt 70 ]]; then
        print_check "PASS" "Disk usage: ${usage}% (${available} available)"
    elif [[ $usage -lt 90 ]]; then
        print_check "WARN" "Disk usage: ${usage}% (${available} available)"
    else
        print_check "FAIL" "Disk usage critical: ${usage}% (${available} available)"
    fi

    return 0
}

check_permissions() {
    print_section "CHECKING FILE PERMISSIONS"

    source "$CONFIG_FILE"

    # Check config file permissions
    if [[ -f "$CONFIG_FILE" ]]; then
        local perms=$(stat -f "%OLp" "$CONFIG_FILE" 2>/dev/null || stat -c "%a" "$CONFIG_FILE")
        if [[ "$perms" == "600" || "$perms" == "400" ]]; then
            print_check "PASS" "Configuration file permissions: secure ($perms)"
        else
            print_check "WARN" "Configuration file permissions: $perms (should be 600)"
            echo "  Run: chmod 600 $CONFIG_FILE"
        fi
    fi

    # Check backup directory permissions
    if [[ -d "$BACKUP_DIR" ]]; then
        local perms=$(stat -f "%OLp" "$BACKUP_DIR" 2>/dev/null || stat -c "%a" "$BACKUP_DIR")
        if [[ "$perms" == "700" ]]; then
            print_check "PASS" "Backup directory permissions: secure ($perms)"
        else
            print_check "WARN" "Backup directory permissions: $perms (should be 700)"
            echo "  Run: chmod 700 $BACKUP_DIR"
        fi
    fi

    # Check SSH key permissions
    if [[ -f "$HETZNER_SSH_KEY" ]]; then
        local perms=$(stat -f "%OLp" "$HETZNER_SSH_KEY" 2>/dev/null || stat -c "%a" "$HETZNER_SSH_KEY")
        if [[ "$perms" == "600" || "$perms" == "400" ]]; then
            print_check "PASS" "SSH key permissions: secure ($perms)"
        else
            print_check "WARN" "SSH key permissions: $perms (should be 600)"
            echo "  Run: chmod 600 $HETZNER_SSH_KEY"
        fi
    fi

    return 0
}

run_test_backup() {
    print_section "RUNNING TEST BACKUP"

    echo "This will create a test backup to verify the system works."
    echo ""
    read -p "Run test backup? (yes/no): " -r

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_check "WARN" "Test backup skipped"
        return 0
    fi

    echo ""
    if "${SCRIPT_DIR}/backup.sh"; then
        print_check "PASS" "Test backup completed successfully"
        return 0
    else
        print_check "FAIL" "Test backup failed"
        echo ""
        echo "Check logs: ${SCRIPT_DIR}/logs/"
        return 1
    fi
}

# ============================================================
# MAIN EXECUTION
# ============================================================

clear

cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║           PostgreSQL Backup System Validation                        ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF

echo ""
echo "This script will validate your backup system setup."
echo ""

# Run all checks
check_scripts
check_configuration
check_directories
check_dependencies
check_database_connection
check_hetzner_setup
check_cron_setup
check_disk_space
check_permissions

# Optional test backup
echo ""
read -p "Would you like to run a test backup? (yes/no): " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    run_test_backup
fi

# Summary
print_section "VALIDATION SUMMARY"

echo ""
echo "Validation complete!"
echo ""
echo "Next steps:"
echo ""
echo "  1. If Hetzner is not configured:"
echo "     ./setup-hetzner.sh --setup"
echo ""
echo "  2. If cron is not installed:"
echo "     ./setup-cron.sh --install"
echo ""
echo "  3. Run a manual backup:"
echo "     ./backup.sh"
echo ""
echo "  4. Monitor the system:"
echo "     ./monitor.sh"
echo ""
echo "For complete documentation, see README.md"
echo ""

exit 0
