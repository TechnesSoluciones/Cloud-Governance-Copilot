#!/bin/bash

# ============================================================
# Production Build Script
# Cloud Governance Copilot
# ============================================================
# This script builds optimized production Docker images
# with versioning, validation, and optional security scanning
# ============================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================
# Configuration
# ============================================================
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-latest}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
SKIP_SECURITY_SCAN="${SKIP_SECURITY_SCAN:-false}"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"
PARALLEL_BUILD="${PARALLEL_BUILD:-true}"

# Image names
API_GATEWAY_IMAGE="copilot/api-gateway"
FRONTEND_IMAGE="copilot/frontend"

# Size thresholds (in MB)
MAX_API_SIZE=150
MAX_FRONTEND_SIZE=200

# ============================================================
# Functions
# ============================================================

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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_tools=()

    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_tools+=("docker-compose")
    fi

    # Check if Trivy is available (optional)
    if ! command -v trivy &> /dev/null; then
        print_warning "Trivy not found. Security scanning will be skipped."
        SKIP_SECURITY_SCAN="true"
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi

    print_success "All prerequisites checked"
}

display_build_info() {
    print_header "Build Information"
    echo -e "${BLUE}Project Root:${NC} $PROJECT_ROOT"
    echo -e "${BLUE}Version:${NC} $VERSION"
    echo -e "${BLUE}Git Commit:${NC} $GIT_COMMIT"
    echo -e "${BLUE}Build Date:${NC} $BUILD_DATE"
    echo -e "${BLUE}Registry:${NC} ${REGISTRY:-'local only'}"
    echo -e "${BLUE}Parallel Build:${NC} $PARALLEL_BUILD"
    echo -e "${BLUE}Security Scan:${NC} $([ "$SKIP_SECURITY_SCAN" = "true" ] && echo "disabled" || echo "enabled")"
    echo ""
}

build_image() {
    local service=$1
    local context=$2
    local dockerfile=$3
    local image_name=$4

    print_header "Building $service"

    local full_image_name="$image_name:$VERSION"
    if [ -n "$REGISTRY" ]; then
        full_image_name="$REGISTRY/$full_image_name"
    fi

    print_info "Building image: $full_image_name"

    # Build with BuildKit for better caching
    DOCKER_BUILDKIT=1 docker build \
        --target runner \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg VERSION="$VERSION" \
        --cache-from "$image_name:latest" \
        -t "$full_image_name" \
        -t "$image_name:latest" \
        -f "$dockerfile" \
        "$context"

    print_success "$service image built successfully"
}

get_image_size() {
    local image=$1
    docker inspect "$image" --format='{{.Size}}' | awk '{print int($1/1048576)}'
}

validate_image_size() {
    local image=$1
    local max_size=$2
    local service_name=$3

    print_info "Validating $service_name image size..."

    local size=$(get_image_size "$image")

    echo -e "${BLUE}Image size:${NC} ${size}MB (max: ${max_size}MB)"

    if [ "$size" -gt "$max_size" ]; then
        print_warning "$service_name image exceeds size threshold: ${size}MB > ${max_size}MB"
        return 1
    else
        print_success "$service_name image size is within limits"
        return 0
    fi
}

security_scan() {
    local image=$1
    local service_name=$2

    if [ "$SKIP_SECURITY_SCAN" = "true" ]; then
        print_warning "Security scan skipped for $service_name"
        return 0
    fi

    print_header "Security Scanning - $service_name"

    print_info "Scanning $image with Trivy..."

    # Run Trivy scan
    # --severity HIGH,CRITICAL: Only report high and critical vulnerabilities
    # --exit-code 0: Don't fail the build on vulnerabilities (just report)
    trivy image \
        --severity HIGH,CRITICAL \
        --exit-code 0 \
        --no-progress \
        "$image" || true

    print_success "Security scan completed for $service_name"
}

push_image() {
    local image=$1
    local service_name=$2

    if [ "$PUSH_TO_REGISTRY" != "true" ]; then
        print_info "Skipping push to registry for $service_name"
        return 0
    fi

    if [ -z "$REGISTRY" ]; then
        print_warning "No registry specified, skipping push for $service_name"
        return 0
    fi

    print_header "Pushing $service_name to Registry"

    local full_image_name="$REGISTRY/$image:$VERSION"
    local latest_image_name="$REGISTRY/$image:latest"

    print_info "Pushing $full_image_name..."
    docker push "$full_image_name"

    print_info "Pushing $latest_image_name..."
    docker push "$latest_image_name"

    print_success "$service_name pushed to registry"
}

