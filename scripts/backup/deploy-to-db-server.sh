#!/bin/bash
# ============================================================
# PostgreSQL Backup System - Remote Deployment Script
# ============================================================
# Description: Automated deployment of backup system to remote database server
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# Usage: ./deploy-to-db-server.sh --remote-host 46.224.33.191 --remote-user root
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_LOG="/tmp/postgres_backup_deployment_${TIMESTAMP}.log"

# Default values
REMOTE_HOST=""
REMOTE_USER="root"
REMOTE_PORT="22"
REMOTE_DIR="/opt/postgresql-backups"
BACKUP_DIR="/var/backups/postgres"
LOG_DIR="/var/log/postgres-backup"
DRY_RUN=false
SKIP_DEPS=false
SKIP_HETZNER=false
SKIP_CRON=false
SKIP_VALIDATION=false

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME=""
DB_USER="postgres"
DB_PASSWORD=""

# Hetzner configuration
HETZNER_USER=""
HETZNER_HOST=""
HETZNER_PORT="23"
HETZNER_REMOTE_DIR="/backups/postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# FUNCTIONS
# ============================================================

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" | tee -a "$DEPLOYMENT_LOG"

    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy PostgreSQL backup system to remote database server.

REQUIRED OPTIONS:
    --remote-host HOST          Remote database server hostname/IP (e.g., 46.224.33.191)

OPTIONAL OPTIONS:
    --remote-user USER          SSH user (default: root)
    --remote-port PORT          SSH port (default: 22)
    --remote-dir DIR            Remote installation directory (default: /opt/postgresql-backups)
    --backup-dir DIR            Backup storage directory (default: /var/backups/postgres)
    --log-dir DIR               Log directory (default: /var/log/postgres-backup)

    --db-host HOST              PostgreSQL host (default: localhost)
    --db-port PORT              PostgreSQL port (default: 5432)
    --db-name DATABASE          Database name
    --db-user USER              Database user (default: postgres)
    --db-password PASS          Database password

    --hetzner-user USER         Hetzner Storage Box username
    --hetzner-host HOST         Hetzner Storage Box hostname
    --hetzner-port PORT         Hetzner SSH port (default: 23)
    --hetzner-dir DIR           Hetzner remote directory (default: /backups/postgres)

    --dry-run                   Preview changes without executing
    --skip-deps                 Skip dependency installation
    --skip-hetzner              Skip Hetzner setup
    --skip-cron                 Skip cron job configuration
    --skip-validation           Skip post-deployment validation

    -h, --help                  Display this help message

EXAMPLES:
    # Basic deployment
    $0 --remote-host 46.224.33.191 --remote-user root

    # Deployment with database configuration
    $0 --remote-host 46.224.33.191 \\
       --db-name my_database \\
       --db-password 'secure_password'

    # Full deployment with Hetzner
    $0 --remote-host 46.224.33.191 \\
       --db-name my_database \\
       --db-password 'secure_password' \\
       --hetzner-user u123456 \\
       --hetzner-host u123456.your-storagebox.de

    # Dry run to preview changes
    $0 --remote-host 46.224.33.191 --dry-run

PREREQUISITES:
    - SSH access to remote server
    - Root or sudo privileges on remote server
    - PostgreSQL running on remote server
    - Active Hetzner Storage Box (optional)

EOF
    exit 1
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --remote-host)
                REMOTE_HOST="$2"
                shift 2
                ;;
            --remote-user)
                REMOTE_USER="$2"
                shift 2
                ;;
            --remote-port)
                REMOTE_PORT="$2"
                shift 2
                ;;
            --remote-dir)
                REMOTE_DIR="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --log-dir)
                LOG_DIR="$2"
                shift 2
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --hetzner-user)
                HETZNER_USER="$2"
                shift 2
                ;;
            --hetzner-host)
                HETZNER_HOST="$2"
                shift 2
                ;;
            --hetzner-port)
                HETZNER_PORT="$2"
                shift 2
                ;;
            --hetzner-dir)
                HETZNER_REMOTE_DIR="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-hetzner)
                SKIP_HETZNER=true
                shift
                ;;
            --skip-cron)
                SKIP_CRON=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                echo "Unknown option: $1"
                usage
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "$REMOTE_HOST" ]]; then
        echo "ERROR: --remote-host is required"
        usage
    fi
}

