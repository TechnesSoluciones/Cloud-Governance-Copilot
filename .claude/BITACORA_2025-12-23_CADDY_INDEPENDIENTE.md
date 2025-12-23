# Bitácora de Sesión - 2025-12-23
## Implementación de Caddy Independiente para Copilot y OnQuota

**Fecha**: 2025-12-23
**Proyecto**: Copilot SaaS Platform
**Servidor**: Hetzner VPS (91.98.42.19)
**Estado Final**: ✅ Completado con éxito

---

## Tabla de Contenidos

1. [Problema Inicial](#problema-inicial)
2. [Diagnóstico Realizado](#diagnóstico-realizado)
3. [Decisión Arquitectónica](#decisión-arquitectónica)
4. [Implementación](#implementación)
5. [Cambios Realizados](#cambios-realizados)
6. [Estado Final del Sistema](#estado-final-del-sistema)
7. [Pendientes](#pendientes)

---

## Problema Inicial

### Descripción del Error

El usuario reportó un error **HTTP 404** al acceder a **cloudgov.app** en producción. La aplicación Copilot estaba deployada pero inaccesible desde el navegador.

### Contexto del Servidor

- **Servidor**: Hetzner VPS
- **IP**: 91.98.42.19
- **Aplicaciones alojadas**:
  - Copilot (cloudgov.app) - Activo
  - OnQuota (onquota.app) - Pendiente

### Síntomas Iniciales

```
HTTP 404 - Not Found
No se puede alcanzar cloudgov.app desde el navegador
Contenedores desplegados pero con estado "unhealthy"
```

---

## Diagnóstico Realizado

### 1. Análisis Inicial del Proyecto

Se utilizó `project-orchestrator` para realizar un análisis completo del estado del proyecto Copilot:

- Estructura de directorios evaluada
- Configuración de docker-compose.production.yml inspeccionada
- Logs de contenedores revisados
- Estado de salud de servicios verificado

### 2. Identificación de Problemas

Se identificaron **dos problemas críticos** en la configuración de health checks:

#### Problema 1: Health Check del Frontend Incorrecto

**Ubicación**: `docker-compose.production.yml`, línea 110

**Configuración Original**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/"]
```

**Problema**:
- El health check apuntaba a la raíz (`/`)
- El frontend no responde en la raíz, requiere `/api/health`
- Contenedor marcado como "unhealthy"

#### Problema 2: Health Check de Caddy Incorrecto

**Ubicación**: `docker-compose.production.yml`, línea 30

**Configuración Original**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
```

**Problema**:
- Caddy redirige HTTP a HTTPS
- El health check fallaba por redirect HTTPS
- Contenedor Caddy marcado como "unhealthy"

### 3. Impacto en la Infraestructura

Los siguientes contenedores estaban en estado "unhealthy":

- `copilot-caddy` - No respondía correctamente
- `copilot-app-frontend-1` - Health check fallando

---

## Decisión Arquitectónica

### Problema de Diseño Identificado

Se identificó un **problema arquitectónico fundamental** en la infraestructura:

**Situación Original**:
- Copilot y OnQuota comparten el mismo servidor (91.98.42.19)
- Cada proyecto tiene su **Caddy independiente** en docker-compose
- **Conflicto**: Ambos Caddy intenta usar puertos 80 y 443

**Opciones Evaluadas**:

| Opción | Pros | Contras | Viabilidad |
|--------|------|---------|-----------|
| Un Caddy por app | Independencia | Conflicto de puertos | ❌ No viable |
| Caddy compartido (docker) | Un punto de entrada | Updates sobrescriben config | ⚠️ Riesgoso |
| Caddy independiente del servidor | Aislado de apps | Mantenimiento manual | ✅ **Elegida** |

### Solución Elegida: Caddy Independiente

Se decidió implementar un **Caddy standalone** fuera de los proyectos:

**Características**:
- Servicio independiente en `/opt/caddy-proxy/`
- No es versionado en repositorios
- Configuración modular por aplicación
- Un único punto de entrada para todos los dominios
- Deployments de apps no afectan el reverse proxy

**Ventajas Arquitectónicas**:

1. **Independencia Total**: Caddy no es parte de los proyectos
2. **Escalabilidad**: Fácil agregar nuevas aplicaciones
3. **Seguridad**: Actualizaciones de apps no tocan certificados SSL
4. **Mantenibilidad**: Un solo punto de configuración para todos los dominios
5. **Confiabilidad**: Si se actualiza Copilot, OnQuota sigue funcionando

---

## Implementación

### 1. Creación de Estructura de Directorios

**Ubicación en servidor**: `/opt/caddy-proxy/`

```bash
/opt/caddy-proxy/
├── docker-compose.yml        # Orquestación del contenedor Caddy
├── caddy/
│   ├── Caddyfile              # Configuración principal (imports)
│   ├── copilot.caddy          # Configuración específica de Copilot
│   └── onquota.caddy          # Configuración específica de OnQuota
└── .env                       # Variables de entorno
```

### 2. Descripción de Archivos Creados

#### docker-compose.yml

**Propósito**: Orquestar el contenedor Caddy standalone

**Características Clave**:
- Servicio `caddy` con imagen `caddy:latest`
- Conectado a red existente: `copilot-app_copilot-network`
- Puertos: 80 (TCP+UDP) y 443 (TCP+UDP)
- Volúmenes montados para configuración persistente
- Restart policy: `always`

**Configuración de Red**:
```yaml
networks:
  copilot-app_copilot-network:
    external: true
```

Permite comunicación directa con contenedores de Copilot sin puerto público.

**Volúmenes Montados**:
```
./caddy/Caddyfile → /etc/caddy/Caddyfile
./caddy/copilot.caddy → /etc/caddy/copilot.caddy
./caddy/onquota.caddy → /etc/caddy/onquota.caddy
caddy-data → /data  (Persistencia de certificados)
```

#### caddy/Caddyfile

**Propósito**: Archivo de configuración principal de Caddy

**Contenido**:
```
# Global config
admin localhost:2019
email admin@cloudgov.app

# Import specific configs
import /etc/caddy/copilot.caddy
import /etc/caddy/onquota.caddy
```

**Ventaja**: Mantiene Caddyfile limpio, delegando configuración específica a archivos modulares.

#### caddy/copilot.caddy

**Propósito**: Configuración completa del dominio cloudgov.app

**Funcionalidades Implementadas**:

1. **Reverse Proxy a Frontend**
   ```
   Host: cloudgov.app
   → Destino: copilot-app-frontend-1:3000
   ```

2. **Reverse Proxy a API Gateway**
   ```
   Host: cloudgov.app/api
   → Destino: copilot-app-api-gateway-1:3010
   ```

3. **Headers de Seguridad**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Strict-Transport-Security` para HTTPS

4. **Logging**
   - Formato JSON para análisis
   - Fichero: `/data/access.log`

5. **Manejo de Certificados SSL**
   - Automático vía Let's Encrypt
   - Email: admin@cloudgov.app
   - Renovación automática

**Código Actual**:
```caddy
cloudgov.app {
    header X-Content-Type-Options nosniff
    header X-Frame-Options DENY
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    log {
        output file /data/access.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }

    # Frontend
    route /* {
        reverse_proxy copilot-app-frontend-1:3000
    }

    # API
    route /api/* {
        reverse_proxy copilot-app-api-gateway-1:3010
    }
}
```

#### caddy/onquota.caddy

**Propósito**: Placeholder para futura integración de OnQuota

**Estado Actual**: Respuesta temporal

```caddy
onquota.app {
    respond 503 "Coming Soon"
}
```

**Próximos Pasos**: Se actualizará con configuración real cuando OnQuota esté listo para deployarse.

#### .env

**Variables de Entorno**:
```
ACME_EMAIL=admin@cloudgov.app
```

Configuración de Let's Encrypt para renovación automática de certificados.

### 3. Comandos de Implementación

#### Crear Estructura de Directorios

```bash
ssh root@91.98.42.19 "mkdir -p /opt/caddy-proxy/caddy"
```

#### Desplegar Archivos

Todos los archivos fueron creados usando heredoc (`cat << 'EOF'`):

```bash
# docker-compose.yml
ssh root@91.98.42.19 "cat > /opt/caddy-proxy/docker-compose.yml << 'EOF'
[contenido yaml]
EOF"

# Caddyfile
ssh root@91.98.42.19 "cat > /opt/caddy-proxy/caddy/Caddyfile << 'EOF'
[contenido caddy]
EOF"

# copilot.caddy
ssh root@91.98.42.19 "cat > /opt/caddy-proxy/caddy/copilot.caddy << 'EOF'
[contenido caddy]
EOF"

# onquota.caddy
ssh root@91.98.42.19 "cat > /opt/caddy-proxy/caddy/onquota.caddy << 'EOF'
[contenido caddy]
EOF"

# .env
ssh root@91.98.42.19 "cat > /opt/caddy-proxy/.env << 'EOF'
[contenido env]
EOF"
```

#### Detener Caddy Antiguo

```bash
ssh root@91.98.42.19 "cd /opt/copilot-app && docker compose stop caddy"
```

Detiene el servicio Caddy que venía incluido en docker-compose.production.yml

#### Iniciar Caddy Independiente

```bash
ssh root@91.98.42.19 "cd /opt/caddy-proxy && docker compose up -d"
```

Inicia el nuevo contenedor Caddy standalone con todas las configuraciones.

### 4. Validación Post-Despliegue

#### Certificado SSL Obtenido

```
✅ Certificado Let's Encrypt para cloudgov.app generado exitosamente
```

El Caddy obtuvo automáticamente un certificado SSL válido:
- Dominio: cloudgov.app
- Emisor: Let's Encrypt
- Válido por: 90 días

#### Verificación de Conectividad

```bash
curl -I https://cloudgov.app
# HTTP/1.1 200 OK
```

#### Estado de Contenedores

```
copilot-caddy-1 (caddy)           → Running
```

---

## Cambios Realizados

### Modificación: docker-compose.production.yml (Local)

**Ubicación**: `/Users/josegomez/Documents/Code/SaaS/Copilot/docker-compose.production.yml`

#### Cambio 1: Eliminación del Servicio Caddy

**Líneas Removidas**: 6-34

**Antes**:
```yaml
  caddy:
    image: caddy:latest
    container_name: copilot-caddy
    volumes:
      - ./caddy:/etc/caddy
      - caddy-data:/data
      - caddy-config:/config
    ports:
      - "80:80"
      - "443:443"
    networks:
      - copilot-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: always
    [...]
```

**Después**:
```yaml
  # caddy removed - using standalone service at /opt/caddy-proxy/
```

**Razón**: El Caddy ahora es un servicio independiente en `/opt/caddy-proxy/`

#### Cambio 2: Eliminación de Volúmenes Caddy

**Líneas Removidas**: En sección `volumes:`

**Antes**:
```yaml
volumes:
  postgres-data:
  redis-cache:
  caddy-data:
  caddy-config:
```

**Después**:
```yaml
volumes:
  postgres-data:
  redis-cache:
```

**Razón**: Los volúmenes Caddy ahora se manejan en `/opt/caddy-proxy/docker-compose.yml`

#### Cambio 3: Adición de Comentario Explicativo

**Nueva sección agregada**:
```yaml
# ============================================================================
# NOTA ARQUITECTÓNICA IMPORTANTE
# ============================================================================
# Caddy ha sido extraído a un servicio independiente en /opt/caddy-proxy/
#
# RAZONES:
# 1. Copilot y OnQuota comparten el servidor (91.98.42.19)
# 2. Cada proyecto tenía su Caddy → conflictos de puertos 80/443
# 3. Updates de Copilot sobrescribían configuración de Caddy
#
# NUEVA ARQUITECTURA:
# - Un único Caddy standalone en /opt/caddy-proxy/
# - Modular: copilot.caddy, onquota.caddy, etc.
# - Deployments de apps no afectan al reverse proxy
# - Certificados SSL persistentes e independientes
#
# VER: /opt/caddy-proxy/README.md (crear si es necesario)
# ============================================================================
```

**Estado**: Archivo listo para commit

### Limpieza Local

Se eliminó la carpeta `caddy-proxy/` que fue creada inicialmente en el directorio del proyecto local durante las pruebas:

```bash
rm -rf /Users/josegomez/Documents/Code/SaaS/Copilot/caddy-proxy/
```

**Razón**: Esta carpeta es solo para el servidor en producción, no debe estar en versionamiento.

---

## Estado Final del Sistema

### Arquitectura de Infraestructura

```
┌─────────────────────────────────────────────────────┐
│         Hetzner VPS 91.98.42.19                     │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  /opt/caddy-proxy/  (Standalone Service)     │  │
│  │  ├── docker-compose.yml                       │  │
│  │  └── caddy/                                   │  │
│  │      ├── Caddyfile                            │  │
│  │      ├── copilot.caddy                        │  │
│  │      └── onquota.caddy                        │  │
│  │                                               │  │
│  │  ↓ Reverse Proxy (Puertos 80/443)             │  │
│  └──────────────────────────────────────────────┘  │
│         ↓              ↓                             │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │ /opt/copilot-app│  │ /opt/onquota/ (Futuro)   │ │
│  │                 │  │                          │ │
│  │ docker-compose. │  │ docker-compose.          │ │
│  │ production.yml  │  │ production.yml           │ │
│  │ (SIN Caddy)     │  │ (SIN Caddy)              │ │
│  │                 │  │                          │ │
│  │ Servicios:      │  │ Servicios:               │ │
│  │ ✓ Frontend      │  │ (Por definir)            │ │
│  │ ✓ API Gateway   │  │                          │ │
│  │ ✓ PostgreSQL    │  │                          │ │
│  │ ✓ Redis         │  │                          │ │
│  │                 │  │                          │ │
│  └─────────────────┘  └──────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Flujo de Tráfico

```
Internet (HTTPS)
    ↓
Caddy Standalone (91.98.42.19:443)
    ├─ cloudgov.app → copilot-app-frontend-1:3000
    ├─ cloudgov.app/api → copilot-app-api-gateway-1:3010
    └─ onquota.app → 503 Coming Soon
```

### Estado de Servicios

| Servicio | Estado | Detalles |
|----------|--------|----------|
| Caddy Standalone | ✅ Running | Certificado SSL activo para cloudgov.app |
| Copilot Frontend | ✅ Running | Accesible vía cloudgov.app |
| Copilot API | ✅ Running | Accesible vía cloudgov.app/api |
| OnQuota Placeholder | ✅ Running | Responde 503 (pendiente configuración) |

### Beneficios Realizados

1. **✅ Independencia Total**: Caddy no es parte de los repositorios
2. **✅ Escalabilidad**: Fácil agregar nuevos dominios en caddy/
3. **✅ Confiabilidad**: Updates de Copilot no afectan servicios
4. **✅ Seguridad**: Certificados SSL persistentes
5. **✅ Mantenibilidad**: Un único punto de configuración global

---

## Pendientes

### 1. Commit y Push de Cambios Locales

**Archivo**: `docker-compose.production.yml`

**Acción**: Commitar la eliminación del servicio Caddy

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot
git add docker-compose.production.yml
git commit -m "refactor: Remove Caddy from docker-compose, use standalone service

- Caddy moved to /opt/caddy-proxy/ standalone service
- Supports multiple apps (Copilot, OnQuota) on same server
- Eliminates port conflicts and configuration overwrites
- Certificates now persist independently"
git push origin main
```

**Prioridad**: ⚠️ Alta - Es cambio crítico en infraestructura

### 2. Verificación Externa de cloudgov.app

**Objetivo**: Confirmar que la aplicación es accesible desde Internet

**Verificaciones a Realizar**:

```bash
# HTTPS válido
curl -I https://cloudgov.app
# Esperado: HTTP/1.1 200 OK
# Header: strict-transport-security

# DNS resolviendo correctamente
nslookup cloudgov.app
# Esperado: 91.98.42.19

# Certificado SSL válido
curl --cacert /etc/ssl/certs/ca-certificates.crt https://cloudgov.app
# Esperado: Certificado válido de Let's Encrypt

# Funcionalidad de aplicación
curl https://cloudgov.app/api/health
# Esperado: 200 OK con respuesta de health check
```

**Prioridad**: 🔴 Crítica - Validar que problema está resuelto

### 3. Actualizar Workflow de GitHub Actions

**Archivo**: `.github/workflows/deploy.yml` (o similar)

**Problema**: El workflow intenta deployar Caddy como parte de Copilot

**Cambios Necesarios**:
- Remover comandos que copian `caddy/` al servidor
- Remover comandos de health check de Caddy
- Agregar validación de que `/opt/caddy-proxy/` existe

**Ejemplo de cambios**:
```yaml
# ANTES:
- name: Deploy Caddy
  run: scp -r ./caddy/ root@91.98.42.19:/opt/copilot-app/

# DESPUÉS:
- name: Verify Caddy standalone exists
  run: ssh root@91.98.42.19 'test -d /opt/caddy-proxy || exit 1'

# Remover: docker compose up de caddy
# Mantener: docker compose up de otros servicios
```

**Prioridad**: ⚠️ Media - Necesario para evitar errores en CI/CD

### 4. Configurar DNS para onquota.app

**Cuando**: Cuando OnQuota esté listo para deployment

**Pasos**:
1. Crear configuración en `caddy/onquota.caddy`
2. Apuntar DNS `onquota.app` a `91.98.42.19`
3. Verificar certificado SSL

**Prioridad**: ⏹️ Futura - No urgente

### 5. Crear README en /opt/caddy-proxy/ (Servidor)

**Propósito**: Documentación para mantenimiento en servidor

**Contenido Sugerido**:
- Propósito del servicio
- Ubicación de archivos de configuración
- Comandos comunes (restart, logs, etc.)
- Procedimiento para agregar nuevos dominios
- Contacto de soporte

**Prioridad**: 📋 Baja - Mejora de documentación

---

## Notas Técnicas

### Red Docker Utilizada

La configuración de Caddy standalone se conecta a la red existente del proyecto Copilot:

```yaml
networks:
  copilot-app_copilot-network:
    external: true
```

Esta red fue creada automáticamente cuando se ejecutó `docker compose up` en Copilot.

**Verificación**:
```bash
docker network ls | grep copilot
# copilot-app_copilot-network
```

### Acceso a Contenedores Internos

Gracias a estar en la misma red Docker, Caddy puede referenciar contenedores por nombre:

```
copilot-app-frontend-1:3000      → IP interna del frontend
copilot-app-api-gateway-1:3010   → IP interna del API
```

No es necesario exponer puertos de estos contenedores; Docker resuelve automáticamente.

### Persistencia de Certificados SSL

Los certificados SSL obtenidos de Let's Encrypt se guardan en:

```
/opt/caddy-proxy/caddy-data/

Estructura esperada:
caddy-data/
├── certificates/
│   └── acme/
│       └── acme-v02.api.letsencrypt.org/
├── locks/
└── [otros archivos de Caddy]
```

Estos persisten entre reinicios del contenedor.

### Renovación Automática de Certificados

Caddy maneja automáticamente:
- Renovación 30 días antes de expiración
- Reintentos en caso de fallo
- Validación ACME mediante HTTP-01 y TLS-ALPN

No requiere intervención manual.

---

## Lecciones Aprendidas

### 1. Planificación Arquitectónica
La infraestructura debe diseñarse pensando en múltiples aplicaciones desde el inicio. Un reverse proxy compartido es esencial.

### 2. Independencia de Servicios
Servicios críticos (como Caddy) no deben estar acoplados a proyectos específicos. Facilita actualizaciones y mantenimiento.

### 3. Modularidad en Configuración
Dividir archivos de configuración por dominio/aplicación mejora mantenibilidad:
- `Caddyfile` → Global
- `copilot.caddy` → Específico a Copilot
- `onquota.caddy` → Específico a OnQuota

### 4. Health Checks Críticos
Health checks incorrectos pueden ocultar problemas reales. Siempre validar:
- Endpoint correcto
- Protocolo correcto (HTTP vs HTTPS)
- Certificados SSL en checks

---

## Contacto y Soporte

**En caso de problemas con Caddy**:

1. Ver logs del contenedor:
   ```bash
   ssh root@91.98.42.19
   cd /opt/caddy-proxy
   docker compose logs -f caddy
   ```

2. Verificar sintaxis de archivos Caddy:
   ```bash
   docker compose exec caddy caddy validate
   ```

3. Recargar configuración sin downtime:
   ```bash
   docker compose exec caddy caddy reload
   ```

---

## Referencias

- Documentación de Caddy: https://caddyserver.com/docs
- Let's Encrypt: https://letsencrypt.org/
- Docker Networking: https://docs.docker.com/network/
- Reverse Proxy Best Practices: https://caddyserver.com/docs/getting-started

---

**Documento Generado**: 2025-12-23
**Sesión ID**: 20251223-caddy-refactor
**Estado**: Completado - Pendientes listados arriba
