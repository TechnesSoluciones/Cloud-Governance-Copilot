# Configuración del Dominio: cloudgov.app

## ✅ Dominio Adquirido
**Dominio**: `cloudgov.app`

## Pasos de Configuración

### 1. Configurar DNS (en tu registrador de dominios)

Necesitas crear un registro A que apunte a tu servidor de Hetzner.

**IP del servidor Hetzner**: Obtén la IP desde Hetzner Cloud Console

#### Configuración DNS:

```
Tipo: A
Nombre: @ (o cloudgov.app)
Valor: [IP_DE_TU_SERVIDOR_HETZNER]
TTL: 3600 (1 hora)
```

**Opcional - Redirección www:**
```
Tipo: A
Nombre: www
Valor: [IP_DE_TU_SERVIDOR_HETZNER]
TTL: 3600
```

#### Ejemplo de configuración según el registrador:

**Cloudflare:**
- Type: `A`
- Name: `@`
- IPv4 address: `[TU_IP]`
- Proxy status: `DNS only` (nube gris) - IMPORTANTE: NO proxied
- TTL: `Auto`

**Namecheap:**
- Type: `A Record`
- Host: `@`
- Value: `[TU_IP]`
- TTL: `Automatic`

**Porkbun:**
- Type: `A`
- Host: `` (vacío o @)
- Answer: `[TU_IP]`
- TTL: `600`

### 2. Verificar Propagación de DNS

Después de configurar el DNS, verifica que esté propagado:

```bash
# Verificar DNS
dig cloudgov.app +short

# Debería retornar la IP de tu servidor
# Ejemplo: 46.224.33.191
```

**Online**: https://dnschecker.org/#A/cloudgov.app

⏱️ **Tiempo de propagación**: 5 minutos a 48 horas (usualmente 15-30 minutos)

### 3. Configurar GitHub Secrets

Ve a tu repositorio en GitHub:
`Settings → Secrets and variables → Actions → New repository secret`

#### Secrets a Agregar:

**DOMAIN:**
```
Name: DOMAIN
Secret: cloudgov.app
```

**CADDY_EMAIL:**
```
Name: CADDY_EMAIL
Secret: admin@cloudgov.app
```
(O tu email personal)

#### Verificar Secrets Existentes:

Asegúrate de que también están configurados:
- ✅ `DATABASE_URL`
- ✅ `REDIS_PASSWORD`
- ✅ `JWT_SECRET`
- ✅ `JWT_REFRESH_SECRET`
- ✅ `NEXTAUTH_SECRET`
- ✅ `SESSION_SECRET`
- ✅ `ENCRYPTION_KEY`
- ✅ `APP_SERVER_HOST` (IP del servidor)
- ✅ `APP_SERVER_USER` (usuario SSH)
- ✅ `SSH_PRIVATE_KEY` (clave SSH)

### 4. Actualizar NEXTAUTH_URL (si usas NextAuth)

Si estás usando NextAuth, actualiza el secret:

```
Name: NEXTAUTH_URL
Secret: https://cloudgov.app
```

### 5. Verificar Firewall del Servidor

Asegúrate de que los puertos estén abiertos en Hetzner:

**Via Hetzner Cloud Console:**
1. Ve a tu servidor
2. Firewalls → Inbound Rules
3. Asegúrate de tener:
   - ✅ HTTP (TCP 80) - 0.0.0.0/0, ::/0
   - ✅ HTTPS (TCP 443) - 0.0.0.0/0, ::/0
   - ✅ SSH (TCP 22) - Tu IP (recomendado) o 0.0.0.0/0

**Via SSH (ufw):**
```bash
ssh root@[TU_SERVIDOR_IP]

# Verificar status
sudo ufw status

# Si está inactivo o faltan reglas, configurar:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 6. Push y Deploy

Una vez configurado todo:

```bash
# Push de los cambios (si no lo has hecho)
git push origin main

# GitHub Actions automáticamente:
# 1. Construirá las imágenes Docker
# 2. Las subirá al registry
# 3. Desplegará en el servidor
# 4. Caddy automáticamente solicitará certificado SSL
```

### 7. Verificar Deployment

**Después del deployment, verifica:**

```bash
# 1. Verificar que el DNS resuelve
dig cloudgov.app +short

# 2. Verificar HTTP (debe redirigir a HTTPS)
curl -I http://cloudgov.app

