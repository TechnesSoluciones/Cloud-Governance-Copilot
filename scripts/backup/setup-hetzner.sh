#!/bin/bash
# ============================================================
# Hetzner Storage Box Setup Script
# ============================================================
# Description: Configure SSH connection to Hetzner Storage Box
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/configs/backup.conf"
SSH_DIR="$HOME/.ssh"
SSH_KEY_PATH="$SSH_DIR/id_rsa_hetzner_backup"

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

Configure Hetzner Storage Box connection for PostgreSQL backups.

OPTIONS:
    --setup             Interactive setup wizard
    --test              Test connection to Hetzner Storage Box
    --generate-key      Generate SSH key for Hetzner
    --upload-key        Upload SSH public key to Hetzner
    -h, --help          Display this help message

PREREQUISITES:
    1. Active Hetzner Storage Box subscription
    2. Storage Box username (e.g., u123456)
    3. Storage Box hostname (e.g., u123456.your-storagebox.de)
    4. SSH access enabled in Hetzner Robot panel

EXAMPLES:
    # Run interactive setup
    $0 --setup

    # Test existing connection
    $0 --test

    # Generate new SSH key
    $0 --generate-key

EOF
    exit 1
}

# Generate SSH key
generate_ssh_key() {
    log "Generating SSH key for Hetzner Storage Box..."

    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"

    if [[ -f "$SSH_KEY_PATH" ]]; then
        read -p "SSH key already exists. Overwrite? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Keeping existing key"
            return 0
        fi
    fi

    # Generate ED25519 key (recommended for better security)
    if ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "postgres-backup@$(hostname)"; then
        log "SSH key generated successfully"
        chmod 600 "$SSH_KEY_PATH"
        chmod 644 "${SSH_KEY_PATH}.pub"

        echo ""
        echo "=========================================="
        echo "PUBLIC KEY (add this to Hetzner)"
        echo "=========================================="
        cat "${SSH_KEY_PATH}.pub"
        echo "=========================================="
        echo ""

        return 0
    else
        log "ERROR: Failed to generate SSH key"
        return 1
    fi
}

# Test connection to Hetzner
test_connection() {
    log "Testing connection to Hetzner Storage Box..."

    # Check if config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log "ERROR: Configuration file not found: $CONFIG_FILE"
        return 1
    fi

    # Source configuration
    source "$CONFIG_FILE"

    # Validate configuration
    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        log "ERROR: Hetzner credentials not configured in $CONFIG_FILE"
        log "Please run: $0 --setup"
        return 1
    fi

    if [[ ! -f "$HETZNER_SSH_KEY" ]]; then
        log "ERROR: SSH key not found: $HETZNER_SSH_KEY"
        log "Please run: $0 --generate-key"
        return 1
    fi

    # Test SSH connection
    echo ""
    echo "Testing SSH connection..."
    echo "Host: $HETZNER_HOST"
    echo "User: $HETZNER_USER"
    echo "Port: $HETZNER_PORT"
    echo "Key:  $HETZNER_SSH_KEY"
    echo ""

    if ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        "${HETZNER_USER}@${HETZNER_HOST}" "echo 'Connection successful'" 2>/dev/null; then
        log "SUCCESS: Connection to Hetzner Storage Box established"

        # Test directory creation
        echo ""
        echo "Testing directory operations..."

        if ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no \
            "${HETZNER_USER}@${HETZNER_HOST}" "mkdir -p ${HETZNER_REMOTE_DIR}/test && rmdir ${HETZNER_REMOTE_DIR}/test" 2>/dev/null; then
            log "SUCCESS: Directory operations work correctly"
        else
            log "WARN: Could not create/delete test directory"
        fi

        # Show available space
        echo ""
        echo "Storage Box information:"
        ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no \
            "${HETZNER_USER}@${HETZNER_HOST}" "df -h ." 2>/dev/null || true

        echo ""
        return 0
    else
        log "ERROR: Cannot connect to Hetzner Storage Box"
        log "Please check:"
        log "  1. SSH is enabled in Hetzner Robot panel"
        log "  2. Public key is added to authorized_keys"
        log "  3. Firewall allows SSH on port $HETZNER_PORT"
        return 1
    fi
}

# Upload SSH public key to Hetzner
upload_public_key() {
    log "Uploading public key to Hetzner Storage Box..."

    if [[ ! -f "${SSH_KEY_PATH}.pub" ]]; then
        log "ERROR: Public key not found: ${SSH_KEY_PATH}.pub"
        log "Run: $0 --generate-key first"
        return 1
    fi

    # Source configuration
    source "$CONFIG_FILE"

    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        log "ERROR: Hetzner credentials not configured"
        return 1
    fi

    echo ""
    echo "=========================================="
    echo "MANUAL STEPS REQUIRED"
    echo "=========================================="
    echo ""
    echo "1. Log in to Hetzner Robot panel:"
    echo "   https://robot.hetzner.com/"
    echo ""
    echo "2. Navigate to your Storage Box"
    echo ""
    echo "3. Enable SSH/SFTP access if not already enabled"
    echo ""
    echo "4. Add the following public key to authorized_keys:"
    echo ""
    echo "----------------------------------------"
    cat "${SSH_KEY_PATH}.pub"
    echo "----------------------------------------"
    echo ""
    echo "5. Or use password authentication to copy the key:"
    echo ""
    echo "   ssh-copy-id -p $HETZNER_PORT -i $SSH_KEY_PATH ${HETZNER_USER}@${HETZNER_HOST}"
    echo ""
    echo "6. After adding the key, run: $0 --test"
    echo ""
    echo "=========================================="
    echo ""
}