# Execute command on remote server
remote_exec() {
    local command=$1
    local description=${2:-"Executing remote command"}

    log "INFO" "$description"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] Would execute: $command"
        return 0
    fi

    if ssh -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "$command"; then
        log "SUCCESS" "$description - completed"
        return 0
    else
        log "ERROR" "$description - failed"
        return 1
    fi
}

# Copy file to remote server
remote_copy() {
    local source=$1
    local destination=$2
    local description=${3:-"Copying file"}

    log "INFO" "$description"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] Would copy: $source -> ${REMOTE_USER}@${REMOTE_HOST}:$destination"
        return 0
    fi

    if rsync -avz --progress -e "ssh -p ${REMOTE_PORT}" "$source" "${REMOTE_USER}@${REMOTE_HOST}:$destination"; then
        log "SUCCESS" "$description - completed"
        return 0
    else
        log "ERROR" "$description - failed"
        return 1
    fi
}

# Validate local environment
validate_local() {
    log "INFO" "Validating local environment..."

    # Check if scripts directory exists
    if [[ ! -d "$SCRIPT_DIR" ]]; then
        log "ERROR" "Scripts directory not found: $SCRIPT_DIR"
        return 1
    fi

    # Check required scripts exist
    local required_scripts=(
        "backup.sh"
        "restore.sh"
        "setup-hetzner.sh"
        "setup-cron.sh"
        "validate-setup.sh"
        "verify-backup.sh"
        "monitor.sh"
    )

    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
            log "ERROR" "Required script not found: $script"
            return 1
        fi
    done

    # Check config example exists
    if [[ ! -f "$SCRIPT_DIR/configs/backup.conf.example" ]] && [[ ! -f "$SCRIPT_DIR/.env.example" ]]; then
        log "WARN" "Configuration example not found"
    fi

    log "SUCCESS" "Local environment validation passed"
    return 0
}

# Test SSH connectivity
test_ssh_connection() {
    log "INFO" "Testing SSH connection to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}..."

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] Would test SSH connection"
        return 0
    fi

    if ssh -p "$REMOTE_PORT" -o ConnectTimeout=10 -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" "echo 'Connection successful'" > /dev/null 2>&1; then
        log "SUCCESS" "SSH connection successful"
        return 0
    else
        log "ERROR" "Cannot connect to remote server via SSH"
        log "INFO" "Please ensure:"
        log "INFO" "  1. SSH access is configured"
        log "INFO" "  2. SSH keys are set up (run: ssh-copy-id ${REMOTE_USER}@${REMOTE_HOST})"
        log "INFO" "  3. Firewall allows SSH on port $REMOTE_PORT"
        return 1
    fi
}

# Detect remote OS
detect_remote_os() {
    log "INFO" "Detecting remote operating system..."

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] Would detect OS"
        echo "ubuntu"
        return 0
    fi

    local os_info=$(ssh -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cat /etc/os-release 2>/dev/null || echo 'unknown'")

    if echo "$os_info" | grep -qi "ubuntu\|debian"; then
        echo "debian"
        log "INFO" "Detected: Debian/Ubuntu"
    elif echo "$os_info" | grep -qi "centos\|rhel\|rocky\|alma"; then
        echo "redhat"
        log "INFO" "Detected: CentOS/RHEL"
    else
        echo "unknown"
        log "WARN" "Unknown OS, will attempt generic installation"
    fi
}

# Install dependencies on remote server
install_dependencies() {
    if [[ "$SKIP_DEPS" == "true" ]]; then
        log "INFO" "Skipping dependency installation (--skip-deps)"
        return 0
    fi

    log "INFO" "Installing dependencies on remote server..."

    local os_type=$(detect_remote_os)

    if [[ "$os_type" == "debian" ]]; then
        remote_exec "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-client rsync gzip cron openssh-client curl" \
            "Installing dependencies (apt)"
    elif [[ "$os_type" == "redhat" ]]; then
        remote_exec "yum install -y postgresql rsync gzip cronie openssh-clients curl" \
            "Installing dependencies (yum)"
    else
        log "WARN" "Unknown OS, please install manually: postgresql-client rsync gzip cron openssh-client curl"
    fi
}