# Deberías ver: HTTP/1.1 308 Permanent Redirect
# Location: https://cloudgov.app/

# 3. Verificar HTTPS
curl -I https://cloudgov.app

# Deberías ver: HTTP/2 200
```

**En el navegador:**
- Visita: https://cloudgov.app
- Verifica el candado SSL (certificado válido)
- Verifica que las llamadas a la API funcionen

### 8. Monitorear Logs Durante Primera Configuración

```bash
# SSH al servidor
ssh user@[TU_SERVIDOR_IP]

# Ver logs de Caddy (para ver generación de certificado)
cd /opt/copilot-app
docker compose logs -f caddy

# Deberías ver algo como:
# "certificate obtained successfully"
# "serving https://cloudgov.app"
```

## Troubleshooting

### Problema: DNS no resuelve

```bash
# Verificar en múltiples DNS servers
dig @8.8.8.8 cloudgov.app
dig @1.1.1.1 cloudgov.app

# Si no resuelve, esperar más tiempo (hasta 24h)
# O verificar configuración en el registrador
```

### Problema: Certificado SSL no se genera

**Causas comunes:**
1. DNS aún no propagado (esperar)
2. Puerto 80/443 bloqueado en firewall
3. Dominio ya tiene certificado en otro servidor (revocar primero)

**Verificar:**
```bash
# Ver logs de Caddy
docker compose logs caddy | grep -i error

# Verificar puertos
nc -zv cloudgov.app 80
nc -zv cloudgov.app 443
```

**Solución - Forzar renovación:**
```bash
# Dentro del servidor
cd /opt/copilot-app
docker compose restart caddy

# Ver logs en tiempo real
docker compose logs -f caddy
```

### Problema: Errores 502 Bad Gateway

Significa que Caddy está funcionando pero no puede conectarse a los servicios internos.

```bash
# Verificar que todos los servicios estén corriendo
docker compose ps

# Todos deben estar "healthy" o "running"

# Ver logs de los servicios
docker compose logs frontend
docker compose logs api-gateway
```

### Problema: La app carga pero las peticiones API fallan (401/403)

Verificar que CORS y URLs estén correctamente configuradas:

```bash
# En el navegador, abre DevTools (F12) → Network
# Verifica que las peticiones vayan a:
# https://cloudgov.app/api/v1/...
# Y NO a localhost:3010 o similar
```

## Checklist Final ✅

Antes de considerar el deployment completo:

- [ ] DNS configurado y propagado
- [ ] GitHub Secrets configurados (DOMAIN, CADDY_EMAIL)
- [ ] Firewall del servidor permite HTTP/HTTPS
- [ ] Push exitoso a GitHub
- [ ] GitHub Actions ejecutó sin errores
- [ ] Certificado SSL generado automáticamente
- [ ] https://cloudgov.app carga correctamente
- [ ] Peticiones al API funcionan sin errores 401
- [ ] Verificado con SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=cloudgov.app

## URLs Importantes

**Producción:**
- Frontend: https://cloudgov.app
- API: https://cloudgov.app/api/v1
- Health Check: https://cloudgov.app/health

**Herramientas de Verificación:**
- DNS Check: https://dnschecker.org/#A/cloudgov.app
- SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=cloudgov.app
- HTTP Headers: https://securityheaders.com/?q=cloudgov.app

## Siguientes Pasos (Post-Deploy)

1. **Monitoreo**: Configurar uptime monitoring (UptimeRobot, Uptime Kuma)
2. **Analytics**: Configurar Google Analytics o Plausible
3. **Error Tracking**: Configurar Sentry o similar
4. **Backups**: Verificar que backups automáticos estén funcionando
5. **Performance**: Verificar con PageSpeed Insights

## Contacto y Soporte

Si algo falla:
1. Revisar logs: `docker compose logs -f`
2. Verificar GitHub Actions: https://github.com/TechnesSoluciones/Cloud-Governance-Copilot/actions
3. Verificar DNS: `dig cloudgov.app`
4. Verificar firewall: `sudo ufw status`

---

**Dominio**: cloudgov.app
**Email SSL**: admin@cloudgov.app
**Servidor**: Hetzner Cloud
**Stack**: Next.js + API Gateway + Redis + Caddy
**SSL**: Let's Encrypt (automático)
