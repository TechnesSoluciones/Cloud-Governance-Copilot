#!/bin/bash
# ============================================================
# Hetzner Storage Box - Initial Setup Script
# ============================================================
# Configure SSH key authentication and test connection
# ============================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================
# Configuration
# ============================================================

STORAGEBOX_USER="${STORAGEBOX_USER:-}"
STORAGEBOX_HOST="${STORAGEBOX_HOST:-}"
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
SSH_KEY_PATH="${STORAGEBOX_SSH_KEY:-$HOME/.ssh/hetzner_storagebox_rsa}"

# ============================================================
# Functions
# ============================================================

print_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

print_header() {
    echo ""
    echo "============================================================"
    echo "$*"
    echo "============================================================"
    echo ""
}

check_dependencies() {
    print_info "Checking dependencies..."

    local missing_deps=()

    for cmd in ssh ssh-keygen sftp ssh-copy-id; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Install with: apt-get install openssh-client"
        exit 1
    fi

    print_info "All dependencies found"
}

get_storagebox_credentials() {
    print_header "Hetzner Storage Box Credentials"

    if [[ -z "${STORAGEBOX_USER}" ]]; then
        echo -n "Enter Storage Box username (e.g., u123456): "
        read STORAGEBOX_USER
    fi

    if [[ -z "${STORAGEBOX_HOST}" ]]; then
        echo -n "Enter Storage Box hostname (e.g., u123456.your-storagebox.de): "
        read STORAGEBOX_HOST
    fi

    echo -n "Enter Storage Box SSH port [default: 23]: "
    read user_port
    if [[ -n "${user_port}" ]]; then
        STORAGEBOX_PORT="${user_port}"
    fi

    print_info "Credentials:"
    echo "  User: ${STORAGEBOX_USER}"
    echo "  Host: ${STORAGEBOX_HOST}"
    echo "  Port: ${STORAGEBOX_PORT}"
}

generate_ssh_key() {
    print_header "SSH Key Generation"

    if [[ -f "${SSH_KEY_PATH}" ]]; then
        print_warning "SSH key already exists: ${SSH_KEY_PATH}"
        echo -n "Do you want to generate a new key? (yes/no): "
        read response
        if [[ "${response}" != "yes" ]]; then
            print_info "Using existing SSH key"
            return 0
        fi
        # Backup existing key
        mv "${SSH_KEY_PATH}" "${SSH_KEY_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backed up existing key"
    fi

    print_info "Generating new SSH key..."

    ssh-keygen -t rsa \
               -b 4096 \
               -f "${SSH_KEY_PATH}" \
               -N "" \
               -C "hetzner-storagebox-backup"

    if [[ $? -eq 0 ]]; then
        chmod 600 "${SSH_KEY_PATH}"
        chmod 644 "${SSH_KEY_PATH}.pub"
        print_info "SSH key generated: ${SSH_KEY_PATH}"
    else
        print_error "Failed to generate SSH key"
        exit 1
    fi
}

display_public_key() {
    print_header "Public SSH Key"

    print_info "Copy the following public key:"
    echo ""
    cat "${SSH_KEY_PATH}.pub"
    echo ""
}

configure_storagebox() {
    print_header "Configure Hetzner Storage Box"

    echo "To enable SSH key authentication on your Hetzner Storage Box:"
    echo ""
    echo "1. Log in to Hetzner Robot: https://robot.hetzner.com/"
    echo "2. Navigate to 'Storage Boxes' in the menu"
    echo "3. Select your Storage Box"
    echo "4. Go to 'SSH-Keys' tab"
    echo "5. Click 'Add SSH key' and paste the public key above"
    echo "6. Enable 'SSH support' if not already enabled"
    echo "7. (Optional) Enable 'Samba/CIFS' for Windows access"
    echo ""
    echo -n "Press Enter when you have added the SSH key..."
    read
}

test_ssh_connection() {
    print_header "Testing SSH Connection"

    print_info "Testing connection to ${STORAGEBOX_USER}@${STORAGEBOX_HOST}:${STORAGEBOX_PORT}..."

    if ssh -p "${STORAGEBOX_PORT}" \
           -i "${SSH_KEY_PATH}" \
           -o ConnectTimeout=10 \
           -o StrictHostKeyChecking=no \
           -o UserKnownHostsFile=/dev/null \
           "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
           "echo 'Connection successful'" 2>/dev/null; then
        print_info "SSH connection successful!"
    else
        print_error "SSH connection failed"
        print_info "Troubleshooting steps:"
        echo "  1. Verify the SSH key was added correctly in Robot"
        echo "  2. Check that SSH support is enabled"
        echo "  3. Verify credentials are correct"
        echo "  4. Try manual connection: ssh -p ${STORAGEBOX_PORT} -i ${SSH_KEY_PATH} ${STORAGEBOX_USER}@${STORAGEBOX_HOST}"
        exit 1
    fi
}

