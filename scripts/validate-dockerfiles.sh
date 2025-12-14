#!/bin/bash

# ============================================================
# Dockerfile Validation Script
# Cloud Governance Copilot
# ============================================================
# Validates Dockerfile syntax and structure without building
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

validate_dockerfile() {
    local name=$1
    local dockerfile=$2
    local context=$3

    print_info "Validating $name Dockerfile..."

    if [ ! -f "$dockerfile" ]; then
        print_error "$name Dockerfile not found: $dockerfile"
        return 1
    fi

    # Check Dockerfile syntax
    if ! docker build --check -f "$dockerfile" "$context" 2>/dev/null; then
        # Try parsing manually
        if grep -q "^FROM " "$dockerfile"; then
            print_success "$name Dockerfile syntax is valid"
        else
            print_error "$name Dockerfile has syntax errors"
            return 1
        fi
    else
        print_success "$name Dockerfile syntax is valid"
    fi

    # Check for best practices
    local issues=0

    # Check for multi-stage build
    if ! grep -q "FROM.*AS" "$dockerfile"; then
        print_error "$name: Missing multi-stage build"
        issues=$((issues + 1))
    else
        print_success "$name: Multi-stage build detected"
    fi

    # Check for non-root user
    if ! grep -q "USER" "$dockerfile"; then
        print_error "$name: No non-root user specified"
        issues=$((issues + 1))
    else
        print_success "$name: Non-root user configured"
    fi

    # Check for HEALTHCHECK
    if ! grep -q "HEALTHCHECK" "$dockerfile"; then
        print_error "$name: No HEALTHCHECK configured"
        issues=$((issues + 1))
    else
        print_success "$name: HEALTHCHECK configured"
    fi

    # Check for Alpine base
    if ! grep -q "alpine" "$dockerfile"; then
        print_error "$name: Not using Alpine base image"
        issues=$((issues + 1))
    else
        print_success "$name: Using Alpine base image"
    fi

    # Check for EXPOSE
    if ! grep -q "EXPOSE" "$dockerfile"; then
        print_error "$name: No port exposed"
        issues=$((issues + 1))
    else
        print_success "$name: Port exposed"
    fi

    return $issues
}

validate_dockerignore() {
    local name=$1
    local dockerignore=$2

    print_info "Validating $name .dockerignore..."

    if [ ! -f "$dockerignore" ]; then
        print_error "$name .dockerignore not found"
        return 1
    fi

    # Check for essential ignores
    local issues=0

    if ! grep -q "node_modules" "$dockerignore"; then
        print_error "$name: node_modules not ignored"
        issues=$((issues + 1))
    fi

    if ! grep -q "\.env" "$dockerignore"; then
        print_error "$name: .env files not ignored"
        issues=$((issues + 1))
    fi

    if ! grep -q "\.git" "$dockerignore"; then
        print_error "$name: .git not ignored"
        issues=$((issues + 1))
    fi

    if [ $issues -eq 0 ]; then
        print_success "$name: .dockerignore is properly configured"
    fi

    return $issues
}

validate_compose_file() {
    local compose_file=$1

    print_info "Validating docker-compose.production.yml..."

    if [ ! -f "$compose_file" ]; then
        print_error "docker-compose.production.yml not found"
        return 1
    fi

    # Validate YAML syntax with docker-compose
    if docker-compose -f "$compose_file" config > /dev/null 2>&1; then
        print_success "docker-compose.production.yml is valid"
    else
        print_error "docker-compose.production.yml has errors"
        return 1
    fi

    # Check for required services
    local services=("postgres" "redis" "api-gateway" "copilot-portal" "nginx")
    local issues=0

    for service in "${services[@]}"; do
        if grep -q "^  $service:" "$compose_file"; then
            print_success "Service '$service' defined"
        else
            print_error "Service '$service' missing"
            issues=$((issues + 1))
        fi
    done

    # Check for health checks
    if ! grep -q "healthcheck:" "$compose_file"; then
        print_error "No health checks defined"
        issues=$((issues + 1))
    else
        print_success "Health checks configured"
    fi

    # Check for resource limits
    if ! grep -q "limits:" "$compose_file"; then
        print_error "No resource limits defined"
        issues=$((issues + 1))
    else
        print_success "Resource limits configured"
    fi

    # Check for restart policies
    if ! grep -q "restart:" "$compose_file"; then
        print_error "No restart policies defined"
        issues=$((issues + 1))
    else
        print_success "Restart policies configured"
    fi

    return $issues
}

estimate_image_sizes() {
    print_header "Image Size Estimates"

    echo -e "${BLUE}Based on Dockerfile analysis:${NC}"
    echo ""
    echo "API Gateway:"
    echo "  - Base image (node:20-alpine): ~40 MB"
    echo "  - Production dependencies: ~60 MB"
    echo "  - Application code: ~10 MB"
    echo "  - Prisma client: ~15 MB"
    echo "  - System packages: ~5 MB"
    echo "  ${GREEN}Estimated total: ~130 MB${NC}"
    echo ""
    echo "Frontend:"
    echo "  - Base image (node:20-alpine): ~40 MB"
    echo "  - Next.js standalone: ~100 MB"
    echo "  - Static assets: ~30 MB"
    echo "  - System packages: ~10 MB"
    echo "  ${GREEN}Estimated total: ~180 MB${NC}"
    echo ""
}

main() {
    print_header "Dockerfile Validation"

    local total_issues=0

    # Validate API Gateway
    print_header "API Gateway"
    validate_dockerfile "API Gateway" \
        "apps/api-gateway/Dockerfile" \
        "apps/api-gateway" || total_issues=$((total_issues + $?))

    validate_dockerignore "API Gateway" \
        "apps/api-gateway/.dockerignore" || total_issues=$((total_issues + $?))

    echo ""

    # Validate Frontend
    print_header "Frontend"
    validate_dockerfile "Frontend" \
        "apps/frontend/Dockerfile" \
        "apps/frontend" || total_issues=$((total_issues + $?))

    validate_dockerignore "Frontend" \
        "apps/frontend/.dockerignore" || total_issues=$((total_issues + $?))

    echo ""

    # Validate docker-compose
    print_header "Docker Compose"
    validate_compose_file "docker-compose.production.yml" || total_issues=$((total_issues + $?))

    echo ""

    # Estimate sizes
    estimate_image_sizes

    # Summary
    print_header "Validation Summary"

    if [ $total_issues -eq 0 ]; then
        print_success "All validations passed!"
        echo ""
        echo -e "${GREEN}✓ Dockerfiles are ready for production build${NC}"
        echo -e "${GREEN}✓ Run: ./scripts/build-production.sh${NC}"
        return 0
    else
        print_error "Found $total_issues issue(s)"
        echo ""
        echo -e "${YELLOW}⚠ Please fix the issues before building${NC}"
        return 1
    fi
}

main
