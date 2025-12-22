#!/bin/bash
# ============================================================
# Quick Install - Hetzner Storage Box Backup System
# ============================================================
# One-command setup for PostgreSQL backups to Hetzner
# ============================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

clear

cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Hetzner Storage Box - PostgreSQL Backup System            ║
║   Quick Installation Wizard                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

This wizard will help you set up automated PostgreSQL backups
to Hetzner Storage Box in just a few minutes.

EOF

echo -e "${YELLOW}Press Enter to continue...${NC}"
read

# ============================================================
# Step 1: Prerequisites Check
# ============================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Checking Prerequisites${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

missing_deps=()

for cmd in ssh ssh-keygen sftp pg_dump gzip; do
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $cmd found"
    else
        echo -e "${RED}✗${NC} $cmd not found"
        missing_deps+=("$cmd")
    fi
done

if [[ ${#missing_deps[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}Missing dependencies: ${missing_deps[*]}${NC}"
    echo ""
    echo "Install with:"
    echo "  Ubuntu/Debian: sudo apt-get install openssh-client postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ All prerequisites met${NC}"
sleep 1

# ============================================================
# Step 2: Hetzner Storage Box Information
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Hetzner Storage Box Credentials${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Do you have a Hetzner Storage Box?"
echo "  - If yes, continue"
echo "  - If no, visit: https://robot.hetzner.com/storage"
echo ""
read -p "Continue? (yes/no): " has_storagebox

if [[ "${has_storagebox}" != "yes" ]]; then
    echo ""
    echo "Please order a Storage Box first:"
    echo "  1. Go to https://robot.hetzner.com/"
    echo "  2. Navigate to 'Storage Boxes'"
    echo "  3. Order a Storage Box (recommended: BX20 - 500GB)"
    echo "  4. Re-run this script after receiving credentials"
    exit 0
fi

echo ""
read -p "Storage Box Username (e.g., u123456): " STORAGEBOX_USER
read -p "Storage Box Hostname (e.g., u123456.your-storagebox.de): " STORAGEBOX_HOST
read -p "SSH Port [default: 23]: " STORAGEBOX_PORT
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"

# ============================================================
# Step 3: PostgreSQL Configuration
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 3: PostgreSQL Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "PostgreSQL Host [default: localhost]: " DB_HOST
DB_HOST="${DB_HOST:-localhost}"

read -p "PostgreSQL Port [default: 5432]: " DB_PORT
DB_PORT="${DB_PORT:-5432}"

read -p "Database Name [default: copilot_main]: " DB_NAME
DB_NAME="${DB_NAME:-copilot_main}"

read -p "PostgreSQL User [default: copilot]: " DB_USER
DB_USER="${DB_USER:-copilot}"

read -sp "PostgreSQL Password: " DB_PASSWORD
echo ""

# ============================================================
# Step 4: Backup Configuration
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Backup Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Retention Days [default: 30]: " RETENTION_DAYS
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo ""
echo "Backup Frequency Options:"
echo "  1) Daily at 2:00 AM (recommended)"
echo "  2) Every 6 hours"
echo "  3) Twice daily (2:00 AM and 2:00 PM)"
echo "  4) Weekly (Sundays at 2:00 AM)"
echo ""
read -p "Select option (1-4) [default: 1]: " BACKUP_FREQ
BACKUP_FREQ="${BACKUP_FREQ:-1}"

# ============================================================
# Step 5: SSH Key Generation
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 5: SSH Key Generation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SSH_KEY_PATH="$HOME/.ssh/hetzner_storagebox_rsa"

if [[ -f "${SSH_KEY_PATH}" ]]; then
    echo -e "${YELLOW}SSH key already exists: ${SSH_KEY_PATH}${NC}"
    read -p "Use existing key? (yes/no): " use_existing
    if [[ "${use_existing}" != "yes" ]]; then
        mv "${SSH_KEY_PATH}" "${SSH_KEY_PATH}.backup.$(date +%s)"
        echo "Backed up existing key"
        ssh-keygen -t rsa -b 4096 -f "${SSH_KEY_PATH}" -N "" -C "hetzner-storagebox-backup"
    fi
else
    echo "Generating new SSH key..."
    ssh-keygen -t rsa -b 4096 -f "${SSH_KEY_PATH}" -N "" -C "hetzner-storagebox-backup"
fi

chmod 600 "${SSH_KEY_PATH}"
chmod 644 "${SSH_KEY_PATH}.pub"

echo ""
echo -e "${GREEN}✓ SSH key ready${NC}"

# ============================================================
# Step 6: Create Configuration File
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 6: Creating Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ENV_FILE="${PROJECT_DIR}/.env.storagebox"

cat > "${ENV_FILE}" <<EOF
# Hetzner Storage Box Configuration
# Generated: $(date)

# Storage Box Credentials
export STORAGEBOX_USER="${STORAGEBOX_USER}"
export STORAGEBOX_HOST="${STORAGEBOX_HOST}"
export STORAGEBOX_PORT="${STORAGEBOX_PORT}"
export STORAGEBOX_SSH_KEY="${SSH_KEY_PATH}"
export STORAGEBOX_REMOTE_DIR="/backups/postgresql"

# PostgreSQL Configuration
export DB_HOST="${DB_HOST}"
export DB_PORT="${DB_PORT}"
export DB_NAME="${DB_NAME}"
export DB_USER="${DB_USER}"
export DB_PASSWORD="${DB_PASSWORD}"

# Backup Configuration
export LOCAL_BACKUP_DIR="/tmp/postgres-backups"
export RETENTION_DAYS="${RETENTION_DAYS}"
export LOG_FILE="/var/log/hetzner-backup.log"

# Optional: Slack Notifications
export ENABLE_SLACK_NOTIFICATIONS="false"
export SLACK_WEBHOOK_URL=""
EOF

chmod 600 "${ENV_FILE}"

echo -e "${GREEN}✓ Configuration saved to: ${ENV_FILE}${NC}"

# ============================================================
# Step 7: Display SSH Public Key
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 7: Add SSH Key to Hetzner Robot${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Copy the following SSH public key:"
echo ""
cat "${SSH_KEY_PATH}.pub"
echo ""
echo ""
echo "Then:"
echo "  1. Go to: https://robot.hetzner.com/storage"
echo "  2. Select your Storage Box"
echo "  3. Click 'Settings' → 'SSH Keys'"
echo "  4. Click 'Add SSH key'"
echo "  5. Paste the public key above"
echo "  6. Save"
echo "  7. Enable 'SSH support' in Settings"
echo ""
read -p "Press Enter when you have added the SSH key..."

# ============================================================
# Step 8: Test Connection
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 8: Testing Connection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Testing SSH connection to Storage Box..."

if ssh -p "${STORAGEBOX_PORT}" \
       -i "${SSH_KEY_PATH}" \
       -o ConnectTimeout=10 \
       -o StrictHostKeyChecking=no \
       -o UserKnownHostsFile=/dev/null \
       -q \
       "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
       "echo 'Connection successful'" &>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful!${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify SSH key was added correctly in Robot"
    echo "  2. Check that 'SSH support' is enabled"
    echo "  3. Wait a few minutes for changes to propagate"
    echo "  4. Try manual connection:"
    echo "     ssh -p ${STORAGEBOX_PORT} -i ${SSH_KEY_PATH} ${STORAGEBOX_USER}@${STORAGEBOX_HOST}"
    exit 1
fi

# ============================================================
# Step 9: Create Remote Directories
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 9: Creating Remote Directories${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sftp -P "${STORAGEBOX_PORT}" \
     -i "${SSH_KEY_PATH}" \
     -o StrictHostKeyChecking=no \
     -o UserKnownHostsFile=/dev/null \
     "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF &>/dev/null
-mkdir backups
-mkdir backups/postgresql
-mkdir backups/postgresql/manual
bye
EOF

echo -e "${GREEN}✓ Remote directories created${NC}"

# ============================================================
# Step 10: Run Test Backup
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 10: Running Test Backup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Run test backup now? (yes/no): " run_test
if [[ "${run_test}" == "yes" ]]; then
    echo ""
    echo "Running backup..."
    source "${ENV_FILE}"
    if "${SCRIPT_DIR}/hetzner-storagebox-backup.sh"; then
        echo ""
        echo -e "${GREEN}✓ Test backup completed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Test backup failed${NC}"
        echo "Check logs: tail -f /var/log/hetzner-backup.log"
    fi
fi

# ============================================================
# Step 11: Setup Automation
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 11: Setting Up Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "${BACKUP_FREQ}" in
    1) CRON_EXPR="0 2 * * *" ;;
    2) CRON_EXPR="0 */6 * * *" ;;
    3) CRON_EXPR="0 2,14 * * *" ;;
    4) CRON_EXPR="0 2 * * 0" ;;
esac

read -p "Setup automated backups with cron? (yes/no): " setup_cron
if [[ "${setup_cron}" == "yes" ]]; then
    # Create wrapper script
    WRAPPER_SCRIPT="/tmp/hetzner-backup-wrapper.sh"
    cat > "${WRAPPER_SCRIPT}" <<WRAPPER_EOF
#!/bin/bash
set -a
source "${ENV_FILE}"
set +a
"${SCRIPT_DIR}/hetzner-storagebox-backup.sh" >> /var/log/hetzner-backup-cron.log 2>&1
WRAPPER_EOF
    chmod +x "${WRAPPER_SCRIPT}"

    # Add to crontab
    (crontab -l 2>/dev/null | grep -v hetzner-storagebox-backup; echo "${CRON_EXPR} ${WRAPPER_SCRIPT}  # Hetzner Storage Box PostgreSQL Backup") | crontab -

    echo -e "${GREEN}✓ Cron job added${NC}"
    echo ""
    echo "Schedule: $(echo "${CRON_EXPR}" | awk '{print $1, $2, $3, $4, $5}')"
fi

# ============================================================
# Final Summary
# ============================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat <<SUMMARY
Configuration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Storage Box:     ${STORAGEBOX_USER}@${STORAGEBOX_HOST}
Database:        ${DB_NAME}@${DB_HOST}
Retention:       ${RETENTION_DAYS} days
Configuration:   ${ENV_FILE}
SSH Key:         ${SSH_KEY_PATH}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:

1. Run manual backup:
   source ${ENV_FILE}
   ${SCRIPT_DIR}/hetzner-storagebox-backup.sh

2. Verify backups:
   ${SCRIPT_DIR}/verify-hetzner-backups.sh

3. View logs:
   tail -f /var/log/hetzner-backup.log

4. Test restore (on development):
   ${SCRIPT_DIR}/hetzner-storagebox-restore.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documentation:
  - Quick Start:  ${PROJECT_DIR}/docs/HETZNER_QUICKSTART.md
  - Full Guide:   ${PROJECT_DIR}/docs/HETZNER_STORAGEBOX_BACKUP_GUIDE.md
  - Summary:      ${PROJECT_DIR}/HETZNER_BACKUP_SETUP_SUMMARY.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY

echo ""
echo -e "${GREEN}Your PostgreSQL backup system is now configured!${NC}"
echo ""
