# Sistema de Backup PostgreSQL - Índice de Documentación

Bienvenido al sistema completo de backup automatizado para PostgreSQL con integración a Hetzner Storage Box.

## Inicio Rápido

Si es la primera vez que usas este sistema, comienza aquí:

1. **[QUICKSTART.md](QUICKSTART.md)** - Guía rápida de 5 minutos
   - Instalación rápida
   - Primer backup
   - Comandos básicos

## Documentación Completa

### Para Usuarios

- **[README.md](README.md)** - Documentación completa del sistema
  - Características y capacidades
  - Instalación detallada
  - Guía de uso
  - Configuración avanzada
  - Solución de problemas
  - FAQs

### Para Administradores

- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Resumen técnico
  - Arquitectura del sistema
  - Especificaciones técnicas
  - Componentes y su funcionamiento
  - Procedimientos de operación
  - Métricas y KPIs
  - Mantenimiento

## Scripts Disponibles

### Scripts Principales

| Script | Descripción | Uso |
|--------|-------------|-----|
| **install.sh** | Instalador automático todo-en-uno | `./install.sh` |
| **backup.sh** | Ejecuta backup de PostgreSQL | `./backup.sh` |
| **restore.sh** | Restaura desde un backup | `./restore.sh --list` |
| **verify-backup.sh** | Verifica integridad de backups | `./verify-backup.sh --all` |

### Scripts de Configuración

| Script | Descripción | Uso |
|--------|-------------|-----|
| **setup-hetzner.sh** | Configura Hetzner Storage Box | `./setup-hetzner.sh --setup` |
| **setup-cron.sh** | Configura automatización con cron | `./setup-cron.sh --install` |

### Scripts de Utilidad

| Script | Descripción | Uso |
|--------|-------------|-----|
| **monitor.sh** | Dashboard de monitoreo | `./monitor.sh` |
| **validate-setup.sh** | Valida configuración del sistema | `./validate-setup.sh` |

## Guías por Tarea

### Primera Instalación

```bash
# Método 1: Instalador automático (recomendado)
./install.sh

# Método 2: Manual
1. Editar configs/backup.conf
2. ./validate-setup.sh
3. ./backup.sh
4. ./setup-cron.sh --install
```

