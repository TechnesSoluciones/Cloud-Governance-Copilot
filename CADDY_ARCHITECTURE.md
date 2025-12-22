# Arquitectura con Caddy Reverse Proxy

## Descripción General

Este proyecto usa **Caddy** como reverse proxy para manejar todo el tráfico HTTP/HTTPS y enrutar las peticiones a los servicios internos. Esta arquitectura proporciona seguridad, rendimiento y simplicidad operacional.

## Arquitectura de Red

```
Internet
   │
   │ HTTPS (443) / HTTP (80)
   │
   ▼
┌─────────────────────────────────────────┐
│         Caddy Reverse Proxy             │
│  - SSL/TLS Automático (Let's Encrypt)   │
│  - HTTP → HTTPS Redirect                │
│  - Security Headers                     │
└─────────────┬───────────────────────────┘
              │
              │ Red Interna Docker
              │ (copilot-network)
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌──────────────┐
│ Frontend │    │ API Gateway  │
│ (3000)   │    │ (3010)       │
└────┬─────┘    └──────┬───────┘
     │                 │
     │                 │
     └────────┬────────┘
              │
              ▼
         ┌────────┐
         │ Redis  │
         │ (6379) │
         └────────┘
```

## Flujo de Peticiones

### 1. Cliente → Frontend (Navegador)

```
Usuario → https://tudominio.com
         ↓
      Caddy (puerto 443)
         ↓
      Frontend (puerto 3000)
         ↓
      HTML renderizado enviado al navegador
```

### 2. Cliente → API (desde el navegador)

```
Navegador → fetch('/api/v1/users')
           ↓
        https://tudominio.com/api/v1/users
           ↓
        Caddy detecta ruta /api/*
           ↓
        API Gateway (puerto 3010)
           ↓
        JSON response
```

**Nota importante**: El navegador usa URLs relativas (`/api/v1`), por lo que las peticiones van al mismo dominio. No hay problemas de CORS.

### 3. Server-Side Rendering (Next.js SSR → API)

```
Next.js Server → fetch('http://api-gateway:3010/api/v1/users')
                ↓
             Red Docker interna (sin TLS, baja latencia)
                ↓
             API Gateway
                ↓
             JSON response usado para renderizar HTML
```

## Variables de Entorno

### Variables del Sistema

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DOMAIN` | Dominio principal | `tudominio.com` |
| `CADDY_EMAIL` | Email para certificados SSL | `admin@tudominio.com` |

### Variables del Frontend

| Variable | Descripción | Valor | Dónde se usa |
|----------|-------------|-------|--------------|
| `NEXT_PUBLIC_API_URL` | URL del API para el navegador | `/api/v1` | Cliente (navegador) |
| `INTERNAL_API_URL` | URL interna del API | `http://api-gateway:3010/api/v1` | Servidor (SSR) |

### Variables del API Gateway

| Variable | Descripción | Valor |
|----------|-------------|-------|
| `PORT` | Puerto interno | `3010` |
| `NODE_ENV` | Entorno | `production` |

## Configuración de DNS

### Paso 1: Configurar registro A

```
Tipo: A
Nombre: @ (o tudominio.com)
Valor: IP_DE_TU_SERVIDOR_HETZNER
TTL: 3600
```

### Paso 2: Configurar www (opcional)

```
Tipo: A
Nombre: www
Valor: IP_DE_TU_SERVIDOR_HETZNER
TTL: 3600
```

Caddy automáticamente redirigirá `www.tudominio.com` → `tudominio.com`

## Seguridad

### Características de Seguridad Implementadas

1. **SSL/TLS Automático**
   - Certificados Let's Encrypt
   - Renovación automática
   - Redirección HTTP → HTTPS

2. **Security Headers**
   - HSTS (HTTP Strict Transport Security)
   - X-Frame-Options (Anti-clickjacking)
   - X-Content-Type-Options (Anti-MIME sniffing)
   - X-XSS-Protection
   - Referrer-Policy

3. **Aislamiento de Red**
   - Solo Caddy expuesto a internet (puertos 80, 443)
   - Frontend y API Gateway en red interna
   - Redis completamente interno

4. **No CORS Necesario**
   - Todo bajo el mismo dominio
   - Sin peticiones cross-origin

## Puertos

| Servicio | Puerto Externo | Puerto Interno | Notas |
|----------|----------------|----------------|-------|
| Caddy | 80, 443 | - | Expuesto a internet |
| Frontend | - | 3000 | Solo red interna |
| API Gateway | - | 3010 | Solo red interna |
| Redis | - | 6379 | Solo red interna |

## Deployment

### Configurar Secrets en GitHub

Agrega estos secrets en GitHub (Settings → Secrets and variables → Actions):

