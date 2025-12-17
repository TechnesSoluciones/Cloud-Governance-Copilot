#!/bin/bash
# SSL/TLS Setup Script with Let's Encrypt
# Usage: ./setup-ssl.sh <domain> <email>

set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: $0 <domain> <email>"
    echo ""
    echo "Example:"
    echo "  $0 copilot.example.com admin@example.com"
    echo ""
    echo "This will set up SSL certificates for:"
    echo "  - copilot.example.com (Copilot Portal)"
    echo "  - api.example.com (API Gateway)"
    echo "  - onecloud.example.com (OneCloud Dashboard)"
    echo "  - spend.example.com (Spend Navigator)"
    echo "  - security.example.com (Security Misconfig)"
    echo "  - asset.example.com (Asset 360)"
    echo "  - incident.example.com (Incident IQ)"
    echo "  - advisor.example.com (Advisor Report)"
    exit 1
fi

MAIN_DOMAIN="$1"
EMAIL="$2"
BASE_DOMAIN="${MAIN_DOMAIN#*.}"  # Extract base domain (e.g., example.com from copilot.example.com)

echo "🔐 Setting up SSL/TLS with Let's Encrypt..."
echo "Main domain: ${MAIN_DOMAIN}"
echo "Base domain: ${BASE_DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx is not running. Please start Nginx first."
    exit 1
fi

# Backup existing Nginx configuration
echo "💾 Backing up Nginx configuration..."
cp /etc/nginx/sites-available/copilot-app /etc/nginx/sites-available/copilot-app.backup.$(date +%Y%m%d_%H%M%S)

# Define all subdomains
SUBDOMAINS=(
    "copilot.${BASE_DOMAIN}"
    "api.${BASE_DOMAIN}"
    "onecloud.${BASE_DOMAIN}"
    "spend.${BASE_DOMAIN}"
    "security.${BASE_DOMAIN}"
    "asset.${BASE_DOMAIN}"
    "incident.${BASE_DOMAIN}"
    "advisor.${BASE_DOMAIN}"
)

# Request certificates for all domains
echo "📜 Requesting SSL certificates..."
echo ""

# Build certbot command with all domains
CERTBOT_DOMAINS=""
for subdomain in "${SUBDOMAINS[@]}"; do
    CERTBOT_DOMAINS="${CERTBOT_DOMAINS} -d ${subdomain}"
done

# Use --nginx plugin for automatic configuration
# --agree-tos: Agree to terms of service
# --non-interactive: Run without user interaction
# --redirect: Automatically redirect HTTP to HTTPS
# --hsts: Add HTTP Strict Transport Security header
# --staple-ocsp: Enable OCSP stapling
certbot --nginx \
    ${CERTBOT_DOMAINS} \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    --redirect \
    --hsts \
    --staple-ocsp

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates obtained successfully!"
    echo ""

    # Test Nginx configuration
    echo "🔍 Testing Nginx configuration..."
    nginx -t

    if [ $? -eq 0 ]; then
        echo "✅ Nginx configuration is valid"

        # Reload Nginx
        echo "🔄 Reloading Nginx..."
        systemctl reload nginx

        echo "✅ SSL/TLS setup completed successfully!"
        echo ""
        echo "📝 Your sites are now accessible via HTTPS:"
        for subdomain in "${SUBDOMAINS[@]}"; do
            echo "  - https://${subdomain}"
        done
        echo ""
        echo "🔄 Certificate auto-renewal is configured via certbot timer"
        echo "   Check status: systemctl status certbot.timer"
        echo ""
        echo "📊 Certificate information:"
        certbot certificates
    else
        echo "❌ Nginx configuration test failed!"
        echo "   Restoring backup..."
        cp /etc/nginx/sites-available/copilot-app.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/copilot-app
        systemctl reload nginx
        exit 1
    fi
else
    echo "❌ Failed to obtain SSL certificates!"
    echo ""
    echo "Common issues:"
    echo "  1. DNS not pointing to this server (check A records)"
    echo "  2. Port 80/443 not open in firewall"
    echo "  3. Domain not properly configured"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check DNS: dig ${MAIN_DOMAIN}"
    echo "  - Check firewall: ufw status"
    echo "  - Check Nginx: systemctl status nginx"
    echo "  - View certbot logs: journalctl -u certbot"
    exit 1
fi

# Setup automatic renewal check
echo "⚙️  Configuring automatic renewal..."

# Certbot automatically installs a systemd timer for renewal
# Verify it's enabled
if systemctl is-enabled certbot.timer &> /dev/null; then
    echo "✅ Certbot renewal timer is enabled"
    systemctl status certbot.timer --no-pager
else
    echo "⚙️  Enabling certbot renewal timer..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Test HTTPS access for all domains"
echo "  2. Verify certificate: https://www.ssllabs.com/ssltest/"
echo "  3. Monitor renewal: systemctl status certbot.timer"
echo ""
echo "🔧 Useful commands:"
echo "  - List certificates: certbot certificates"
echo "  - Renew certificates: certbot renew"
echo "  - Test renewal: certbot renew --dry-run"
echo "  - Revoke certificate: certbot revoke --cert-name ${MAIN_DOMAIN}"
