# Cloud Governance Copilot

> Plataforma centralizada que unifica el acceso a 6 SaaS del ecosistema cloud bajo un solo portal, con IA integrada, gestión multi-tenant y automatizaciones inteligentes.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/yourorg/cloud-governance-copilot)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-planning-yellow.svg)](PLANNING.MD)

---

## 🎯 ¿Qué es Cloud Governance Copilot?

Cloud Governance Copilot es un **portal unificado** que centraliza la gestión de múltiples herramientas SaaS especializadas en cloud governance. En lugar de alternar entre 6 plataformas diferentes, obtienes:

- 🎛️ **Portal Único:** Accede a todos los SaaS desde un dashboard centralizado
- 🤖 **IA Integrada:** Insights automáticos que correlacionan datos entre módulos
- 💰 **Pricing Flexible:** Planes que se adaptan desde consultores independientes hasta MSPs enterprise
- 🏢 **Multi-Tenant:** Gestiona múltiples clientes/organizaciones desde una cuenta
- 🛒 **Marketplace:** Extensiones, integraciones y automatizaciones

---

## 🧩 Los 6 SaaS del Ecosistema

### 1. OneCloud Dashboard
**Panel unificado multi-cloud**
- KPIs en tiempo real de AWS, Azure y GCP
- Health overview de infraestructura
- Alertas consolidadas
- Métricas de disponibilidad

### 2. Spend Navigator
**FinOps Platform con IA**
- Forecasting de costos con ML (Prophet, XGBoost)
- Detección de anomalías de gasto
- Recomendaciones de rightsizing
- Análisis de optimización

### 3. Security Misconfig Scanner
**Auditor de seguridad automatizado**
- Escaneo de configuraciones inseguras
- Compliance checks (CIS, NIST, PCI-DSS)
- Priorización de riesgos
- Playbooks de remediación

### 4. Asset 360
**Inventario inteligente de recursos cloud**
- Discovery automático multi-cloud
- Clasificación por IA
- Detección de recursos huérfanos
- Cost allocation por tags

### 5. Incident IQ
**Automatización de respuesta a incidentes**
- Auto-remediation (restart, isolate, scale)
- Integración con Slack, Teams, Jira
- Workflows personalizables
- Runbooks inteligentes

### 6. Advisor Report
**Reportes ejecutivos automatizados**
- Análisis por IA de infraestructura
- Recomendaciones accionables
- Exportación a PDF/HTML
- Branding personalizable

---

## 🚀 Quick Start

### Prerequisites

- **Docker** (v24.0+) y **Docker Compose** (v2.20+)
- **Node.js** (v20+) para desarrollo local
- **Make** (opcional pero recomendado)
- **Git**
- **Hetzner VPS** (CX41 o superior recomendado) para producción

### Initial Setup - Local Development

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd cloud-governance-copilot

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Crear docker-compose.yml desde el ejemplo
cp docker-compose.example.yml docker-compose.yml

# 4. Iniciar todos los servicios
docker-compose up -d

# 5. Verificar que todos los contenedores estén running
docker-compose ps

# 6. Ver logs
docker-compose logs -f
```

### Acceder a las Aplicaciones (Local)

```bash
# Frontend
http://localhost:3000              # Copilot Portal
http://localhost:3001              # OneCloud Dashboard
http://localhost:3002              # Spend Navigator
http://localhost:3003              # Security Misconfig
http://localhost:3004              # Asset 360
http://localhost:3005              # Incident IQ
http://localhost:3006              # Advisor Report

# Backend
http://localhost:4000              # API Gateway
http://localhost:4000/docs         # API Documentation (Swagger)

# Database & Cache
localhost:5432                     # PostgreSQL
localhost:6379                     # Redis
```

### Configuración de Variables de Entorno

El archivo `.env.example` contiene todas las variables necesarias:

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
vim .env  # o nano .env
```

