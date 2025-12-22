# Sistema de Backup PostgreSQL - Resumen Técnico

## Resumen Ejecutivo

Sistema completo de backup automatizado para PostgreSQL con las siguientes capacidades:

- **Backups diarios automáticos** con pg_dump
- **Compresión gzip nivel 9** para ahorro de espacio
- **Subida automática a Hetzner Storage Box** vía rsync/SSH
- **Rotación inteligente** de backups (local: 30 días, Hetzner: 90 días)
- **Verificación de integridad** automática
- **Notificaciones** por email/Slack/webhook
- **Restauración simple** con un comando
- **Monitoreo en tiempo real** con dashboard

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
│              (46.224.33.191:5432/copilot_dev)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ pg_dump (custom format, parallel)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backup Script                            │
│  - Conexión y validación                                    │
│  - Dump de base de datos                                    │
│  - Compresión gzip -9                                       │
│  - Verificación de integridad                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────────┐
│ Local Storage    │    │ Hetzner Storage Box  │
│ Retention: 30d   │    │ Retention: 90d       │
│ Max: 14 backups  │    │ SSH/rsync            │
└──────────────────┘    └──────────────────────┘
          │
          │ Verificación periódica
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Monitoring & Alerts                        │
│  - Email notifications                                      │
│  - Slack webhooks                                           │
│  - Healthcheck pings                                        │
│  - Dashboard en tiempo real                                 │
└─────────────────────────────────────────────────────────────┘
```

## Componentes del Sistema

### 1. Scripts Principales

| Script | Propósito | Uso |
|--------|-----------|-----|
| `backup.sh` | Ejecutar backup de PostgreSQL | `./backup.sh` |
| `restore.sh` | Restaurar desde backup | `./restore.sh --list` |
| `verify-backup.sh` | Verificar integridad | `./verify-backup.sh --all` |
| `monitor.sh` | Dashboard de monitoreo | `./monitor.sh` |
| `setup-cron.sh` | Configurar automatización | `./setup-cron.sh --install` |
| `setup-hetzner.sh` | Configurar Hetzner | `./setup-hetzner.sh --setup` |
| `install.sh` | Instalador todo-en-uno | `./install.sh` |

### 2. Archivos de Configuración

- **`configs/backup.conf`**: Configuración principal
  - Credenciales de base de datos
  - Configuración de Hetzner
  - Políticas de retención
  - Notificaciones
  - Opciones avanzadas

### 3. Directorios

```
/Users/josegomez/Documents/Code/SaaS/Copilot/
├── scripts/backup/              # Scripts del sistema
│   ├── *.sh                     # Scripts ejecutables
│   ├── configs/                 # Configuración
│   │   └── backup.conf          # Config principal
│   ├── logs/                    # Logs de operaciones
│   │   ├── backup_YYYYMM.log    # Logs de backup
│   │   ├── restore_*.log        # Logs de restauración
│   │   └── verify_*.log         # Logs de verificación
│   └── *.md                     # Documentación
└── backups/postgres/            # Almacenamiento de backups
    └── copilot_db_backup_*.gz   # Archivos de backup
