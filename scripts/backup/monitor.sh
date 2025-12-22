#!/bin/bash
# ============================================================
# PostgreSQL Backup Monitoring Dashboard
# ============================================================
# Description: Real-time monitoring and status dashboard
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
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ============================================================
# FUNCTIONS
# ============================================================

# Source configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Print colored status
print_status() {
    local status=$1
    local message=$2

    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Print section header
print_section() {
    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}$1${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check database connection
check_database_connection() {
    export PGPASSWORD="$DB_PASSWORD"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
        print_status "OK" "Database connection: ${BOLD}${GREEN}Online${NC} (Size: $db_size)"
        return 0
    else
        print_status "ERROR" "Database connection: ${BOLD}${RED}Failed${NC}"
        return 1
    fi
}

# Check backup status
check_backup_status() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_status "ERROR" "Backup directory not found: $BACKUP_DIR"
        return 1
    fi

    local total_backups=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f 2>/dev/null | wc -l)

    if [[ $total_backups -eq 0 ]]; then
        print_status "WARN" "No backups found in $BACKUP_DIR"
        return 1
    fi

    local latest_backup=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

    if [[ -n "$latest_backup" ]]; then
        local backup_age=$(( ($(date +%s) - $(stat -f %m "$latest_backup" 2>/dev/null || stat -c %Y "$latest_backup")) / 3600 ))
        local backup_size=$(du -h "$latest_backup" | cut -f1)
        local backup_name=$(basename "$latest_backup")

        if [[ $backup_age -lt 24 ]]; then
            print_status "OK" "Latest backup: ${BOLD}$backup_name${NC} (${backup_age}h ago, $backup_size)"
        elif [[ $backup_age -lt 48 ]]; then
            print_status "WARN" "Latest backup: ${BOLD}$backup_name${NC} (${backup_age}h ago, $backup_size)"
        else
            print_status "ERROR" "Latest backup: ${BOLD}$backup_name${NC} (${backup_age}h ago, $backup_size)"
        fi
    fi

    print_status "INFO" "Total backups: ${BOLD}$total_backups${NC}"

    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    print_status "INFO" "Total size: ${BOLD}$total_size${NC}"
}

# Check disk space
check_disk_space() {
    local usage=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
    local available=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')

    if [[ $usage -lt 80 ]]; then
        print_status "OK" "Disk usage: ${BOLD}${usage}%${NC} (${available} available)"
    elif [[ $usage -lt 90 ]]; then
        print_status "WARN" "Disk usage: ${BOLD}${usage}%${NC} (${available} available)"
    else
        print_status "ERROR" "Disk usage: ${BOLD}${usage}%${NC} (${available} available) - Critical!"
    fi
}

# Check Hetzner connection
check_hetzner_connection() {
    if [[ "$HETZNER_ENABLED" != "true" ]]; then
        print_status "INFO" "Hetzner Storage Box: Disabled"
        return 0
    fi

    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        print_status "WARN" "Hetzner Storage Box: Not configured"
        return 0
    fi

    if [[ ! -f "$HETZNER_SSH_KEY" ]]; then
        print_status "WARN" "Hetzner SSH key not found: $HETZNER_SSH_KEY"
        return 0
    fi

    if ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
        "${HETZNER_USER}@${HETZNER_HOST}" "echo 'test'" > /dev/null 2>&1; then

        local remote_backups=$(ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no \
            "${HETZNER_USER}@${HETZNER_HOST}" \
            "ls ${HETZNER_REMOTE_DIR}/${BACKUP_PREFIX}_*.gz 2>/dev/null | wc -l" || echo "0")

        print_status "OK" "Hetzner Storage Box: ${BOLD}${GREEN}Connected${NC} ($remote_backups remote backups)"
    else
        print_status "ERROR" "Hetzner Storage Box: ${BOLD}${RED}Connection failed${NC}"
    fi
}

# Check cron jobs
check_cron_jobs() {
    if crontab -l 2>/dev/null | grep -q "${SCRIPT_DIR}/backup.sh"; then
        local schedule=$(crontab -l | grep "${SCRIPT_DIR}/backup.sh" | awk '{print $1, $2, $3, $4, $5}')
        print_status "OK" "Cron automation: ${BOLD}${GREEN}Installed${NC} (Schedule: $schedule)"
    else
        print_status "WARN" "Cron automation: ${BOLD}${YELLOW}Not installed${NC}"
    fi
}

# Check recent logs
check_recent_logs() {
    local log_file=$(find "$LOG_DIR" -name "backup_*.log" -type f | sort -r | head -1)

    if [[ -z "$log_file" ]]; then
        print_status "WARN" "No log files found"
        return 0
    fi

    local errors=$(grep -c ERROR "$log_file" 2>/dev/null || echo "0")
    local warnings=$(grep -c WARN "$log_file" 2>/dev/null || echo "0")

    if [[ $errors -eq 0 ]]; then
        print_status "OK" "Recent logs: ${BOLD}${GREEN}No errors${NC}"
    else
        print_status "ERROR" "Recent logs: ${BOLD}${errors} errors${NC}, $warnings warnings"
    fi

    # Show last 5 log entries
    echo ""
    echo -e "${CYAN}Last 5 log entries:${NC}"
    tail -5 "$log_file" 2>/dev/null | while read line; do
        if echo "$line" | grep -q ERROR; then
            echo -e "${RED}$line${NC}"
        elif echo "$line" | grep -q WARN; then
            echo -e "${YELLOW}$line${NC}"
        else
            echo "$line"
        fi
    done
}