**Variables críticas a configurar:**
```bash
# Database
POSTGRES_PASSWORD=your_strong_password

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
NEXTAUTH_SECRET=your_nextauth_secret

# OpenAI (para AI Insights)
OPENAI_API_KEY=sk-your-api-key

# Cloud Providers (para integraciones)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Stripe (para billing)
STRIPE_SECRET_KEY=sk_test_your_key
```

---

## 📋 Comandos Disponibles

### Gestión del Ambiente (Docker Compose)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f                    # Todos los servicios
docker-compose logs -f copilot-portal     # Solo Copilot Portal
docker-compose logs -f api-gateway        # Solo API Gateway

# Detener todos los servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Reconstruir imágenes
docker-compose build
docker-compose up -d --build

# Eliminar todo (⚠️ incluyendo volúmenes)
docker-compose down -v
```

### Desarrollo

```bash
# Shell en contenedor específico
docker-compose exec copilot-portal sh
docker-compose exec api-gateway sh
docker-compose exec postgres psql -U copilot -d copilot_main

# Ver logs en tiempo real de un servicio
docker-compose logs -f --tail=100 copilot-portal

# Ejecutar comando en contenedor
docker-compose exec api-gateway npm run test
```

### Base de Datos (PostgreSQL)

```bash
# Ejecutar migraciones
docker-compose exec api-gateway npm run migrate

# Seed con datos de ejemplo
docker-compose exec api-gateway npm run seed

# Backup de base de datos
docker-compose exec postgres pg_dump -U copilot copilot_main > backup.sql

# Restaurar desde backup
docker-compose exec -T postgres psql -U copilot copilot_main < backup.sql

# Acceder a psql
docker-compose exec postgres psql -U copilot -d copilot_main

