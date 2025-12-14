#!/bin/bash
# ============================================================
# Cloud Governance Copilot - Health Check Script
# ============================================================
# Comprehensive health check for all services
# Usage: ./scripts/health-check.sh [--verbose] [--json]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"

VERBOSE=false
JSON_OUTPUT=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health status
ALL_HEALTHY=true

# ============================================================
# Functions
# ============================================================
log_info() {
    [[ "${JSON_OUTPUT}" == true ]] && return
    echo -e "${BLUE}[INFO]${NC} $@"
}

log_success() {
    [[ "${JSON_OUTPUT}" == true ]] && return
    echo -e "${GREEN}[✓]${NC} $@"
}

log_warning() {
    [[ "${JSON_OUTPUT}" == true ]] && return
    echo -e "${YELLOW}[!]${NC} $@"
}

log_error() {
    [[ "${JSON_OUTPUT}" == true ]] && return
    echo -e "${RED}[✗]${NC} $@"
    ALL_HEALTHY=false
}

# ============================================================
# Load Environment
# ============================================================
load_env() {
    if [[ -f "${ENV_FILE}" ]]; then
        source "${ENV_FILE}"
    fi
}

# ============================================================
# Check Docker Daemon
# ============================================================
check_docker() {
    log_info "Checking Docker daemon..."

    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
        return 0
    else
        log_error "Docker daemon is not running"
        return 1
    fi
}

# ============================================================
# Check Container Status
# ============================================================
check_container() {
    local container_name=$1
    local service_name=$2

    [[ "${VERBOSE}" == true ]] && log_info "Checking ${service_name}..."

    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "${service_name}: Container not found"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "${service_name}: Container is not running"
        return 1
    fi

    # Check container health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null || echo "none")

    if [[ "${health_status}" == "healthy" ]]; then
        log_success "${service_name}: Healthy"
        return 0
    elif [[ "${health_status}" == "none" ]]; then
        # No health check defined, just check if running
        log_success "${service_name}: Running (no health check)"
        return 0
    else
        log_error "${service_name}: Unhealthy (status: ${health_status})"

        # Show last health check log if verbose
        if [[ "${VERBOSE}" == true ]]; then
            docker inspect --format='{{json .State.Health.Log}}' "${container_name}" | jq -r '.[-1].Output' 2>/dev/null || true
        fi
        return 1
    fi
}

# ============================================================
# Check PostgreSQL
# ============================================================
check_postgres() {
    log_info "Checking PostgreSQL..."

    # Check container
    if ! check_container "copilot-postgres-prod" "PostgreSQL"; then
        return 1
    fi

    # Check database connectivity
    if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER:-copilot_prod}" &> /dev/null; then
        log_success "PostgreSQL: Database is accepting connections"
    else
        log_error "PostgreSQL: Database is not accepting connections"
        return 1
    fi

    # Check database size if verbose
    if [[ "${VERBOSE}" == true ]]; then
        local db_size=$(docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER:-copilot_prod}" -d "${POSTGRES_DB:-copilot_main}" -t -c "SELECT pg_size_pretty(pg_database_size('${POSTGRES_DB:-copilot_main}'));" 2>/dev/null | xargs)
        log_info "PostgreSQL: Database size: ${db_size}"

        local connections=$(docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER:-copilot_prod}" -d "${POSTGRES_DB:-copilot_main}" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        log_info "PostgreSQL: Active connections: ${connections}"
    fi

    return 0
}

# ============================================================
# Check Redis
# ============================================================
check_redis() {
    log_info "Checking Redis..."

    # Check container
    if ! check_container "copilot-redis-prod" "Redis"; then
        return 1
    fi

    # Check Redis connectivity
    if docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli --pass "${REDIS_PASSWORD}" ping &> /dev/null; then
        log_success "Redis: Server is responding"
    else
        log_error "Redis: Server is not responding"
        return 1
    fi

    # Check Redis info if verbose
    if [[ "${VERBOSE}" == true ]]; then
        local memory=$(docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli --pass "${REDIS_PASSWORD}" INFO MEMORY | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log_info "Redis: Memory usage: ${memory}"

        local keys=$(docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli --pass "${REDIS_PASSWORD}" DBSIZE | tr -d '\r')
        log_info "Redis: Keys: ${keys}"
    fi

    return 0
}

# ============================================================
# Check API Gateway
# ============================================================
check_api_gateway() {
    log_info "Checking API Gateway..."

    # Check container
    if ! check_container "copilot-api-gateway-prod" "API Gateway"; then
        return 1
    fi

    # Check health endpoint
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")

    if [[ "${response_code}" == "200" ]]; then
        log_success "API Gateway: Health endpoint responding"
    else
        log_error "API Gateway: Health endpoint not responding (HTTP ${response_code})"
        return 1
    fi

    # Check response time if verbose
    if [[ "${VERBOSE}" == true ]]; then
        local response_time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:4000/health 2>/dev/null || echo "N/A")
        log_info "API Gateway: Response time: ${response_time}s"
    fi

    return 0
}

# ============================================================
# Check Frontend
# ============================================================
check_frontend() {
    log_info "Checking Frontend..."

    # Check container
    if ! check_container "copilot-frontend-prod" "Frontend"; then
        return 1
    fi

    # Check health endpoint
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")

    if [[ "${response_code}" == "200" ]]; then
        log_success "Frontend: Health endpoint responding"
    else
        log_error "Frontend: Health endpoint not responding (HTTP ${response_code})"
        return 1
    fi

    return 0
}

