# Sistema de Versionamiento Automático

Este proyecto utiliza **versionamiento semántico automático** con GitHub Actions para gestionar releases y deployments.

## 📋 Tabla de Contenidos

- [Cómo Funciona](#cómo-funciona)
- [Versionamiento Semántico](#versionamiento-semántico)
- [Uso Automático](#uso-automático)
- [Uso Manual](#uso-manual)
- [Rollback a Versión Anterior](#rollback-a-versión-anterior)
- [Configuración Inicial](#configuración-inicial)

---

## 🔄 Cómo Funciona

### Flujo Automático

```
Push a main → Bump versión → Build imágenes → Deploy → Create release
```

1. **Detecta cambios en `main`**
2. **Analiza commits** para determinar tipo de bump:
   - `feat!:` o `BREAKING CHANGE:` → **major** (1.0.0 → 2.0.0)
   - `feat:` → **minor** (1.0.0 → 1.1.0)
   - `fix:`, `chore:`, etc. → **patch** (1.0.0 → 1.0.1)
3. **Actualiza `package.json`** de api-gateway y frontend
4. **Crea git tag** (ej: `v1.2.3`)
5. **Construye imágenes Docker** con múltiples tags:
   - `ghcr.io/technessoluciones/copilot-api-gateway:v1.2.3`
   - `ghcr.io/technessoluciones/copilot-api-gateway:1.2`
   - `ghcr.io/technessoluciones/copilot-api-gateway:1`
   - `ghcr.io/technessoluciones/copilot-api-gateway:latest`
6. **Deploya al servidor** de producción vía SSH
7. **Crea GitHub Release** con notas automáticas

---

## 📦 Versionamiento Semántico

Seguimos el estándar [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
  │     │      │
  │     │      └─ Bug fixes, cambios menores
  │     └──────── Nuevas features (compatible)
  └────────────── Breaking changes (incompatible)
```

### Ejemplos de Commits

```bash
# Patch (1.0.0 → 1.0.1)
git commit -m "fix: corregir error en health check"
git commit -m "chore: limpiar archivos temporales"

# Minor (1.0.0 → 1.1.0)
git commit -m "feat: agregar caching con Redis"
git commit -m "feat(api): nuevo endpoint de costos"

# Major (1.0.0 → 2.0.0)
git commit -m "feat!: cambiar estructura de API"
git commit -m "feat: nuevo auth

BREAKING CHANGE: removed old auth endpoints"
```

---

## 🤖 Uso Automático

### Al hacer Push a Main

```bash
# Hacer cambios
git add .
git commit -m "feat: agregar endpoint de analytics"
git push origin main

# GitHub Actions automáticamente:
# ✅ Detecta que es un 'feat:' → bump minor
# ✅ 1.0.0 → 1.1.0
# ✅ Construye imágenes con tag v1.1.0
# ✅ Deploya a producción
# ✅ Crea release en GitHub
```

### Manualmente desde GitHub UI

1. Ve a **Actions** → **Release & Deploy**
2. Click en **Run workflow**
3. Selecciona el tipo de bump:
   - `patch` - Para bug fixes (1.0.0 → 1.0.1)
   - `minor` - Para nuevas features (1.0.0 → 1.1.0)
   - `major` - Para breaking changes (1.0.0 → 2.0.0)
4. Click **Run workflow**

---

## 🛠️ Uso Manual

Si prefieres controlar el versionamiento manualmente:

```bash
# Opción 1: Usar el script
./scripts/bump-version.sh patch   # 1.0.0 → 1.0.1
./scripts/bump-version.sh minor   # 1.0.0 → 1.1.0
./scripts/bump-version.sh major   # 1.0.0 → 2.0.0

# Push de cambios y tag
git push origin main --follow-tags

# Opción 2: Usar npm version directamente
cd apps/api-gateway
npm version patch  # o minor, o major

cd ../frontend
npm version <misma-versión> --allow-same-version

cd ../..
git push origin main --follow-tags
```

---

## ⏪ Rollback a Versión Anterior

### Opción 1: Revertir en el Servidor

```bash
# SSH al servidor
ssh deploy@your-server.com

cd /opt/copilot

# Usar una versión específica
export IMAGE_TAG=v1.2.0
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Verificar que funciona
docker-compose -f docker-compose.production.yml ps
```

### Opción 2: Revertir con Git

```bash
# Ver versiones disponibles
git tag -l

# Revertir a una versión específica
git checkout v1.2.0

# Crear un nuevo commit de reversión
git checkout main
git revert <commit-hash>
git push origin main
```

### Opción 3: Deploy Manual de Versión Anterior

```bash
# Descargar workflow manualmente con versión específica
# En GitHub Actions → Release & Deploy → Run workflow
# Cambiar IMAGE_TAG en el servidor antes de ejecutar
```

---

## ⚙️ Configuración Inicial

### 1. Configurar Secrets en GitHub

Ver [.github/SECRETS.md](.github/SECRETS.md) para la lista completa de secrets requeridos.

**Mínimo requerido**:
- `DEPLOY_HOST` - IP o hostname del servidor
- `DEPLOY_USER` - Usuario SSH
- `DEPLOY_SSH_KEY` - Llave SSH privada

### 2. Setup del Servidor de Producción

```bash
# Como root o sudo
adduser deploy
usermod -aG sudo deploy

# Como usuario deploy
cd /opt
git clone https://github.com/TechnesSoluciones/Cloud-Governance-Copilot.git copilot
cd copilot

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker deploy

# Reiniciar sesión para aplicar cambios
exit
# Re-login via SSH

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con valores de producción

# Probar deployment manual
docker-compose -f docker-compose.production.yml up -d
```

### 3. Primera Ejecución

```bash
# En tu máquina local
git checkout main
git pull origin main

# Trigger primer release
./scripts/bump-version.sh patch
git push origin main --follow-tags
```

---

## 📊 Monitoreo de Versiones

### Ver Versión Actual en Producción

```bash
# Opción 1: Ver en logs del servidor
ssh deploy@your-server.com "docker-compose -f /opt/copilot/docker-compose.production.yml ps"

# Opción 2: Llamar al API
curl https://api.copilot.yourdomain.com/health | jq '.version'

# Opción 3: Ver en GitHub Releases
# https://github.com/TechnesSoluciones/Cloud-Governance-Copilot/releases
```

### Ver Historial de Versiones

```bash
# Ver todos los tags
git tag -l

# Ver detalles de un tag
git show v1.2.3

# Ver commits entre versiones
git log v1.2.0..v1.2.3 --oneline
```

---

## 🐛 Troubleshooting

### El workflow falla en "Bump version"
- **Causa**: Conflicto en package.json
- **Solución**: Hacer pull de main y resolver conflictos

### El workflow falla en "Deploy to Production"
- **Causa**: SSH key incorrecta o servidor inaccesible
- **Solución**: Verificar secrets `DEPLOY_*` en GitHub

### La versión no cambia después del push
- **Causa**: Commit message no sigue convención
- **Solución**: Usar prefijos: `feat:`, `fix:`, `chore:`, etc.

### El healthcheck falla después del deploy
- **Causa**: Nueva versión tiene error o tarda en iniciar
- **Solución**: Ver logs con `docker-compose logs -f api-gateway`

---

## 📚 Referencias

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