# Interactive setup wizard
setup_wizard() {
    log "Starting Hetzner Storage Box setup wizard..."

    echo ""
    echo "=========================================="
    echo "HETZNER STORAGE BOX SETUP"
    echo "=========================================="
    echo ""
    echo "This wizard will help you configure your Hetzner Storage Box"
    echo "for automated PostgreSQL backups."
    echo ""

    # Get Hetzner credentials
    read -p "Enter your Hetzner Storage Box username (e.g., u123456): " hetzner_user
    read -p "Enter your Hetzner Storage Box hostname (e.g., u123456.your-storagebox.de): " hetzner_host
    read -p "Enter SSH port (default: 23): " hetzner_port
    hetzner_port=${hetzner_port:-23}

    read -p "Enter remote backup directory (default: /backups/postgres): " remote_dir
    remote_dir=${remote_dir:-/backups/postgres}

    # Validate inputs
    if [[ -z "$hetzner_user" || -z "$hetzner_host" ]]; then
        log "ERROR: Username and hostname are required"
        return 1
    fi

    echo ""
    echo "Configuration summary:"
    echo "  Username: $hetzner_user"
    echo "  Hostname: $hetzner_host"
    echo "  Port:     $hetzner_port"
    echo "  Remote directory: $remote_dir"
    echo ""

    read -p "Is this correct? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Setup cancelled"
        return 1
    fi

    # Update configuration file
    log "Updating configuration file..."

    # Create backup of config
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"

    # Update Hetzner settings
    sed -i.tmp "s|^HETZNER_USER=.*|HETZNER_USER=\"$hetzner_user\"|" "$CONFIG_FILE"
    sed -i.tmp "s|^HETZNER_HOST=.*|HETZNER_HOST=\"$hetzner_host\"|" "$CONFIG_FILE"
    sed -i.tmp "s|^HETZNER_PORT=.*|HETZNER_PORT=$hetzner_port|" "$CONFIG_FILE"
    sed -i.tmp "s|^HETZNER_REMOTE_DIR=.*|HETZNER_REMOTE_DIR=\"$remote_dir\"|" "$CONFIG_FILE"
    sed -i.tmp "s|^HETZNER_ENABLED=.*|HETZNER_ENABLED=true|" "$CONFIG_FILE"
    sed -i.tmp "s|^HETZNER_SSH_KEY=.*|HETZNER_SSH_KEY=\"$SSH_KEY_PATH\"|" "$CONFIG_FILE"

    rm -f "${CONFIG_FILE}.tmp"

    log "Configuration updated successfully"

    # Generate SSH key if it doesn't exist
    echo ""
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        read -p "Generate SSH key for authentication? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            generate_ssh_key
        fi
    else
        log "SSH key already exists: $SSH_KEY_PATH"
    fi

    # Upload public key instructions
    echo ""
    upload_public_key

    echo ""
    log "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Add the public key to your Hetzner Storage Box"
    echo "  2. Run: $0 --test"
    echo "  3. Run a test backup: ${SCRIPT_DIR}/backup.sh"
    echo ""
}

# Show current configuration
show_config() {
    echo "=========================================="
    echo "CURRENT CONFIGURATION"
    echo "=========================================="
    echo ""

    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"

        echo "Hetzner Status: $([ "$HETZNER_ENABLED" == "true" ] && echo "ENABLED" || echo "DISABLED")"
        echo ""

        if [[ -n "$HETZNER_USER" ]]; then
            echo "Username:        $HETZNER_USER"
            echo "Hostname:        $HETZNER_HOST"
            echo "Port:            $HETZNER_PORT"
            echo "Remote directory: $HETZNER_REMOTE_DIR"
            echo "SSH key:         $HETZNER_SSH_KEY"
            echo "Retention:       $HETZNER_RETENTION_DAYS days"
        else
            echo "Not configured. Run: $0 --setup"
        fi

        echo ""
        echo "SSH Key Status:"

        if [[ -f "$SSH_KEY_PATH" ]]; then
            echo "  Private key: EXISTS"
            if [[ -f "${SSH_KEY_PATH}.pub" ]]; then
                echo "  Public key:  EXISTS"
            else
                echo "  Public key:  MISSING"
            fi
        else
            echo "  SSH key:     NOT GENERATED"
            echo "  Run: $0 --generate-key"
        fi
    else
        echo "Configuration file not found: $CONFIG_FILE"
    fi

    echo ""
    echo "=========================================="
}

# ============================================================
# MAIN EXECUTION
# ============================================================

# Create directories
mkdir -p "$SSH_DIR"
mkdir -p "$(dirname "$CONFIG_FILE")"

# Parse arguments
if [[ $# -eq 0 ]]; then
    show_config
    echo ""
    echo "Run '$0 --help' for usage information"
    exit 0
fi

case $1 in
    --setup)
        setup_wizard
        ;;
    --test)
        test_connection
        ;;
    --generate-key)
        generate_ssh_key
        echo ""
        log "Next step: Upload public key with: $0 --upload-key"
        ;;
    --upload-key)
        upload_public_key
        ;;
    --config)
        show_config
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
