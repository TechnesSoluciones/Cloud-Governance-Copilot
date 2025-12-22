# Deployment Guide - Cloud Governance Copilot

## 🎯 Overview

This guide covers deployment strategies for different environments:
- **Development/Staging**: Hetzner VPS (Current setup)
- **Production**: AWS or Azure (Future)

---

## 🚀 Quick Start - Development Environment

### Current Setup (Hetzner - 2 VPS)

```bash
# Server 1: Database (46.224.33.191)
- PostgreSQL 15
- Backups

# Server 2: Applications (91.98.42.19)
- Docker Compose
  - Frontend (Next.js)
  - Backend (Express)
  - Redis
  - Nginx
```

### Fix Frontend Build Issues (Immediate)

```bash
# 1. Clean build and rebuild
./fix-frontend-now.sh

# 2. Deploy to server
./deploy-frontend.sh

# 3. Verify
curl http://91.98.42.19:3000/api/health
```

---

## 🛠️ Development Workflow

### Local Development with Docker Compose

```bash
# 1. Copy environment file
cp .env.development.example .env.development

# 2. Start development environment
docker compose -f docker-compose.dev.yml up

# 3. Access services
Frontend:  http://localhost:3000
Backend:   http://localhost:3010
Redis:     redis://localhost:6379
```

### Benefits of Dev Setup
- ✅ **Hot Reload**: Code changes reflect immediately
- ✅ **Isolated Services**: Debug frontend without affecting backend
- ✅ **Network Inspection**: Fixed IPs for easy debugging
- ✅ **Volume Mounts**: No rebuild needed for code changes

### Debugging

```bash
# Frontend logs
docker logs -f copilot-frontend-dev

# Backend logs
docker logs -f copilot-api-dev

# Redis logs
docker logs -f copilot-redis-dev

# Attach debugger (VS Code)
# Frontend: localhost:9230
# Backend:  localhost:9229
```

---

## 📦 Building for Production

### Option 1: Hetzner (Current - Staging)

```bash
# 1. Build with proper BUILD_ID
GIT_SHA=$(git rev-parse --short HEAD)

# 2. Build images
docker compose -f docker-compose.production.yml build

# 3. Push to registry
docker compose -f docker-compose.production.yml push

# 4. Deploy
ssh root@91.98.42.19 << 'EOF'
  cd /opt/copilot-app
  docker compose pull
  docker compose up -d
EOF
```

### Option 2: AWS (Production - Future)

See `infrastructure/aws/README.md` for detailed setup.

**Quick Deploy to AWS:**
```bash
# Using AWS ECS Fargate
cd infrastructure/aws
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

**Architecture:**
```
Route 53 → CloudFront → ALB → ECS Fargate
                              ├─ Frontend (2+ tasks)
                              ├─ Backend (2+ tasks)
                              └─ Redis (ElastiCache)

RDS PostgreSQL (Multi-AZ)
S3 (Static assets)
```

### Option 3: Azure (Production - Alternative)

See `infrastructure/azure/README.md` for detailed setup.

**Quick Deploy to Azure:**
```bash
# Using Azure Container Apps
cd infrastructure/azure
az login
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

**Architecture:**
```
Azure Front Door → Azure Container Apps
                    ├─ Frontend (2+ replicas)
                    ├─ Backend (2+ replicas)
                    └─ Azure Cache for Redis

Azure Database for PostgreSQL
Azure Blob Storage
```

---

## 🔧 Troubleshooting

### Frontend: "Failed to find Server Action" Error

**Cause**: BUILD_ID mismatch between client and server

**Solution**:
```bash
# 1. Clear browser cache completely (Ctrl+Shift+Del)
# 2. Rebuild with proper BUILD_ID
./fix-frontend-now.sh
# 3. Deploy
./deploy-frontend.sh
```

### Frontend: Container Unhealthy

**Cause**: Health check failing

**Debug**:
```bash
# Check if app is responding
ssh root@91.98.42.19 "docker exec copilot-frontend curl http://localhost:3000/api/health"

# Check health check config
ssh root@91.98.42.19 "docker inspect copilot-frontend | grep -A 10 Healthcheck"

# View logs
ssh root@91.98.42.19 "docker logs copilot-frontend --tail 100"
```

### Backend: Database Connection Issues

**Debug**:
```bash
# Test connection from backend container
ssh root@91.98.42.19 "docker exec copilot-api-gateway node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\\\$connect().then(() => console.log('Connected')).catch(console.error);
\""

# Check DATABASE_URL
ssh root@91.98.42.19 "docker exec copilot-api-gateway env | grep DATABASE_URL"
```