```

## Especificaciones Técnicas

### Configuración de Base de Datos

```bash
Host:     46.224.33.191
Puerto:   5432
Database: copilot_dev
Usuario:  copilot_dev
Versión:  PostgreSQL 15
```

### Formato de Backup

- **Formato**: Custom (pg_dump -Fc)
- **Compresión**: gzip nivel 9
- **Paralelismo**: 2 jobs (configurable)
- **Nomenclatura**: `copilot_db_backup_YYYYMMDD_HHMMSS.custom.gz`

### Políticas de Retención

| Ubicación | Retención | Máximo |
|-----------|-----------|--------|
| Local | 30 días | 14 backups |
| Hetzner Storage Box | 90 días | Ilimitado |

### Horarios de Automatización (Cron)

| Tarea | Horario | Frecuencia |
|-------|---------|------------|
| Backup completo | 02:00 AM | Diario |
| Verificación | 03:00 AM | Semanal (Domingos) |
| Reporte de salud | 04:00 AM | Mensual (día 1) |

## Características Avanzadas

### 1. Backup Paralelo

```bash
# En backup.conf
USE_CUSTOM_FORMAT=true
PARALLEL_JOBS=4
```

Permite acelerar el proceso de backup en bases de datos grandes.

### 2. Verificación de Integridad

Cada backup se verifica automáticamente:
- Descompresión exitosa
- Formato válido de PostgreSQL
- Listado de objetos (pg_restore --list)

### 3. Notificaciones Múltiples

#### Email
```bash
NOTIFICATIONS_ENABLED=true
NOTIFY_EMAIL="admin@domain.com"
```

#### Slack
```bash
SLACK_ENABLED=true
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
```

#### Webhook Custom
```bash
WEBHOOK_ENABLED=true
WEBHOOK_URL="https://your-webhook.com/endpoint"
```

Payload enviado:
```json
{
  "status": "success|failure",
  "timestamp": "2025-12-21T02:00:00Z",
  "database": "copilot_dev",
  "message": "Backup completed successfully"
}
```

### 4. Hetzner Storage Box Integration

#### Configuración
- **Protocolo**: SSH/rsync
- **Puerto**: 23
- **Autenticación**: Clave SSH (ED25519)
- **Transferencia**: Incremental con rsync

#### Ventajas
- Almacenamiento offsite (disaster recovery)
- Mayor retención (90 días)
- Transferencia eficiente (solo delta)
- Cifrado en tránsito (SSH)

## Seguridad

### 1. Permisos de Archivos

```bash
# Configuración
chmod 600 configs/backup.conf

# Directorio de backups
chmod 700 /path/to/backups

# Claves SSH
chmod 600 ~/.ssh/id_rsa_hetzner_backup
```

### 2. Credenciales

- Almacenadas en `backup.conf` con permisos restrictivos
- Nunca se registran en logs
- Variable `PGPASSWORD` solo en memoria durante ejecución

### 3. Transferencia Segura

- SSH con autenticación por clave pública
- Sin contraseñas en texto plano
- StrictHostKeyChecking para validación

## Monitoreo y Alertas

### Dashboard en Tiempo Real

```bash
./monitor.sh              # Vista única
./monitor.sh watch 30     # Auto-refresh cada 30s
./monitor.sh alerts       # Solo alertas
```

Muestra:
- Estado de conexión a base de datos
- Último backup (edad, tamaño)
- Uso de disco
- Conexión a Hetzner
- Estado de cron
- Análisis de logs
- Timeline de backups

### Alertas Automáticas

El sistema alerta cuando:
- Backup tiene más de 48 horas
- Espacio en disco > 90%
- Fallo de conexión a base de datos
- Errores en logs recientes
- Fallo de conexión a Hetzner

## Procedimientos de Operación

### Backup Manual

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
./backup.sh
```

**Proceso:**
1. Verificación de conexión
2. VACUUM (opcional)
3. pg_dump con formato custom
4. Compresión gzip
5. Verificación de integridad
6. Subida a Hetzner
7. Rotación de backups antiguos
8. Notificación de estado

### Restauración Completa

```bash
# Listar backups disponibles
./restore.sh --list

# Restaurar desde backup local
./restore.sh -f /path/to/backup.sql.gz

# Restaurar desde Hetzner
./restore.sh --from-hetzner

# Restaurar a nueva base de datos
./restore.sh -f backup.sql.gz -d copilot_new --new-db
```

### Verificación de Salud

```bash
# Verificar todos los backups
./verify-backup.sh --all

# Verificar frescura
./verify-backup.sh --freshness

# Generar reporte completo
./verify-backup.sh --report
```

## Casos de Uso

### 1. Backup Antes de Actualización

```bash
# 1. Backup inmediato
./backup.sh

# 2. Verificar backup
./verify-backup.sh --all

# 3. Realizar actualización
# ...

# 4. Si falla, restaurar
./restore.sh -f /path/to/pre-update-backup.sql.gz
```

### 2. Migración de Servidor

```bash
# En servidor antiguo
./backup.sh

# Esperar subida a Hetzner

# En servidor nuevo
./setup-hetzner.sh --setup
./restore.sh --from-hetzner -d copilot_dev --new-db
```

### 3. Clonar a Entorno de Desarrollo

```bash
# Obtener backup de producción
./restore.sh --from-hetzner

# Restaurar a base de datos local
./restore.sh -f backup.sql.gz -d copilot_dev_local --new-db
```

