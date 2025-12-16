#!/bin/bash

###############################################################################
# Azure Advisor Permissions Verification Script
#
# This script verifies that the Azure Service Principal has the required
# permissions to access Azure Advisor recommendations.
#
# Required Role: "Advisor Recommendations Reader" or "Reader"
# Scope: Subscription level
#
# Usage:
#   ./verify-azure-advisor-permissions.sh <service-principal-id> <subscription-id>
#
# Prerequisites:
#   - Azure CLI installed (az)
#   - Authenticated with Azure (az login)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}ERROR: Azure CLI is not installed${NC}"
    echo "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}ERROR: Not logged in to Azure${NC}"
    echo "Please run: az login"
    exit 1
fi

# Get parameters
SERVICE_PRINCIPAL_ID="${1:-$AZURE_CLIENT_ID}"
SUBSCRIPTION_ID="${2:-$AZURE_SUBSCRIPTION_ID}"

if [ -z "$SERVICE_PRINCIPAL_ID" ]; then
    echo -e "${RED}ERROR: Service Principal ID not provided${NC}"
    echo "Usage: $0 <service-principal-id> <subscription-id>"
    echo "Or set AZURE_CLIENT_ID environment variable"
    exit 1
fi

if [ -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${RED}ERROR: Subscription ID not provided${NC}"
    echo "Usage: $0 <service-principal-id> <subscription-id>"
    echo "Or set AZURE_SUBSCRIPTION_ID environment variable"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Azure Advisor Permissions Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Service Principal:${NC} $SERVICE_PRINCIPAL_ID"
echo -e "${YELLOW}Subscription:${NC} $SUBSCRIPTION_ID"
echo ""

# Set the subscription context
echo -e "${BLUE}Setting subscription context...${NC}"
az account set --subscription "$SUBSCRIPTION_ID"

# Get the service principal object ID
echo -e "${BLUE}Retrieving service principal details...${NC}"
SP_OBJECT_ID=$(az ad sp show --id "$SERVICE_PRINCIPAL_ID" --query "id" -o tsv 2>/dev/null || echo "")

if [ -z "$SP_OBJECT_ID" ]; then
    echo -e "${RED}ERROR: Service Principal not found${NC}"
    echo "Please verify the Service Principal ID: $SERVICE_PRINCIPAL_ID"
    exit 1
fi

echo -e "${GREEN}Service Principal Object ID:${NC} $SP_OBJECT_ID"
echo ""

# Check role assignments
echo -e "${BLUE}Checking role assignments...${NC}"
echo ""

ROLES=$(az role assignment list \
    --assignee "$SP_OBJECT_ID" \
    --subscription "$SUBSCRIPTION_ID" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    -o json)

# Check for required roles
HAS_ADVISOR_READER=false
HAS_READER=false
HAS_CONTRIBUTOR=false

while IFS= read -r role; do
    role_name=$(echo "$role" | jq -r '.Role')
    scope=$(echo "$role" | jq -r '.Scope')

    echo -e "${GREEN}✓${NC} Role: ${YELLOW}$role_name${NC}"
    echo -e "  Scope: $scope"
    echo ""

    case "$role_name" in
        "Advisor Recommendations Reader")
            HAS_ADVISOR_READER=true
            ;;
        "Reader")
            HAS_READER=true
            ;;
        "Contributor"|"Owner")
            HAS_CONTRIBUTOR=true
            ;;
    esac
done < <(echo "$ROLES" | jq -c '.[]')

# Verify permissions
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Permission Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$HAS_ADVISOR_READER" = true ] || [ "$HAS_READER" = true ] || [ "$HAS_CONTRIBUTOR" = true ]; then
    echo -e "${GREEN}✓ PASSED: Service Principal has required permissions${NC}"
    echo ""

    if [ "$HAS_ADVISOR_READER" = true ]; then
        echo -e "${GREEN}  ✓ Advisor Recommendations Reader${NC} (Recommended)"
    fi

    if [ "$HAS_READER" = true ]; then
        echo -e "${GREEN}  ✓ Reader${NC} (Sufficient)"
    fi

    if [ "$HAS_CONTRIBUTOR" = true ]; then
        echo -e "${GREEN}  ✓ Contributor/Owner${NC} (More than needed)"
    fi

    echo ""
    echo -e "${GREEN}The Service Principal can access Azure Advisor recommendations.${NC}"
    exit 0
else
    echo -e "${RED}✗ FAILED: Service Principal lacks required permissions${NC}"
    echo ""
    echo -e "${YELLOW}Required Roles (any of these):${NC}"
    echo "  • Advisor Recommendations Reader (recommended)"
    echo "  • Reader"
    echo "  • Contributor"
    echo ""
    echo -e "${YELLOW}To grant permissions, run:${NC}"
    echo ""
    echo -e "${BLUE}az role assignment create \\${NC}"
    echo -e "${BLUE}  --assignee \"$SERVICE_PRINCIPAL_ID\" \\${NC}"
    echo -e "${BLUE}  --role \"Advisor Recommendations Reader\" \\${NC}"
    echo -e "${BLUE}  --scope \"/subscriptions/$SUBSCRIPTION_ID\"${NC}"
    echo ""
    exit 1
fi
