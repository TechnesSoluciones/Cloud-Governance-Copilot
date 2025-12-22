# Limpieza de Archivos Docker - 2025-12-22

## Resumen

**Fecha:** 2025-12-22
**Motivo:** Consolidación de configuraciones Docker para simplificar desarrollo
**Reducción:** De 22 archivos → 7 archivos (68% menos complejidad)

## Problema Original

El proyecto tenía:
- **10 archivos docker-compose** diferentes
- **12 Dockerfiles** diferentes (6 frontend + 6 api-gateway)
- Confusión sobre cuál usar para desarrollo
- Configuraciones contradictorias y obsoletas

## Archivos en este Backup

Este directorio contiene copias de TODOS los archivos Docker antes de la limpieza:

### Docker Compose Files (10 archivos)
1. `docker-compose.yml` - Principal (usaba Dockerfile.local)
2. `docker-compose.dev.yml` - Desarrollo con hot-reload
3. `docker-compose.prod.yml` - Producción antigua
4. `docker-compose.production.yml` - Producción con Caddy
5. `docker-compose.backup.yml` - Backup/copia de seguridad
6. `docker-compose.test.yml` - Testing
7. `docker-compose.example.yml` - Template/ejemplo

### Frontend Dockerfiles (6 archivos)
1. `Dockerfile` - Multi-stage production build
2. `Dockerfile.dev` - Desarrollo con hot-reload ✓ (MANTENIDO)
3. `Dockerfile.local` - Testing local
4. `Dockerfile.production` - Producción optimizado
5. `Dockerfile.simple` - Versión simple dev
6. `Dockerfile.fixed` - Fix temporal

### API Gateway Dockerfiles (6 archivos)
1. `Dockerfile` - Multi-stage (MANTENIDO con target development)
2. `Dockerfile.local` - Testing local
3. `Dockerfile.production` - Producción optimizado
4. `Dockerfile.production.clean` - Versión limpia
5. `Dockerfile.production.fixed` - Fix temporal
6. `Dockerfile.simple` - Versión simple dev

## Archivos Mantenidos Después de la Limpieza

### Desarrollo
- `/docker-compose.yml` - NUEVO simplificado para desarrollo
- `/apps/frontend/Dockerfile.dev` - Hot reload
- `/apps/api-gateway/Dockerfile` - Con target development

### Producción (para futuro)
- `/docker-compose.production.yml` - Cuando sea necesario
- `/apps/frontend/Dockerfile` - Build optimizado
- `/apps/api-gateway/Dockerfile` - Build optimizado (mismo archivo, target production)

### Testing
- `/docker-compose.test.yml` - Para CI/CD

## Archivos Eliminados

### Docker Compose (7 eliminados)
- ❌ `docker-compose.dev.yml` - Reemplazado por nuevo docker-compose.yml
- ❌ `docker-compose.prod.yml` - Duplicado obsoleto
- ❌ `docker-compose.backup.yml` - Backup innecesario (usamos git)
- ❌ `docker-compose.example.yml` - El principal es el ejemplo ahora

### Frontend Dockerfiles (4 eliminados)
- ❌ `Dockerfile.local` - Redundante
- ❌ `Dockerfile.production` - Consolidado en Dockerfile
- ❌ `Dockerfile.simple` - Redundante
- ❌ `Dockerfile.fixed` - Fix temporal obsoleto

### API Gateway Dockerfiles (5 eliminados)
- ❌ `Dockerfile.local` - Redundante
- ❌ `Dockerfile.production` - Consolidado en Dockerfile
- ❌ `Dockerfile.production.clean` - Redundante
- ❌ `Dockerfile.production.fixed` - Fix temporal obsoleto
- ❌ `Dockerfile.simple` - Redundante

## Nueva Arquitectura

```
Desarrollo (docker-compose.yml):
├── redis (cache/sessions)
├── api-gateway (hot reload con tsx watch, puerto 4000)
└── frontend (hot reload con next dev --turbo, puerto 3000)

PostgreSQL: Externo (Hetzner)
Redis: Incluido en docker-compose
```

## Características de la Nueva Configuración

✅ **Hot reload** completo en frontend y backend
✅ **Setup rápido**: `docker-compose up` y funciona
✅ **Volúmenes delegados** para mejor performance
✅ **Health checks** automáticos
✅ **Logging estructurado**
✅ **Sin complejidad** de producción

## Cómo Recuperar Archivos

Si necesitas recuperar algún archivo de este backup:

```bash
# Ver todos los archivos del backup
ls -la archive/cleanup-2025-12-22/

# Copiar un archivo específico
cp archive/cleanup-2025-12-22/docker-compose.dev.yml ./

# Ver diferencias con versión actual
diff archive/cleanup-2025-12-22/docker-compose.yml ./docker-compose.yml
```

## Notas

- Todos los archivos están también en el historial de Git
- Este backup es adicional por seguridad
- La decisión de eliminar fue consensuada entre project-orchestrator y software-architect
- La nueva configuración fue validada y funciona correctamente

## Referencias

- Ver CHANGELOG.md para detalles de los cambios
- Ver DEVELOPMENT.md para guía de uso de la nueva configuración
- Ver docker-compose.yml para configuración actual