# Create remote directory structure
create_remote_directories() {
    log "INFO" "Creating remote directory structure..."

    remote_exec "mkdir -p $REMOTE_DIR $BACKUP_DIR $LOG_DIR $REMOTE_DIR/configs $REMOTE_DIR/logs" \
        "Creating directories"

    remote_exec "chmod 700 $REMOTE_DIR $BACKUP_DIR" \
        "Setting directory permissions"
}

# Copy scripts to remote server
copy_scripts() {
    log "INFO" "Copying scripts to remote server..."

    # Copy all scripts
    remote_copy "$SCRIPT_DIR/" "$REMOTE_DIR/" \
        "Copying backup scripts"

    # Set execute permissions
    remote_exec "chmod 700 $REMOTE_DIR/*.sh" \
        "Setting script permissions"

    remote_exec "chmod 600 $REMOTE_DIR/configs/* 2>/dev/null || true" \
        "Setting config permissions"
}

# Generate remote configuration
generate_remote_config() {
    log "INFO" "Generating remote configuration..."

    # Prompt for missing values if not provided
    if [[ -z "$DB_NAME" ]]; then
        read -p "Enter PostgreSQL database name: " DB_NAME
    fi

    if [[ -z "$DB_PASSWORD" ]]; then
        read -sp "Enter PostgreSQL password for user $DB_USER: " DB_PASSWORD
        echo
    fi

    # Create configuration file content
    local config_content=$(cat << EOF
# ============================================================
# PostgreSQL Backup Configuration
# ============================================================
# Generated by deploy-to-db-server.sh
# Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# ============================================================
# PostgreSQL Connection Settings
# ============================================================
# IMPORTANT: Using localhost because script runs ON the database server
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"

# ============================================================
# Backup Settings
# ============================================================
BACKUP_DIR="$BACKUP_DIR"
LOG_DIR="$LOG_DIR"
LOG_FILE="\${LOG_DIR}/backup.log"
BACKUP_PREFIX="postgres_backup"

# Use custom format for faster backups and better compression
USE_CUSTOM_FORMAT=true
COMPRESSION_LEVEL=9
PARALLEL_JOBS=2

# Additional pg_dump options
PGDUMP_OPTIONS="--verbose --no-owner --no-acl"

# ============================================================
# Retention Settings
# ============================================================
RETENTION_DAYS=30
MAX_LOCAL_BACKUPS=14

# ============================================================
# Hetzner Storage Box Settings
# ============================================================
HETZNER_ENABLED=false
HETZNER_USER="$HETZNER_USER"
HETZNER_HOST="$HETZNER_HOST"
HETZNER_PORT=$HETZNER_PORT
HETZNER_REMOTE_DIR="$HETZNER_REMOTE_DIR"
HETZNER_SSH_KEY="/root/.ssh/id_rsa_hetzner_backup"
HETZNER_RETENTION_DAYS=90

# ============================================================
# Advanced Settings
# ============================================================
RUN_VACUUM=false
VERIFY_BACKUP=true
BACKUP_TIMEOUT=3600
SCHEMA_ONLY_BACKUP=true
MAX_LOG_SIZE=100

# ============================================================
# Notification Settings
# ============================================================
NOTIFICATIONS_ENABLED=false
NOTIFICATION_METHOD="email"
NOTIFY_EMAIL=""
EMAIL_FROM="backup@$(hostname)"
EMAIL_SUBJECT_SUCCESS="PostgreSQL Backup Successful"
EMAIL_SUBJECT_FAILURE="PostgreSQL Backup Failed"

WEBHOOK_ENABLED=false
WEBHOOK_URL=""

SLACK_ENABLED=false
SLACK_WEBHOOK_URL=""

HEALTHCHECK_ENABLED=false
HEALTHCHECK_URL=""
EOF
)

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] Would create config file:"
        echo "$config_content"
        return 0
    fi

    # Write config to temporary file
    local temp_config="/tmp/backup.conf.$$"
    echo "$config_content" > "$temp_config"

    # Copy to remote server
    remote_copy "$temp_config" "$REMOTE_DIR/configs/backup.conf" \
        "Uploading configuration file"

    # Clean up
    rm -f "$temp_config"

    # Set permissions
    remote_exec "chmod 600 $REMOTE_DIR/configs/backup.conf" \
        "Setting config file permissions"
}