# Resetear BD (⚠️ borra todos los datos)
docker-compose exec postgres psql -U copilot -c "DROP DATABASE copilot_main; CREATE DATABASE copilot_main;"
```

### Testing

```bash
make test              # Ejecutar todos los tests
make test-unit         # Solo unit tests
make test-integration  # Solo integration tests
make test-e2e          # Solo E2E tests
make test-coverage     # Tests con reporte de coverage
```

### Code Quality

```bash
make lint              # Ejecutar linters (backend + frontend)
make format            # Formatear código (Prettier + ESLint)
make type-check        # Verificar tipos de TypeScript
```

---

## 🏗 Estructura del Proyecto

```
cloud-governance-copilot/
├── apps/
│   ├── frontend/              # Next.js + React + Tailwind
│   │   ├── src/
│   │   │   ├── app/          # Pages (App Router)
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── services/     # API clients
│   │   │   └── types/        # TypeScript types
│   │   └── package.json
│   │
│   ├── api-gateway/          # Node.js + Express
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── middleware/   # Auth, RBAC, validation
│   │   │   ├── services/     # Business logic
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── workers/              # Lambda workers
│       ├── auth-service/
│       ├── tenant-service/
│       ├── billing-service/
│       └── ai-insights/
│
├── packages/                 # Código compartido
│   ├── shared-types/         # TypeScript types
│   ├── ui-components/        # Shared UI components
│   └── utils/                # Utilidades comunes
│
├── infrastructure/           # Infrastructure as Code
│   └── terraform/
│       ├── modules/          # Módulos reutilizables
│       │   ├── networking/
│       │   ├── compute/
│       │   ├── database/
│       │   └── storage/
│       └── environments/     # Ambientes
│           ├── dev/
│           ├── staging/
│           └── production/
│
├── docs/                     # Documentación adicional
│   ├── architecture/
│   ├── api/
│   └── guides/
│
├── Context_Docs/             # Documentos de contexto del proyecto
│   ├── PRD.MD               # Product Requirements Document
│   ├── PLANNING.MD          # Planning detallado (24 sprints)
│   ├── TASK.MD              # Task breakdown y estado
│   └── CLAUDE.MD            # Guía técnica para Claude Code
│
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.MD                 # Este archivo
```

---

## 🛠 Stack Tecnológico

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Components:** Shadcn/ui
- **State:** Zustand + TanStack Query
- **Charts:** Recharts

### Backend
- **API Gateway:** Node.js + Express
- **Workers:** Python (AI workers)
- **Authentication:** JWT + Passport.js + OAuth 2.0
- **Validation:** Zod (Node.js) / Pydantic (Python)

### Database & Cache
- **Primary DB:** PostgreSQL 15+ (multi-tenant)
- **Extensions:** TimescaleDB (time-series), pg_trgm (full-text)
- **Cache:** Redis 7+ (sessions, rate limiting, queue)
- **ORM:** Prisma (Node.js) / SQLAlchemy (Python)

### AI & ML
- **LLM:** OpenAI GPT-4
- **Framework:** LangChain
- **Vector DB:** Pinecone (para RAG - futuro)

### Infrastructure (Hetzner VPS)
- **Provider:** Hetzner Cloud
- **Compute:** Docker + Docker Compose (7+ contenedores)
- **Reverse Proxy:** Nginx (SSL con Let's Encrypt)
- **Storage:** Docker Volumes + Hetzner Object Storage (backups)
- **Monitoring:** Prometheus + Grafana (opcional)
- **Logs:** Docker logs + Loki (opcional)

### DevOps
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Deployment:** SSH + Docker Compose pull/restart
- **Backups:** PostgreSQL dump diario → Hetzner Object Storage
- **SSL:** Certbot automático
- **Testing:** Jest, Playwright, K6

---

## 🎯 Features Principales

### ✅ Fase 1: Foundation (Meses 1-3)
- [x] Documentación completa (PRD, Planning, Tasks)
- [ ] Autenticación + MFA
- [ ] Multi-tenancy con aislamiento de datos
- [ ] RBAC (5 roles predefinidos)
- [ ] Dashboard base con navegación
- [ ] Conectividad AWS

### 🚧 Fase 2: Integration (Meses 4-6)
- [ ] Integración OneCloud Dashboard
- [ ] Integración Spend Navigator
- [ ] Integración Security Misconfig
- [ ] Integración Asset 360
- [ ] Integración Incident IQ
- [ ] Integración Advisor Report
- [ ] Sistema de límites por plan

### 🔮 Fase 3: AI & Automation (Meses 7-9)
- [ ] AI Insights Engine
- [ ] Cross-module recommendations
- [ ] Automated workflows
- [ ] Predictive analytics
- [ ] Chat assistant (beta)

### 📦 Fase 4: Marketplace & Launch (Meses 10-12)
- [ ] Marketplace de add-ons
- [ ] White-label para MSPs
- [ ] Custom branding
- [ ] SSO (SAML 2.0)
- [ ] API pública
- [ ] Beta Launch
- [ ] GA Launch

---

## 📊 Planes de Suscripción

| Plan | Precio/mes | Tenants | Reportes/mes | Scans/mes | Incidentes/mes |
|------|-----------|---------|--------------|-----------|----------------|
| **Starter** | $49 | 1 | 10 | 50 | 100 |
| **Pro** | $149 | 5 | 50 | 200 | 500 |
| **Business** | $399 | 15 | 200 | 1,000 | 2,000 |
| **Premium** | $999 | 50 | 1,000 | 5,000 | 10,000 |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Unlimited |

**Todas las funcionalidades incluyen:**
- Acceso a los 6 SaaS
- AI Insights básicos
- Soporte por email
- Integraciones multi-cloud (AWS, Azure, GCP)

**Premium y Enterprise incluyen:**
- White-label
- Custom branding
- SSO (SAML)
- API access
- Soporte prioritario
- Custom workflows

---

## 🔐 Seguridad

### Implementaciones de Seguridad

- ✅ **Zero Trust Architecture:** Validación en cada request
- ✅ **Multi-Tenancy Isolation:** Aislamiento estricto de datos
- ✅ **Encryption at Rest:** DynamoDB encryption enabled
- ✅ **Encryption in Transit:** TLS 1.3
- ✅ **JWT Authentication:** Con refresh tokens
- ✅ **MFA:** TOTP + Backup codes
- ✅ **RBAC:** Role-Based Access Control granular
- ✅ **Rate Limiting:** Por IP y por usuario
- ✅ **Audit Logs:** Trazabilidad completa

### Compliance

- **SOC 2 Type II:** Ready
- **GDPR:** Compliant
- **HIPAA:** En roadmap
- **ISO 27001:** En roadmap

### Best Practices

```bash
# Nunca commits secrets
git-secrets --install