### 4. Recuperación de Desastre

```bash
# Escenario: Pérdida total de servidor

# 1. Provisionar nuevo servidor
# 2. Instalar PostgreSQL
# 3. Configurar sistema de backup
./install.sh

# 4. Configurar Hetzner
./setup-hetzner.sh --setup

# 5. Restaurar último backup
./restore.sh --from-hetzner -d copilot_dev --new-db

# 6. Verificar integridad
psql -h localhost -d copilot_dev -c "SELECT COUNT(*) FROM users;"

# 7. Reanudar operaciones
```

## Métricas y KPIs

### Tamaño de Backups

Con compresión gzip -9:
- Base de datos 1 GB → ~100-200 MB comprimido
- Ratio de compresión: ~80-90%

### Tiempo de Ejecución

- Backup: ~5-15 min (depende de tamaño de DB)
- Compresión: ~2-5 min
- Upload a Hetzner: ~1-10 min (depende de conexión)
- Total: ~10-30 min

### Almacenamiento Requerido

Ejemplo para DB de 1 GB:
- Backup comprimido: ~150 MB
- 14 backups locales: ~2.1 GB
- 90 backups Hetzner: ~13.5 GB

## Troubleshooting

### Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Cannot connect to database" | Credenciales incorrectas | Verificar `backup.conf` |
| "Permission denied" | Permisos de archivos | `chmod +x *.sh` |
| "Hetzner connection failed" | SSH mal configurado | `./setup-hetzner.sh --test` |
| "Disk full" | Sin espacio | Limpiar backups antiguos |
| Backup lento | DB grande | Aumentar `PARALLEL_JOBS` |

### Logs para Diagnóstico

```bash
# Ver logs de backup
tail -100 logs/backup_$(date +%Y%m).log

# Buscar errores
grep ERROR logs/backup_*.log

# Ver último backup
grep "Backup Completed" logs/backup_*.log | tail -1
```

## Mantenimiento

### Tareas Mensuales

1. **Verificar backups**: `./verify-backup.sh --report`
2. **Probar restauración**: Restaurar a DB de prueba
3. **Revisar logs**: Buscar errores o warnings
4. **Verificar espacio**: Asegurar capacidad suficiente
5. **Actualizar retención**: Ajustar si es necesario

### Tareas Trimestrales

1. **Disaster recovery drill**: Simular pérdida total
2. **Revisar configuración**: Optimizar parámetros
3. **Actualizar documentación**: Cambios en procedimientos
4. **Auditoría de seguridad**: Revisar permisos y accesos

## Mejoras Futuras

### Planificadas

- [ ] Encriptación de backups con GPG
- [ ] Backup incremental con WAL archiving
- [ ] Soporte para múltiples bases de datos
- [ ] Dashboard web con métricas
- [ ] Integración con Prometheus/Grafana
- [ ] Backup point-in-time recovery
- [ ] Compresión con zstd (mejor ratio)
- [ ] Backup de configuraciones de PostgreSQL

### Sugeridas

- Backup a múltiples destinos (AWS S3, Google Cloud Storage)
- Deduplicación de backups
- Backup diferencial
- Restauración paralela
- API REST para gestión

## Soporte y Recursos

### Documentación

- **README.md**: Documentación completa
- **QUICKSTART.md**: Guía rápida de inicio
- **SYSTEM_OVERVIEW.md**: Este documento

### Scripts de Ayuda

```bash
# Cada script tiene ayuda integrada
./backup.sh --help
./restore.sh --help
./setup-hetzner.sh --help
```

### Enlaces Útiles

- PostgreSQL pg_dump: https://www.postgresql.org/docs/current/app-pgdump.html
- Hetzner Storage Box: https://docs.hetzner.com/robot/storage-box/
- Cron: https://crontab.guru/

## Conclusión

Este sistema de backup proporciona:

- **Fiabilidad**: Backups automáticos diarios sin intervención
- **Seguridad**: Almacenamiento offsite cifrado
- **Flexibilidad**: Múltiples opciones de restauración
- **Visibilidad**: Monitoreo y alertas en tiempo real
- **Simplicidad**: Instalación en minutos, uso intuitivo

El sistema está diseñado siguiendo las mejores prácticas de la industria y puede escalar desde pequeños proyectos hasta bases de datos de nivel empresarial.
