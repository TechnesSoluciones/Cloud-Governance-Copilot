#!/bin/bash

###############################################################################
# Environment Variable Conflict Checker
#
# This script checks for environment variable conflicts between your shell
# environment and the .env file used by Docker Compose.
#
# Usage: ./scripts/check-env-conflicts.sh
###############################################################################

set -e

echo "========================================="
echo "Environment Variable Conflict Checker"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Critical variables for Docker Compose
CRITICAL_VARS=(
  "REDIS_URL"
  "REDIS_HOST"
  "REDIS_PORT"
  "REDIS_PASSWORD"
  "BULLMQ_REDIS_HOST"
  "BULLMQ_REDIS_PORT"
  "BULLMQ_REDIS_PASSWORD"
  "DATABASE_URL"
  "NODE_ENV"
)

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}ERROR: .env file not found!${NC}"
  echo "Please create .env file first"
  exit 1
fi

echo "Checking for conflicts between shell environment and .env file..."
echo ""

conflicts=0
warnings=0

for var in "${CRITICAL_VARS[@]}"; do
  # Get value from shell environment
  shell_value="${!var}"

  # Get value from .env file (handle both formats: VAR=value and VAR="value")
  env_value=$(grep "^${var}=" .env 2>/dev/null | head -n1 | cut -d'=' -f2- | sed 's/^"//;s/"$//')

  if [ -n "$shell_value" ]; then
    if [ -n "$env_value" ]; then
      # Both are set - check if they match
      if [ "$shell_value" != "$env_value" ]; then
        echo -e "${RED}CONFLICT DETECTED: ${var}${NC}"
        echo "  Shell value:  $shell_value"
        echo "  .env value:   $env_value"
        echo -e "  ${YELLOW}Docker Compose will use SHELL value!${NC}"
        echo ""
        ((conflicts++))
      else
        echo -e "${GREEN}OK: ${var}${NC} (shell and .env match)"
      fi
    else
      echo -e "${YELLOW}WARNING: ${var}${NC}"
      echo "  Set in shell: $shell_value"
      echo "  Not in .env file"
      echo ""
      ((warnings++))
    fi
  else
    if [ -n "$env_value" ]; then
      echo -e "${GREEN}OK: ${var}${NC} (only in .env file)"
    else
      echo -e "${YELLOW}INFO: ${var}${NC} not set in shell or .env"
    fi
  fi
done

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo -e "Conflicts (shell overrides .env): ${RED}${conflicts}${NC}"
echo -e "Warnings (shell set, not in .env): ${YELLOW}${warnings}${NC}"
echo ""

if [ $conflicts -gt 0 ]; then
  echo -e "${RED}ACTION REQUIRED:${NC}"
  echo ""
  echo "Docker Compose will use shell environment values instead of .env file!"
  echo ""
  echo "Solutions:"
  echo "1. Use the dedicated Docker environment file:"
  echo "   docker-compose --env-file .env.docker up -d"
  echo ""
  echo "2. Unset shell variables (temporary, current session only):"
  for var in "${CRITICAL_VARS[@]}"; do
    if [ -n "${!var}" ]; then
      echo "   unset $var"
    fi
  done
  echo ""
  echo "3. Remove from shell config files (permanent):"
  echo "   Check ~/.zshrc, ~/.bashrc, ~/.zprofile, ~/.bash_profile"
  echo "   Remove lines like: export REDIS_URL=..."
  echo ""
  exit 1
fi

if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}Note:${NC} Some variables are set in shell but not in .env"
  echo "This is usually fine, but may cause unexpected behavior"
  echo ""
  exit 0
fi

echo -e "${GREEN}All checks passed! No conflicts detected.${NC}"
exit 0