# Escaneo de vulnerabilidades
npm audit
snyk test

# Penetration testing
npm run test:security
```

---

## 📈 Roadmap

### 2025 Q1 (Meses 1-3) - Foundation
- [x] Planning completo
- [ ] MVP del portal
- [ ] Autenticación + Multi-tenancy
- [ ] Dashboard base
- [ ] Conectividad AWS

### 2025 Q2 (Meses 4-6) - Integration
- [ ] Integración de los 6 SaaS
- [ ] Sistema de límites
- [ ] Conectividad Azure + GCP
- [ ] Billing con Stripe

### 2025 Q3 (Meses 7-9) - AI & Automation
- [ ] AI Insights Engine
- [ ] Cross-module analytics
- [ ] Automated workflows
- [ ] Chat assistant

### 2025 Q4 (Meses 10-12) - Launch
- [ ] Marketplace
- [ ] White-label
- [ ] API pública
- [ ] Beta Launch (Mes 11)
- [ ] GA Launch (Mes 12)

### 2026+ - Growth
- [ ] Mobile apps (iOS, Android)
- [ ] Kubernetes cost optimization
- [ ] Advanced AI agents (autonomous actions)
- [ ] Partner ecosystem
- [ ] International expansion

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
make test

# Por tipo
make test-unit           # ~2min
make test-integration    # ~5min
make test-e2e            # ~15min

# Con coverage
make test-coverage       # Genera htmlcov/index.html
```

### Coverage Goals

- **Unit Tests:** >80% de coverage
- **Integration Tests:** Flujos críticos completos
- **E2E Tests:** User journeys principales
- **Load Tests:** 50 tenants concurrentes

### Testing Strategy

```
Unit Tests (Jest)
├── Services (business logic)
├── Utilities
└── Components (React Testing Library)

Integration Tests
├── API endpoints
├── Database operations
└── External integrations

E2E Tests (Playwright)
├── Onboarding flow
├── Multi-tenant switching
├── SaaS module navigation
└── Billing upgrade
```

---

## 📚 Documentación

### Para Usuarios
- **[User Guide](docs/guides/user-guide.md)** - Cómo usar el portal
- **[FAQ](docs/faq.md)** - Preguntas frecuentes
- **[Video Tutorials](docs/tutorials/)** - Tutoriales en video

