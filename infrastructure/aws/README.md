# AWS Deployment - Cloud Governance Copilot

## Prerequisites

1. AWS Account with admin access
2. Terraform installed (`brew install terraform`)
3. AWS CLI configured (`aws configure`)
4. Domain name (for SSL certificates)

## Quick Deploy

```bash
# 1. Initialize Terraform
terraform init

# 2. Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region    = "us-east-1"
environment   = "production"
db_password   = "CHANGE_THIS_PASSWORD"
frontend_image = "ghcr.io/technessoluciones/copilot-frontend:latest"
backend_image  = "ghcr.io/technessoluciones/copilot-api-gateway:latest"
EOF

# 3. Plan deployment
terraform plan -out=tfplan

# 4. Apply
terraform apply tfplan
```

## Architecture

```
Internet
   │
   ├─> CloudFront CDN (static assets)
   │
   └─> Application Load Balancer
          │
          ├─> ECS Fargate (Frontend) x2+
          │   └─> Next.js on port 3000
          │
          ├─> ECS Fargate (Backend) x2+
          │   └─> Express API on port 3010
          │
          ├─> RDS PostgreSQL (Multi-AZ)
          │   └─> Primary + Read Replica
          │
          └─> ElastiCache Redis (Multi-AZ)
              └─> Primary + Replica
```

## Costs Estimate

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 4 tasks (0.5 vCPU, 1GB each) | ~$80 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$100 |
| ElastiCache Redis | cache.t3.micro x2 | ~$30 |
| Application Load Balancer | Standard | ~$20 |
| CloudFront | 1TB transfer | ~$85 |
| S3 | 100GB storage | ~$3 |
| **Total** | | **~$318/month** |

Cost optimization:
- Use Reserved Instances: Save 30-50%
- Use Spot for non-critical: Save up to 70%
- Estimated with reservations: **~$200-220/month**

## Monitoring

AWS provides built-in monitoring:
- CloudWatch Logs (centralized logging)
- CloudWatch Metrics (CPU, memory, requests)
- Container Insights (ECS-specific metrics)
- X-Ray (distributed tracing)

## Scaling

Auto-scaling configured for:
- Frontend: 2-10 tasks
- Backend: 2-10 tasks

Triggers:
- CPU > 70% → scale up
- CPU < 30% → scale down
- Custom metrics (request latency, error rate)

## Security

- All traffic encrypted (TLS 1.3)
- Database encryption at rest
- Redis encryption in transit
- IAM roles with least privilege
- Security groups (network firewalls)
- WAF rules for common attacks
- GuardDuty threat detection