# Show backup timeline
show_backup_timeline() {
    local backups=($(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -10 | cut -d' ' -f2-))

    if [[ ${#backups[@]} -eq 0 ]]; then
        echo "No backups found"
        return
    fi

    echo ""
    printf "%-30s %-12s %-20s\n" "Backup" "Size" "Date"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$backup" 2>/dev/null || stat -c "%y" "$backup" | cut -d. -f1)

        printf "%-30s %-12s %-20s\n" "$filename" "$size" "$date"
    done
}

# Show system overview
show_overview() {
    clear

    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║               PostgreSQL Backup Monitoring Dashboard                 ║
║               Cloud Governance Copilot                                ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF

    echo -e "${CYAN}Last updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"

    print_section "DATABASE STATUS"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Database: $DB_NAME"
    echo ""
    check_database_connection

    print_section "BACKUP STATUS"
    echo "Backup directory: $BACKUP_DIR"
    echo "Retention: $RETENTION_DAYS days (max $MAX_LOCAL_BACKUPS backups)"
    echo ""
    check_backup_status

    print_section "STORAGE"
    check_disk_space

    print_section "REMOTE BACKUP"
    check_hetzner_connection

    print_section "AUTOMATION"
    check_cron_jobs

    print_section "LOG ANALYSIS"
    check_recent_logs

    print_section "BACKUP TIMELINE"
    show_backup_timeline

    print_section "QUICK ACTIONS"
    echo ""
    echo "  ${BOLD}1.${NC} Run backup now:       ./backup.sh"
    echo "  ${BOLD}2.${NC} List backups:          ./restore.sh --list"
    echo "  ${BOLD}3.${NC} Verify backups:        ./verify-backup.sh --all"
    echo "  ${BOLD}4.${NC} Health report:         ./verify-backup.sh --report"
    echo "  ${BOLD}5.${NC} Test Hetzner:          ./setup-hetzner.sh --test"
    echo "  ${BOLD}6.${NC} View logs:             tail -f logs/backup_\$(date +%Y%m).log"
    echo ""
}

# Watch mode (refresh every N seconds)
watch_mode() {
    local interval=${1:-30}

    while true; do
        show_overview
        echo ""
        echo -e "${CYAN}Refreshing in ${interval}s... (Press Ctrl+C to exit)${NC}"
        sleep $interval
    done
}

# Show alerts only
show_alerts() {
    local alerts=()

    # Check database
    export PGPASSWORD="$DB_PASSWORD"
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        alerts+=("Database connection failed!")
    fi

    # Check backup age
    local latest_backup=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    if [[ -n "$latest_backup" ]]; then
        local backup_age=$(( ($(date +%s) - $(stat -f %m "$latest_backup" 2>/dev/null || stat -c %Y "$latest_backup")) / 3600 ))
        if [[ $backup_age -gt 48 ]]; then
            alerts+=("Latest backup is older than 48 hours!")
        fi
    else
        alerts+=("No backups found!")
    fi

    # Check disk space
    local usage=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
    if [[ $usage -gt 90 ]]; then
        alerts+=("Disk usage critical: ${usage}%")
    fi

    # Check logs for errors
    local log_file=$(find "$LOG_DIR" -name "backup_*.log" -type f | sort -r | head -1)
    if [[ -n "$log_file" ]]; then
        local errors=$(grep -c ERROR "$log_file" 2>/dev/null || echo "0")
        if [[ $errors -gt 0 ]]; then
            alerts+=("$errors errors in recent logs")
        fi
    fi

    # Print alerts
    if [[ ${#alerts[@]} -gt 0 ]]; then
        echo -e "${RED}${BOLD}⚠ ALERTS DETECTED ⚠${NC}"
        echo ""
        for alert in "${alerts[@]}"; do
            echo -e "${RED}✗${NC} $alert"
        done
        echo ""
        exit 1
    else
        echo -e "${GREEN}${BOLD}✓ All systems operational${NC}"
        exit 0
    fi
}

# ============================================================
# MAIN EXECUTION
# ============================================================

case "${1:-overview}" in
    overview)
        show_overview
        ;;
    watch)
        watch_mode ${2:-30}
        ;;
    alerts)
        show_alerts
        ;;
    timeline)
        print_section "BACKUP TIMELINE"
        show_backup_timeline
        ;;
    -h|--help)
        cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

PostgreSQL Backup Monitoring Dashboard

COMMANDS:
    overview        Show complete system overview (default)
    watch [N]       Auto-refresh overview every N seconds (default: 30)
    alerts          Show only critical alerts (useful for monitoring)
    timeline        Show backup timeline
    -h, --help      Show this help message

EXAMPLES:
    # Show overview
    $0

    # Watch mode with 60s refresh
    $0 watch 60

    # Check for alerts (exit code 1 if alerts found)
    $0 alerts

EOF
        exit 0
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run '$0 --help' for usage information"
        exit 1
        ;;
esac

exit 0