# ============================================================
# Check Nginx
# ============================================================
check_nginx() {
    log_info "Checking Nginx..."

    # Check container
    if ! check_container "copilot-nginx-prod" "Nginx"; then
        return 1
    fi

    # Check HTTP endpoint
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")

    if [[ "${http_code}" == "200" ]]; then
        log_success "Nginx: HTTP endpoint responding"
    else
        log_error "Nginx: HTTP endpoint not responding (HTTP ${http_code})"
        return 1
    fi

    # Check HTTPS endpoint if configured
    if [[ -f "/etc/letsencrypt/live/${DOMAIN:-localhost}/fullchain.pem" ]] 2>/dev/null; then
        local https_code=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null || echo "000")

        if [[ "${https_code}" == "200" ]]; then
            log_success "Nginx: HTTPS endpoint responding"
        else
            log_warning "Nginx: HTTPS endpoint not responding (HTTP ${https_code})"
        fi
    fi

    return 0
}

# ============================================================
# Check Prometheus
# ============================================================
check_prometheus() {
    if ! docker ps --format '{{.Names}}' | grep -q "copilot-prometheus-prod"; then
        return 0  # Optional service
    fi

    log_info "Checking Prometheus..."

    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy 2>/dev/null || echo "000")

    if [[ "${response_code}" == "200" ]]; then
        log_success "Prometheus: Healthy"
    else
        log_warning "Prometheus: Not responding (HTTP ${response_code})"
    fi

    return 0
}

# ============================================================
# Check Grafana
# ============================================================
check_grafana() {
    if ! docker ps --format '{{.Names}}' | grep -q "copilot-grafana-prod"; then
        return 0  # Optional service
    fi

    log_info "Checking Grafana..."

    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

    if [[ "${response_code}" == "200" ]]; then
        log_success "Grafana: Healthy"
    else
        log_warning "Grafana: Not responding (HTTP ${response_code})"
    fi

    return 0
}

# ============================================================
# Check Disk Space
# ============================================================
check_disk_space() {
    log_info "Checking disk space..."

    local available_space=$(df -BG "${PROJECT_ROOT}" | awk 'NR==2 {print $4}' | sed 's/G//')
    local used_percent=$(df "${PROJECT_ROOT}" | awk 'NR==2 {print $5}')

    if [[ ${available_space} -gt 10 ]]; then
        log_success "Disk space: ${available_space}GB available (${used_percent} used)"
    elif [[ ${available_space} -gt 5 ]]; then
        log_warning "Disk space: ${available_space}GB available (${used_percent} used) - Running low"
    else
        log_error "Disk space: ${available_space}GB available (${used_percent} used) - Critical"
        return 1
    fi

    return 0
}

# ============================================================
# Check Docker Volumes
# ============================================================
check_volumes() {
    log_info "Checking Docker volumes..."

    local volumes=("copilot_postgres_data" "copilot_redis_data")
    local all_exist=true

    for volume in "${volumes[@]}"; do
        if docker volume inspect "${volume}" &> /dev/null; then
            [[ "${VERBOSE}" == true ]] && log_success "Volume ${volume} exists"
        else
            log_error "Volume ${volume} not found"
            all_exist=false
        fi
    done

    [[ "${all_exist}" == true ]] && log_success "All required volumes exist"

    return 0
}

# ============================================================
# Generate JSON Report
# ============================================================
generate_json_report() {
    cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "overall_status": "$([ "${ALL_HEALTHY}" == true ] && echo "healthy" || echo "unhealthy")",
  "services": {
    "docker": "$(check_docker &>/dev/null && echo "healthy" || echo "unhealthy")",
    "postgres": "$(check_postgres &>/dev/null && echo "healthy" || echo "unhealthy")",
    "redis": "$(check_redis &>/dev/null && echo "healthy" || echo "unhealthy")",
    "api_gateway": "$(check_api_gateway &>/dev/null && echo "healthy" || echo "unhealthy")",
    "frontend": "$(check_frontend &>/dev/null && echo "healthy" || echo "unhealthy")",
    "nginx": "$(check_nginx &>/dev/null && echo "healthy" || echo "unhealthy")"
  }
}
EOF
}

# ============================================================
# Main Health Check
# ============================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --json|-j)
                JSON_OUTPUT=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [[ "${JSON_OUTPUT}" == false ]]; then
        log_info "========================================"
        log_info "Cloud Governance Copilot - Health Check"
        log_info "========================================"
        log_info "Started at: $(date)"
        log_info "========================================"
    fi

    # Load environment
    load_env

    # Run health checks
    check_docker
    check_postgres
    check_redis
    check_api_gateway
    check_frontend
    check_nginx
    check_prometheus
    check_grafana
    check_disk_space
    check_volumes

    if [[ "${JSON_OUTPUT}" == true ]]; then
        generate_json_report
    else
        log_info "========================================"
        if [[ "${ALL_HEALTHY}" == true ]]; then
            log_success "All services are healthy!"
        else
            log_error "Some services are unhealthy!"
            exit 1
        fi
        log_info "========================================"
    fi
}

# ============================================================
# Execute Main Function
# ============================================================
main "$@"