cleanup_dangling_images() {
    print_header "Cleanup"

    print_info "Removing dangling images..."
    docker image prune -f > /dev/null 2>&1 || true

    print_success "Cleanup completed"
}

generate_build_report() {
    print_header "Build Report"

    local api_image="$API_GATEWAY_IMAGE:$VERSION"
    local frontend_image="$FRONTEND_IMAGE:$VERSION"

    local api_size=$(get_image_size "$api_image")
    local frontend_size=$(get_image_size "$frontend_image")

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    BUILD SUMMARY                           ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ Version:        $VERSION"
    echo "║ Git Commit:     $GIT_COMMIT"
    echo "║ Build Date:     $BUILD_DATE"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ API Gateway:    ${api_size}MB / ${MAX_API_SIZE}MB"
    echo "║ Frontend:       ${frontend_size}MB / ${MAX_FRONTEND_SIZE}MB"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ Images:"
    echo "║   - $api_image"
    echo "║   - $frontend_image"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Save report to file
    local report_file="$PROJECT_ROOT/build-report-${VERSION}-${GIT_COMMIT}.txt"
    {
        echo "Build Report - Cloud Governance Copilot"
        echo "========================================"
        echo ""
        echo "Version: $VERSION"
        echo "Git Commit: $GIT_COMMIT"
        echo "Build Date: $BUILD_DATE"
        echo ""
        echo "Image Sizes:"
        echo "  API Gateway: ${api_size}MB (limit: ${MAX_API_SIZE}MB)"
        echo "  Frontend: ${frontend_size}MB (limit: ${MAX_FRONTEND_SIZE}MB)"
        echo ""
        echo "Images:"
        echo "  - $api_image"
        echo "  - $frontend_image"
    } > "$report_file"

    print_success "Build report saved to: $report_file"
}

# ============================================================
# Main Execution
# ============================================================

main() {
    print_header "Cloud Governance Copilot - Production Build"

    # Check prerequisites
    check_prerequisites

    # Display build information
    display_build_info

    # Start build timer
    BUILD_START=$(date +%s)

    if [ "$PARALLEL_BUILD" = "true" ]; then
        # Build in parallel (faster)
        print_info "Building images in parallel..."

        build_image "API Gateway" "./apps/api-gateway" "./apps/api-gateway/Dockerfile" "$API_GATEWAY_IMAGE" &
        PID_API=$!

        build_image "Frontend" "./apps/frontend" "./apps/frontend/Dockerfile" "$FRONTEND_IMAGE" &
        PID_FRONTEND=$!

        # Wait for both builds
        wait $PID_API $PID_FRONTEND
    else
        # Build sequentially
        build_image "API Gateway" "./apps/api-gateway" "./apps/api-gateway/Dockerfile" "$API_GATEWAY_IMAGE"
        build_image "Frontend" "./apps/frontend" "./apps/frontend/Dockerfile" "$FRONTEND_IMAGE"
    fi

    # Calculate build time
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    print_success "All images built in ${BUILD_TIME}s"

    # Validate image sizes
    print_header "Validating Image Sizes"
    validate_image_size "$API_GATEWAY_IMAGE:$VERSION" "$MAX_API_SIZE" "API Gateway" || true
    validate_image_size "$FRONTEND_IMAGE:$VERSION" "$MAX_FRONTEND_SIZE" "Frontend" || true

    # Security scanning
    if [ "$SKIP_SECURITY_SCAN" != "true" ]; then
        security_scan "$API_GATEWAY_IMAGE:$VERSION" "API Gateway"
        security_scan "$FRONTEND_IMAGE:$VERSION" "Frontend"
    fi

    # Push to registry
    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        push_image "$API_GATEWAY_IMAGE" "API Gateway"
        push_image "$FRONTEND_IMAGE" "Frontend"
    fi

    # Cleanup
    cleanup_dangling_images

    # Generate report
    generate_build_report

    print_header "Build Completed Successfully"
    print_success "Total time: ${BUILD_TIME}s"
}

# ============================================================
# Script Entry Point
# ============================================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        --push)
            PUSH_TO_REGISTRY="true"
            shift
            ;;
        --skip-scan)
            SKIP_SECURITY_SCAN="true"
            shift
            ;;
        --no-parallel)
            PARALLEL_BUILD="false"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --version VERSION     Set image version (default: latest)"
            echo "  -r, --registry REGISTRY   Docker registry URL"
            echo "  --push                    Push images to registry"
            echo "  --skip-scan              Skip security scanning"
            echo "  --no-parallel            Build images sequentially"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 -v 1.0.0"
            echo "  $0 -v 1.0.0 -r docker.io/mycompany --push"
            echo "  $0 -v 1.0.0 --skip-scan"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
