#!/bin/bash
# Setup automated PostgreSQL backups with cron
# Run this script on the Hetzner VPS server

set -euo pipefail

echo "🔧 Setting up automated PostgreSQL backups..."

# Create environment file for cron
cat > /etc/cron.d/postgresql-backup-env << 'ENVEOF'
DB_HOST=46.224.33.191
DB_PORT=5432
DB_NAME=copilot_dev
DB_USER=copilot_dev
DB_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD
BACKUP_DIR=/var/backups/postgresql
RETENTION_DAYS=7
LOG_FILE=/var/log/postgresql-backup.log
ENVEOF

chmod 600 /etc/cron.d/postgresql-backup-env

echo "⚠️  IMPORTANT: Edit /etc/cron.d/postgresql-backup-env and replace REPLACE_WITH_ACTUAL_PASSWORD"
echo ""

# Create cron job
cat > /etc/cron.d/postgresql-backup << 'CRONEOF'
# PostgreSQL Automated Backup
# Runs daily at 2:00 AM
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 2 * * * root . /etc/cron.d/postgresql-backup-env && /opt/copilot-app/scripts/backup-database.sh >> /var/log/postgresql-backup.log 2>&1
CRONEOF

chmod 644 /etc/cron.d/postgresql-backup

# Create backup directory
mkdir -p /var/backups/postgresql
chmod 700 /var/backups/postgresql

# Create log file
touch /var/log/postgresql-backup.log
chmod 644 /var/log/postgresql-backup.log

echo "✅ Cron job created: Daily backup at 2:00 AM"
echo "✅ Backup directory: /var/backups/postgresql"
echo "✅ Log file: /var/log/postgresql-backup.log"
echo ""
echo "📝 Next steps:"
echo "1. Edit /etc/cron.d/postgresql-backup-env and set the actual DB_PASSWORD"
echo "2. Test the backup manually: sudo /opt/copilot-app/scripts/backup-database.sh"
echo "3. Verify cron job: sudo crontab -l"
echo ""
echo "🔍 To monitor backups:"
echo "  - View logs: tail -f /var/log/postgresql-backup.log"
echo "  - List backups: ls -lh /var/backups/postgresql/"