Ver: [README.md - Instalación](README.md#instalación-rápida)

### Configurar Hetzner Storage Box

```bash
# Asistente interactivo
./setup-hetzner.sh --setup

# Probar conexión
./setup-hetzner.sh --test
```

Ver: [README.md - Hetzner Storage Box](README.md#configuración-de-hetzner-storage-box)

### Realizar Backups

```bash
# Backup manual
./backup.sh

# Verificar backups
./verify-backup.sh --all

# Listar backups disponibles
./restore.sh --list
```

Ver: [README.md - Uso Detallado](README.md#uso-detallado)

### Restaurar Base de Datos

```bash
# Listar backups
./restore.sh --list

# Restaurar desde local
./restore.sh -f /path/to/backup.sql.gz

# Restaurar desde Hetzner
./restore.sh --from-hetzner

# Restaurar a nueva DB
./restore.sh -f backup.sql.gz -d copilot_test --new-db
```

Ver: [README.md - Restauración](README.md#restaurar-desde-un-backup)

### Automatizar Backups

```bash
# Instalar cron jobs
./setup-cron.sh --install

# Ver estado
./setup-cron.sh --status

# Desinstalar
./setup-cron.sh --uninstall
```

Ver: [README.md - Automatización](README.md#automatización-con-cron)

### Monitorear Sistema

```bash
# Dashboard único
./monitor.sh

# Auto-refresh cada 30s
./monitor.sh watch 30

# Solo alertas
./monitor.sh alerts
```

Ver: [SYSTEM_OVERVIEW.md - Monitoreo](SYSTEM_OVERVIEW.md#monitoreo-y-alertas)

## Estructura del Sistema

```
/Users/josegomez/Documents/Code/SaaS/Copilot/
│
├── scripts/backup/              # Sistema de backup
│   ├── *.sh                     # Scripts ejecutables
│   ├── *.md                     # Documentación
│   ├── configs/                 # Configuración
│   │   └── backup.conf          # Config principal
│   └── logs/                    # Logs del sistema
│
└── backups/postgres/            # Almacén de backups
    └── copilot_db_backup_*.gz   # Archivos de backup
```

## Comandos Más Usados

### Operaciones Diarias

```bash
# Ver estado del sistema
./monitor.sh

# Backup manual
./backup.sh

# Ver logs
tail -f logs/backup_$(date +%Y%m).log
```

### Operaciones Semanales

```bash
# Verificar todos los backups
./verify-backup.sh --all

# Generar reporte de salud
./verify-backup.sh --report

# Probar Hetzner
./setup-hetzner.sh --test
```

### Operaciones Mensuales

```bash
# Validar sistema completo
./validate-setup.sh

# Probar restauración
./restore.sh --verify-only -f /path/to/backup.sql.gz
```

## Solución Rápida de Problemas

### Error de Conexión a Base de Datos

```bash
# 1. Verificar configuración
cat configs/backup.conf | grep DB_

# 2. Probar conexión manual
psql -h 46.224.33.191 -p 5432 -U copilot_dev -d copilot_dev

# 3. Ver logs
tail -50 logs/backup_$(date +%Y%m).log | grep ERROR
```

### Error de Hetzner

```bash
# 1. Verificar configuración
./setup-hetzner.sh --config

# 2. Probar conexión
./setup-hetzner.sh --test

# 3. Regenerar clave SSH
./setup-hetzner.sh --generate-key
```

### Backup Falla

```bash
# 1. Ver logs detallados
tail -100 logs/backup_$(date +%Y%m).log

# 2. Validar sistema
./validate-setup.sh

# 3. Probar manualmente
./backup.sh
```

Ver: [README.md - Solución de Problemas](README.md#solución-de-problemas)

## Casos de Uso Comunes

### 1. Backup Antes de Actualización

```bash
./backup.sh
./verify-backup.sh --all
# Realizar actualización
# Si falla: ./restore.sh -f /path/to/pre-update-backup.sql.gz
```

### 2. Migrar a Nuevo Servidor

```bash
# Servidor antiguo
./backup.sh

# Servidor nuevo
./setup-hetzner.sh --setup
./restore.sh --from-hetzner -d copilot_dev --new-db
```

### 3. Clonar a Desarrollo

```bash
./restore.sh -f production-backup.sql.gz -d copilot_dev_local --new-db
```

Ver: [SYSTEM_OVERVIEW.md - Casos de Uso](SYSTEM_OVERVIEW.md#casos-de-uso)

## Configuración

### Archivo Principal

- **Location**: `configs/backup.conf`
- **Permissions**: 600 (solo lectura/escritura por propietario)

### Secciones Importantes

```bash
# Base de datos
DB_HOST="46.224.33.191"
DB_NAME="copilot_dev"

# Retención
RETENTION_DAYS=30
MAX_LOCAL_BACKUPS=14

# Hetzner
HETZNER_USER="u123456"
HETZNER_HOST="u123456.your-storagebox.de"

# Notificaciones
NOTIFY_EMAIL="admin@domain.com"
```

Ver: [README.md - Configuración Avanzada](README.md#configuración-avanzada)

## Seguridad

### Mejores Prácticas

1. **Permisos de archivos**:
   ```bash
   chmod 600 configs/backup.conf
   chmod 700 /path/to/backups
   chmod 600 ~/.ssh/id_rsa_hetzner_backup
   ```

2. **Protección de credenciales**:
   - Usar archivos .pgpass
   - Variables de entorno
   - Nunca commitear credenciales a git

3. **Backups encriptados** (próximamente):
   ```bash
   ENCRYPTION_ENABLED=true
   ```

Ver: [SYSTEM_OVERVIEW.md - Seguridad](SYSTEM_OVERVIEW.md#seguridad)

## Mantenimiento

### Tareas Regulares

- **Diario**: Verificar que cron ejecutó el backup
- **Semanal**: Revisar logs y métricas
- **Mensual**: Probar restauración completa
- **Trimestral**: Disaster recovery drill

Ver: [SYSTEM_OVERVIEW.md - Mantenimiento](SYSTEM_OVERVIEW.md#mantenimiento)

## Recursos Adicionales

### Ayuda en Línea

Todos los scripts tienen ayuda integrada:

```bash
./backup.sh --help
./restore.sh --help
./setup-hetzner.sh --help
./monitor.sh --help
```

### Enlaces Útiles

- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Hetzner Storage Box](https://docs.hetzner.com/robot/storage-box/)
- [Cron Expression Generator](https://crontab.guru/)

### Soporte

1. Revisar logs en `logs/`
2. Ejecutar `./validate-setup.sh`
3. Consultar sección de troubleshooting en README.md
4. Generar reporte: `./verify-backup.sh --report`

## Mejoras Futuras

- Encriptación GPG de backups
- Backup incremental con WAL
- Dashboard web
- Múltiples destinos de backup
- API REST para gestión

Ver: [SYSTEM_OVERVIEW.md - Mejoras Futuras](SYSTEM_OVERVIEW.md#mejoras-futuras)

---

**Última Actualización**: 2025-12-21
**Versión del Sistema**: 1.0.0
**Proyecto**: Cloud Governance Copilot