```
DOMAIN=tudominio.com
CADDY_EMAIL=admin@tudominio.com
```

### Deploy Manual

Si necesitas hacer deploy manual:

```bash
# SSH al servidor
ssh user@tu-servidor

# Ir al directorio de la aplicación
cd /opt/copilot-app

# Asegurarse de que las variables estén en .env
cat > .env << EOF
DOMAIN=tudominio.com
CADDY_EMAIL=admin@tudominio.com
DATABASE_URL=...
REDIS_PASSWORD=...
EOF

# Levantar los servicios
docker compose up -d

# Ver logs
docker compose logs -f caddy
```

### Verificar SSL

Después del deployment, verifica que SSL esté funcionando:

```bash
# Verificar certificado
curl -I https://tudominio.com

# Verificar redirección HTTP → HTTPS
curl -I http://tudominio.com
```

También puedes usar: https://www.ssllabs.com/ssltest/

## Logs

### Ver logs de Caddy

```bash
docker compose logs -f caddy
```

### Ver logs del Frontend

```bash
docker compose logs -f frontend
```

### Ver logs del API Gateway

```bash
docker compose logs -f api-gateway
```

### Logs de acceso de Caddy

Los logs de acceso están en formato JSON dentro del contenedor:

```bash
docker compose exec caddy cat /data/access.log | tail -100
```

## Troubleshooting

### Problema: SSL no se genera

**Síntomas**: Error al acceder a HTTPS

**Solución**:
1. Verificar que DNS esté configurado correctamente
   ```bash
   dig tudominio.com +short
   ```
2. Verificar que puertos 80 y 443 estén abiertos en firewall
   ```bash
   sudo ufw status
   ```
3. Ver logs de Caddy
   ```bash
   docker compose logs caddy | grep -i error
   ```

### Problema: Errores 502 Bad Gateway

**Síntomas**: Caddy responde pero servicios internos no

**Solución**:
1. Verificar que servicios estén corriendo
   ```bash
   docker compose ps
   ```
2. Verificar health checks
   ```bash
   docker compose exec api-gateway wget -O- http://localhost:3010/health
   docker compose exec frontend wget -O- http://localhost:3000/api/health
   ```

### Problema: Errores 401 en peticiones al API

**Síntomas**: El frontend carga pero las peticiones al API fallan

**Solución**:
1. Verificar que `NEXT_PUBLIC_API_URL=/api/v1` esté configurado
2. Verificar logs del API Gateway
   ```bash
   docker compose logs api-gateway | grep -i 401
   ```
3. Verificar que el token JWT esté siendo enviado correctamente

## Performance

### Optimizaciones Incluidas

1. **Compresión**: Gzip y Zstd habilitados
2. **HTTP/2**: Habilitado automáticamente con HTTPS
3. **HTTP/3 (QUIC)**: Habilitado en puerto 443/UDP
4. **Keep-Alive**: Conexiones persistentes
5. **Health Checks**: Monitoreo automático de servicios

### Métricas

Para ver métricas de Caddy:

```bash
# Stats de contenedores
docker stats

# Conexiones activas
docker compose exec caddy netstat -an | grep ESTABLISHED | wc -l
```

## Migración a Múltiples Servidores (Futuro)

Esta arquitectura está preparada para escalar. Cuando sea necesario:

### Fase 1: Separar Base de Datos
- Mover PostgreSQL a servidor dedicado
- Usar red privada de Hetzner (10.0.0.0/16)

### Fase 2: Load Balancing
- Múltiples instancias de Frontend y API Gateway
- Caddy automáticamente balancea carga

```caddyfile
# Caddyfile con load balancing
handle /api/* {
    reverse_proxy api-gateway-1:3010 api-gateway-2:3010 {
        lb_policy least_conn
    }
}
```

## Comandos Útiles

```bash
# Reiniciar Caddy (recarga configuración)
docker compose restart caddy

# Rebuild frontend con nueva configuración
docker compose up -d --build frontend

# Ver certificados SSL
docker compose exec caddy ls -la /data/caddy/certificates/

# Forzar renovación de certificado
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Limpiar volúmenes (¡CUIDADO! Borra certificados)
docker compose down -v
```

## Recursos Adicionales

- [Documentación de Caddy](https://caddyserver.com/docs/)
- [Guía de Caddyfile](https://caddyserver.com/docs/caddyfile)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Hetzner Private Networking](https://docs.hetzner.com/cloud/networks/overview/)

## Soporte

Si tienes problemas:
1. Revisa los logs: `docker compose logs -f`
2. Verifica health checks: `docker compose ps`
3. Verifica DNS: `dig tudominio.com`
4. Verifica firewall: `sudo ufw status`