create_remote_directories() {
    print_header "Creating Remote Directories"

    print_info "Creating backup directory structure..."

    sftp -P "${STORAGEBOX_PORT}" \
         -i "${SSH_KEY_PATH}" \
         -o StrictHostKeyChecking=no \
         -o UserKnownHostsFile=/dev/null \
         "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
-mkdir backups
-mkdir backups/postgresql
-mkdir backups/postgresql/manual
bye
EOF

    print_info "Remote directories created"
}

save_environment_variables() {
    print_header "Save Configuration"

    local env_file=".env.storagebox"

    cat > "${env_file}" <<EOF
# Hetzner Storage Box Configuration
# Generated: $(date)

# Storage Box Credentials
export STORAGEBOX_USER="${STORAGEBOX_USER}"
export STORAGEBOX_HOST="${STORAGEBOX_HOST}"
export STORAGEBOX_PORT="${STORAGEBOX_PORT}"
export STORAGEBOX_SSH_KEY="${SSH_KEY_PATH}"
export STORAGEBOX_REMOTE_DIR="/backups/postgresql"

# Backup Configuration
export LOCAL_BACKUP_DIR="/var/backups/postgresql"
export RETENTION_DAYS="30"
export LOG_FILE="/var/log/hetzner-backup.log"

# Optional: Slack Notifications
export ENABLE_SLACK_NOTIFICATIONS="false"
export SLACK_WEBHOOK_URL=""

# Database Configuration (override as needed)
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="copilot_main"
export DB_USER="copilot"
# Set DB_PASSWORD separately for security
# export DB_PASSWORD="your_password_here"
EOF

    print_info "Configuration saved to: ${env_file}"
    print_info "Load with: source ${env_file}"
}

test_backup_operation() {
    print_header "Test Backup Operation"

    echo -n "Do you want to run a test backup now? (yes/no): "
    read response

    if [[ "${response}" != "yes" ]]; then
        print_info "Skipping test backup"
        return 0
    fi

    print_info "Running test backup..."

    # Create a test file
    local test_file="/tmp/test_backup_$(date +%s).txt"
    echo "Test backup file created at $(date)" > "${test_file}"

    # Upload test file
    sftp -P "${STORAGEBOX_PORT}" \
         -i "${SSH_KEY_PATH}" \
         -o StrictHostKeyChecking=no \
         -o UserKnownHostsFile=/dev/null \
         "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
cd backups/postgresql/manual
put ${test_file}
bye
EOF

    if [[ $? -eq 0 ]]; then
        print_info "Test file uploaded successfully"

        # List remote files
        print_info "Remote files in backups/postgresql/manual:"
        ssh -p "${STORAGEBOX_PORT}" \
            -i "${SSH_KEY_PATH}" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
            "ls -lh backups/postgresql/manual/"

        # Cleanup test file
        rm -f "${test_file}"
        print_info "Test completed successfully"
    else
        print_error "Test upload failed"
        exit 1
    fi
}

display_next_steps() {
    print_header "Setup Complete!"

    echo "Next steps:"
    echo ""
    echo "1. Load environment variables:"
    echo "   source .env.storagebox"
    echo ""
    echo "2. Set your database password:"
    echo "   export DB_PASSWORD='your_secure_password'"
    echo ""
    echo "3. Run a manual backup:"
    echo "   ./scripts/hetzner-storagebox-backup.sh"
    echo ""
    echo "4. Setup automated backups (crontab):"
    echo "   crontab -e"
    echo "   Add: 0 2 * * * /path/to/scripts/hetzner-storagebox-backup.sh"
    echo ""
    echo "5. Test restore process:"
    echo "   ./scripts/hetzner-storagebox-restore.sh"
    echo ""
    print_info "Setup completed successfully!"
}

# ============================================================
# Main Execution
# ============================================================

main() {
    print_header "Hetzner Storage Box Setup Wizard"

    check_dependencies
    get_storagebox_credentials
    generate_ssh_key
    display_public_key
    configure_storagebox
    test_ssh_connection
    create_remote_directories
    save_environment_variables
    test_backup_operation
    display_next_steps
}

# Run main function
main