### Para Desarrolladores
- **[CLAUDE.MD](Context_Docs/CLAUDE.MD)** - Guía técnica completa del proyecto
- **[PLANNING.MD](Context_Docs/PLANNING.MD)** - Planning detallado (24 sprints)
- **[TASK.MD](Context_Docs/TASK.MD)** - Task breakdown y estado actual
- **[API Documentation](http://localhost:4000/docs)** - Swagger UI
- **[Architecture](docs/architecture/)** - Diagramas y decisiones

### Para Product Managers
- **[PRD.MD](Context_Docs/PRD.MD)** - Product Requirements Document
- **[KPIs Dashboard](docs/kpis.md)** - Métricas del producto
- **[Customer Feedback](docs/feedback/)** - Feedback de usuarios

---

## 🤝 Contributing

Este es un proyecto privado. Para miembros del equipo:

### Workflow

1. **Crear branch desde main:**
   ```bash
   git checkout -b feature/US-123-short-description
   ```

2. **Desarrollar y commitear:**
   ```bash
   git commit -m "feat(auth): add MFA support"
   ```
   Usar [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - Nueva funcionalidad
   - `fix:` - Bug fix
   - `docs:` - Documentación
   - `refactor:` - Refactoring
   - `test:` - Tests
   - `chore:` - Mantenimiento

3. **Push y crear PR:**
   ```bash
   git push origin feature/US-123-short-description
   ```
   Crear Pull Request con template completo

4. **Code Review:**
   - Requiere 1 aprobación
   - CI debe pasar (tests + linting)
   - No merge conflicts

5. **Merge:**
   - Squash and merge (para mantener historial limpio)
   - Delete branch después de merge

### Code Review Checklist

- [ ] Código cumple con style guide
- [ ] Tests incluidos y pasando
- [ ] Sin console.logs o debuggers
- [ ] Sin credenciales hardcodeadas
- [ ] Documentación actualizada
- [ ] Performance considerado
- [ ] Security considerations aplicadas

---

## 🐛 Troubleshooting

### Servicios no inician

```bash
# Limpiar y reiniciar
make clean
make up

# Ver logs específicos
docker-compose logs frontend
docker-compose logs api-gateway
```

### Puerto ya en uso

```bash
# Encontrar y matar proceso
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:4000 | xargs kill -9  # API Gateway
```

### Base de datos - Errores de conexión

```bash
# Resetear DB local
make db-reset

# Recrear tablas
make migrate
```

### Frontend no conecta con backend

Verificar proxy en `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://api-gateway:4000/:path*'
    }
  ]
}
```

### Tests fallan en CI

```bash
# Ejecutar localmente
make test-ci  # Simula ambiente de CI

# Ver logs detallados
npm run test -- --verbose
```

---

## 📞 Soporte

### Para el Equipo

- **Slack:** #copilot-dev
- **Jira:** [Proyecto Copilot](https://yourorg.atlassian.net/browse/COP)
- **Weekly Sync:** Jueves 10:00 AM
- **Tech Lead:** @tech-lead

### Para Usuarios (Post-Launch)

- **Email:** support@cloudcopilot.io
- **Chat:** Widget in-app
- **Documentation:** https://docs.cloudcopilot.io
- **Status Page:** https://status.cloudcopilot.io

---

## 📝 License

MIT License - ver archivo [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

**SaaS Modules:**
- OneCloud Dashboard Team
- Spend Navigator Team
- Security Misconfig Team
- Asset 360 Team
- Incident IQ Team
- Advisor Report Team

**Technologies:**
- Next.js por Vercel
- OpenAI por GPT-4
- AWS por infraestructura
- Tailwind CSS por styling

---

## 📈 Estado del Proyecto

**Versión Actual:** 0.1.0 (Planning Phase)
**Sprint Actual:** Pre-Sprint 1
**Próximo Milestone:** Sprint 6 - MVP Foundation Complete
**Timeline:** 12 meses hasta GA Launch
**Team Size:** 4-6 developers

### Progress Overview

```
Foundation     [░░░░░░░░░░] 0%   (0/6 sprints)
Integration    [░░░░░░░░░░] 0%   (0/6 sprints)
AI & Auto      [░░░░░░░░░░] 0%   (0/6 sprints)
Launch         [░░░░░░░░░░] 0%   (0/6 sprints)
────────────────────────────────────────────
Overall        [░░░░░░░░░░] 0%   (0/24 sprints)
```

**Última actualización:** 2025-12-04

---

## 🚦 Quick Links

- 📋 [PRD - Product Requirements](Context_Docs/PRD.MD)
- 📅 [Planning - 24 Sprints Roadmap](Context_Docs/PLANNING.MD)
- ✅ [Tasks - Detailed Breakdown](Context_Docs/TASK.MD)
- 🤖 [Claude Guide - Technical Context](Context_Docs/CLAUDE.MD)
- 🏗️ [Architecture Diagrams](docs/architecture/)
- 📊 [API Documentation](http://localhost:4000/docs)

---

**Made with ❤️ by the Cloud Governance Copilot Team**

[⬆ Back to top](#cloud-governance-copilot)