# Setup Hetzner on remote server
setup_hetzner_remote() {
    if [[ "$SKIP_HETZNER" == "true" ]]; then
        log "INFO" "Skipping Hetzner setup (--skip-hetzner)"
        return 0
    fi

    if [[ -z "$HETZNER_USER" ]] || [[ -z "$HETZNER_HOST" ]]; then
        log "WARN" "Hetzner credentials not provided, skipping Hetzner setup"
        log "INFO" "You can configure Hetzner later by running: $REMOTE_DIR/setup-hetzner.sh --setup"
        return 0
    fi

    log "INFO" "Setting up Hetzner Storage Box on remote server..."

    # Enable Hetzner in config
    remote_exec "sed -i 's/^HETZNER_ENABLED=.*/HETZNER_ENABLED=true/' $REMOTE_DIR/configs/backup.conf" \
        "Enabling Hetzner in configuration"

    # Generate SSH key
    remote_exec "cd $REMOTE_DIR && ./setup-hetzner.sh --generate-key" \
        "Generating SSH key for Hetzner"

    # Display public key
    log "INFO" "=========================================="
    log "INFO" "IMPORTANT: Add this public key to Hetzner Robot panel"
    log "INFO" "=========================================="

    if [[ "$DRY_RUN" == "false" ]]; then
        ssh -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cat /root/.ssh/id_rsa_hetzner_backup.pub"
    else
        echo "[DRY-RUN] Would display public key"
    fi

    log "INFO" "=========================================="
    log "INFO" "Steps to add key to Hetzner:"
    log "INFO" "1. Login to https://robot.hetzner.com/"
    log "INFO" "2. Navigate to your Storage Box"
    log "INFO" "3. Enable SSH/SFTP access"
    log "INFO" "4. Add the public key shown above"
    log "INFO" "5. Run: ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd $REMOTE_DIR && ./setup-hetzner.sh --test'"
    log "INFO" "=========================================="
}

# Setup cron job on remote server
setup_cron_remote() {
    if [[ "$SKIP_CRON" == "true" ]]; then
        log "INFO" "Skipping cron setup (--skip-cron)"
        return 0
    fi

    log "INFO" "Setting up cron job on remote server..."

    # Run setup-cron.sh on remote server
    remote_exec "cd $REMOTE_DIR && ./setup-cron.sh --auto" \
        "Configuring cron job"

    log "SUCCESS" "Cron job configured (default: 2 AM daily)"
}

# Validate remote installation
validate_remote() {
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log "INFO" "Skipping validation (--skip-validation)"
        return 0
    fi

    log "INFO" "Validating remote installation..."

    # Test PostgreSQL connection
    log "INFO" "Testing PostgreSQL connection..."
    if remote_exec "cd $REMOTE_DIR && PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT 1' > /dev/null 2>&1" \
        "Testing database connection"; then
        log "SUCCESS" "PostgreSQL connection successful"
    else
        log "ERROR" "PostgreSQL connection failed"
        log "INFO" "Please verify database credentials in $REMOTE_DIR/configs/backup.conf"
        return 1
    fi

    # Run validation script
    remote_exec "cd $REMOTE_DIR && ./validate-setup.sh" \
        "Running validation script"

    # Test backup (optional)
    read -p "Run test backup? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy]es$ ]]; then
        log "INFO" "Running test backup..."
        remote_exec "cd $REMOTE_DIR && ./backup.sh" \
            "Executing test backup"

        log "INFO" "Checking backup files..."
        remote_exec "ls -lh $BACKUP_DIR/" \
            "Listing backup files"
    fi
}

