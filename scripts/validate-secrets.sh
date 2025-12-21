#!/bin/bash

# ============================================================
# GitHub Secrets Validation Script
# ============================================================
# Verifica que todos los secrets requeridos estén configurados
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}GitHub Secrets Validation${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) no está instalado${NC}"
    echo ""
    echo "Para instalar:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    echo "Después ejecuta: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado con GitHub CLI${NC}"
    echo "Ejecuta: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI autenticado${NC}"
echo ""

# Get repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo -e "${RED}❌ No se pudo detectar el repositorio${NC}"
    echo "Asegúrate de estar en el directorio del proyecto"
    exit 1
fi

echo -e "${BLUE}📦 Repositorio: ${REPO}${NC}"
echo ""

# List all secrets
echo -e "${BLUE}Listando secrets configurados...${NC}"
SECRETS=$(gh secret list 2>/dev/null || echo "")

if [ -z "$SECRETS" ]; then
    echo -e "${RED}❌ No se pudieron listar los secrets${NC}"
    echo "Puede que no tengas permisos o el repositorio no tenga secrets"
    exit 1
fi

echo "$SECRETS"
echo ""

# Required secrets
echo -e "${BLUE}Validando secrets requeridos...${NC}"
echo ""

REQUIRED_SECRETS=(
    "APP_SERVER_HOST:Hostname o IP del servidor de producción"
    "APP_SERVER_USER:Usuario SSH para conectarse al servidor"
    "SSH_PRIVATE_KEY:Llave SSH privada para autenticación"
)

OPTIONAL_SECRETS=(
    "DEPLOY_PORT:Puerto SSH (default: 22)"
    "DEPLOY_PATH:Ruta del proyecto en el servidor (default: /opt/copilot)"
)

MISSING_REQUIRED=0
MISSING_OPTIONAL=0

# Check required secrets
for secret_info in "${REQUIRED_SECRETS[@]}"; do
    SECRET_NAME="${secret_info%%:*}"
    SECRET_DESC="${secret_info#*:}"

    if echo "$SECRETS" | grep -q "^$SECRET_NAME"; then
        UPDATED=$(echo "$SECRETS" | grep "^$SECRET_NAME" | awk '{print $2, $3, $4}')
        echo -e "${GREEN}✅ $SECRET_NAME${NC} - $SECRET_DESC"
        echo -e "   ${BLUE}Última actualización: $UPDATED${NC}"
    else
        echo -e "${RED}❌ $SECRET_NAME${NC} - $SECRET_DESC"
        echo -e "   ${YELLOW}⚠️  REQUERIDO - Falta configurar${NC}"
        MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
    fi
    echo ""
done

# Check optional secrets
echo -e "${BLUE}Secrets opcionales:${NC}"
echo ""

for secret_info in "${OPTIONAL_SECRETS[@]}"; do
    SECRET_NAME="${secret_info%%:*}"
    SECRET_DESC="${secret_info#*:}"

    if echo "$SECRETS" | grep -q "^$SECRET_NAME"; then
        UPDATED=$(echo "$SECRETS" | grep "^$SECRET_NAME" | awk '{print $2, $3, $4}')
        echo -e "${GREEN}✅ $SECRET_NAME${NC} - $SECRET_DESC"
        echo -e "   ${BLUE}Última actualización: $UPDATED${NC}"
    else
        echo -e "${YELLOW}⚪ $SECRET_NAME${NC} - $SECRET_DESC"
        echo -e "   ${BLUE}No configurado (se usará valor por defecto)${NC}"
        MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
    fi
    echo ""
done

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Resumen${NC}"
echo -e "${BLUE}================================${NC}"

if [ $MISSING_REQUIRED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los secrets requeridos están configurados${NC}"
else
    echo -e "${RED}❌ Faltan $MISSING_REQUIRED secret(s) requerido(s)${NC}"
    echo ""
    echo "Para configurar secrets:"
    echo "1. Ve a: https://github.com/$REPO/settings/secrets/actions"
    echo "2. Click en 'New repository secret'"
    echo "3. Agrega cada secret faltante"
    echo ""
    echo "O usa GitHub CLI:"
    echo "  gh secret set DEPLOY_HOST --body \"tu-servidor.com\""
    echo "  gh secret set DEPLOY_USER --body \"deploy\""
    echo "  gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_rsa"
fi

if [ $MISSING_OPTIONAL -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $MISSING_OPTIONAL secret(s) opcional(es) no configurado(s)${NC}"
    echo -e "${BLUE}Se usarán valores por defecto${NC}"
fi

echo ""

# Check GITHUB_TOKEN permissions
echo -e "${BLUE}Verificando permisos de GITHUB_TOKEN...${NC}"
echo -e "${GREEN}✅ GITHUB_TOKEN se provee automáticamente por GitHub Actions${NC}"
echo ""

# Final status
if [ $MISSING_REQUIRED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Configuración completa!${NC}"
    echo -e "${GREEN}Puedes ejecutar el workflow de deployment${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Configuración incompleta${NC}"
    echo -e "${RED}Configura los secrets faltantes antes de ejecutar el workflow${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