### Redis: Connection Refused

**Debug**:
```bash
# Test Redis
ssh root@91.98.42.19 "docker exec copilot-redis redis-cli ping"

# Check Redis password
ssh root@91.98.42.19 "docker exec copilot-redis redis-cli -a \$REDIS_PASSWORD ping"
```

---

## 📊 Monitoring

### Health Endpoints

```bash
# Frontend
curl http://91.98.42.19:3000/api/health

# Backend
curl http://91.98.42.19:3010/health

# Database (from app server)
ssh root@91.98.42.19 "curl http://46.224.33.191:5432"  # Should refuse
```

### Docker Stats

```bash
# All containers
ssh root@91.98.42.19 "docker stats --no-stream"

# Specific container
ssh root@91.98.42.19 "docker stats copilot-frontend --no-stream"
```

---

## 🔐 Security Checklist

### Development/Staging
- [ ] Change default passwords in `.env.development`
- [ ] Use SSH keys (not passwords) for server access
- [ ] Enable UFW firewall on servers
- [ ] Keep Docker images updated
- [ ] Use non-root users in containers

### Production (AWS/Azure)
- [ ] Enable AWS GuardDuty / Azure Security Center
- [ ] Use managed databases (RDS/Azure Database)
- [ ] Enable encryption at rest and in transit
- [ ] Use secrets manager (AWS Secrets Manager / Azure Key Vault)
- [ ] Configure WAF rules
- [ ] Enable DDoS protection
- [ ] Set up CloudTrail / Azure Monitor
- [ ] Implement least privilege IAM policies

---

## 🔄 Migration Path: Hetzner → AWS/Azure

### Phase 1: Preparation (1-2 weeks)
1. Test application with managed services:
   - Replace PostgreSQL with AWS RDS
   - Replace Redis with ElastiCache
2. Setup CI/CD for cloud deployment
3. Configure infrastructure as code (Terraform)

### Phase 2: Parallel Running (1 week)
1. Deploy to cloud alongside Hetzner
2. Route 10% of traffic to cloud (DNS weighted routing)
3. Monitor performance and costs
4. Fix any cloud-specific issues

### Phase 3: Full Migration (1 week)
1. Increase cloud traffic to 50%
2. Final data migration
3. Route 100% traffic to cloud
4. Keep Hetzner as backup for 1 month
5. Decommission Hetzner

---

## 📈 Scaling Strategy

### Horizontal Scaling Triggers

**Add more replicas when:**
- CPU > 70% for 5+ minutes
- Memory > 80% for 5+ minutes
- Request latency p95 > 500ms
- Error rate > 1%

**Implementation:**
```yaml
# AWS ECS Auto Scaling
resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

---

## 💰 Cost Optimization

### Current Costs (Hetzner)
```
DB Server (CPX31):     €13/month
App Server (CPX41):    €24/month
Total:                 €37/month
```

### Projected Costs (AWS - Basic)
```
RDS PostgreSQL (db.t3.medium):      $50/month
ElastiCache Redis (cache.t3.micro): $15/month
ECS Fargate (2 frontend + 2 backend): $80/month
ALB:                                $20/month
CloudFront:                         $10/month
S3:                                 $5/month
Total:                              ~$180/month
```

### Cost Optimization Tips
1. Use Reserved Instances (save 30-50%)
2. Use Spot Instances for non-critical workloads
3. Enable S3 Intelligent Tiering
4. Use CloudFront caching aggressively
5. Right-size instances based on actual usage

---

## 📝 Next Steps

1. ✅ **Fix current frontend issues**
   ```bash
   ./fix-frontend-now.sh && ./deploy-frontend.sh
   ```

2. ✅ **Setup local development**
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. ⏳ **Plan cloud migration** (when ready)
   - Choose AWS or Azure
   - Review `infrastructure/aws/` or `infrastructure/azure/`
   - Test with staging deployment

---

## 🆘 Support

### Internal
- Architecture questions: Review this guide
- Deployment issues: Check troubleshooting section
- Performance issues: Check monitoring dashboards

### External
- Hetzner: https://docs.hetzner.com/
- AWS: https://docs.aws.amazon.com/
- Azure: https://learn.microsoft.com/azure/
- Next.js: https://nextjs.org/docs
- Docker: https://docs.docker.com/

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintainer**: Jose Gomez