# Display deployment summary
show_summary() {
    echo ""
    echo "============================================================"
    echo "DEPLOYMENT SUMMARY"
    echo "============================================================"
    echo ""
    echo "Remote Server:       ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}"
    echo "Installation Dir:    $REMOTE_DIR"
    echo "Backup Directory:    $BACKUP_DIR"
    echo "Log Directory:       $LOG_DIR"
    echo ""
    echo "Database:"
    echo "  Host:              $DB_HOST"
    echo "  Port:              $DB_PORT"
    echo "  Database:          $DB_NAME"
    echo "  User:              $DB_USER"
    echo ""
    echo "Hetzner Storage Box:"
    if [[ -n "$HETZNER_USER" ]] && [[ -n "$HETZNER_HOST" ]]; then
        echo "  Status:            Configured"
        echo "  User:              $HETZNER_USER"
        echo "  Host:              $HETZNER_HOST"
        echo "  Remote Dir:        $HETZNER_REMOTE_DIR"
    else
        echo "  Status:            Not configured"
    fi
    echo ""
    echo "Deployment Log:      $DEPLOYMENT_LOG"
    echo ""
    echo "============================================================"
    echo "NEXT STEPS"
    echo "============================================================"
    echo ""
    echo "1. Verify configuration:"
    echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat $REMOTE_DIR/configs/backup.conf'"
    echo ""
    echo "2. Test backup manually:"
    echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd $REMOTE_DIR && ./backup.sh'"
    echo ""
    echo "3. Monitor backup logs:"
    echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'tail -f $LOG_DIR/backup.log'"
    echo ""
    echo "4. Check cron job status:"
    echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'crontab -l'"
    echo ""

    if [[ -n "$HETZNER_USER" ]] && [[ -n "$HETZNER_HOST" ]]; then
        echo "5. Configure Hetzner (add public key to Robot panel):"
        echo "   - Login to https://robot.hetzner.com/"
        echo "   - Add the SSH public key displayed above"
        echo "   - Test: ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd $REMOTE_DIR && ./setup-hetzner.sh --test'"
        echo ""
    fi

    echo "6. Monitor system:"
    echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd $REMOTE_DIR && ./monitor.sh'"
    echo ""
    echo "For troubleshooting, see:"
    echo "  /Users/josegomez/Documents/Code/SaaS/Copilot/docs/HETZNER_REMOTE_DEPLOYMENT.md"
    echo ""
    echo "============================================================"
}

# Main deployment flow
main() {
    echo "============================================================"
    echo "PostgreSQL Backup System - Remote Deployment"
    echo "============================================================"
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN MODE] No changes will be made"
        echo ""
    fi

    # Validate local environment
    if ! validate_local; then
        log "ERROR" "Local validation failed"
        exit 1
    fi

    # Test SSH connection
    if ! test_ssh_connection; then
        log "ERROR" "SSH connection failed"
        exit 1
    fi

    # Show deployment plan
    echo ""
    echo "Deployment Configuration:"
    echo "  Remote Host:     $REMOTE_HOST"
    echo "  Remote User:     $REMOTE_USER"
    echo "  Remote Port:     $REMOTE_PORT"
    echo "  Install Dir:     $REMOTE_DIR"
    echo "  Backup Dir:      $BACKUP_DIR"
    echo "  Database Host:   $DB_HOST"
    echo "  Database Port:   $DB_PORT"
    echo ""

    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "Proceed with deployment? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
            log "INFO" "Deployment cancelled"
            exit 0
        fi
    fi

    echo ""
    log "INFO" "Starting deployment..."
    echo ""

    # Execute deployment steps
    install_dependencies
    create_remote_directories
    copy_scripts
    generate_remote_config
    setup_hetzner_remote
    setup_cron_remote
    validate_remote

    echo ""
    log "SUCCESS" "Deployment completed successfully!"
    echo ""

    # Show summary
    show_summary

    # Save log location
    log "INFO" "Full deployment log saved to: $DEPLOYMENT_LOG"
}

# ============================================================
# SCRIPT ENTRY POINT
# ============================================================

# Parse arguments
parse_args "$@"

# Run main deployment
main

exit 0
