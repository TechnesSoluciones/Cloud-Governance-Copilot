# PostgreSQL Backup System

Sistema completo de respaldo automatizado para PostgreSQL con integración a Hetzner Storage Box.

## Características

- **Backups automáticos diarios** usando pg_dump
- **Compresión optimizada** con gzip (nivel configurable)
- **Integración con Hetzner Storage Box** mediante rsync/SSH
- **Rotación de backups** configurable (local y remota)
- **Logs detallados** de todas las operaciones
- **Notificaciones** por email/webhook/Slack en caso de fallo
- **Scripts de restauración** robustos
- **Verificación de integridad** de backups
- **Reportes de salud** del sistema de backup

## Estructura de Archivos

```
/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/
├── backup.sh              # Script principal de backup
├── restore.sh             # Script de restauración
├── verify-backup.sh       # Verificación de integridad
├── setup-cron.sh          # Configuración de automatización
├── setup-hetzner.sh       # Configuración de Hetzner Storage Box
├── configs/
│   └── backup.conf        # Archivo de configuración principal
├── logs/                  # Logs de operaciones
└── README.md             # Esta documentación
```

## Instalación Rápida

### 1. Configurar credenciales

Edita el archivo de configuración:

```bash
nano /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/configs/backup.conf
```

Configura las siguientes variables esenciales:

```bash
# Base de datos (ya configurada desde .env)
DB_HOST="46.224.33.191"
DB_PORT="5432"
DB_NAME="copilot_dev"
DB_USER="copilot_dev"
DB_PASSWORD="0tF8ex0EYYLKJ8%2B4gZqP%2FHiqsCEfRfJt"

# Notificaciones (opcional)
NOTIFY_EMAIL="tu-email@dominio.com"

# Hetzner Storage Box (configurar después)
HETZNER_USER="u123456"
HETZNER_HOST="u123456.your-storagebox.de"
```

### 2. Configurar Hetzner Storage Box (Opcional)

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
./setup-hetzner.sh --setup
```

Sigue el asistente interactivo para:
- Generar claves SSH
- Configurar credenciales
- Probar la conexión

### 3. Probar el backup manualmente

```bash
./backup.sh
```

### 4. Configurar backups automáticos

```bash
./setup-cron.sh --install
```

Esto configurará:
- Backup diario a las 02:00 AM
- Verificación semanal (domingos a las 03:00 AM)
- Reporte mensual (día 1 a las 04:00 AM)

## Uso Detallado

### Realizar un Backup Manual

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
./backup.sh
```

El script ejecutará:
1. Verificación de conexión a la base de datos
2. Creación del dump con pg_dump
3. Compresión del archivo
4. Subida a Hetzner Storage Box (si está configurado)
5. Rotación de backups antiguos
6. Registro en logs

### Restaurar desde un Backup

#### Listar backups disponibles

```bash
./restore.sh --list
```

#### Restaurar a la base de datos original

```bash
./restore.sh -f /path/to/backup.sql.gz
```

#### Restaurar a una nueva base de datos

```bash
./restore.sh -f /path/to/backup.sql.gz -d copilot_restored --new-db
```

#### Restaurar desde Hetzner Storage Box

```bash
./restore.sh --from-hetzner
```

#### Solo verificar integridad (sin restaurar)

```bash
./restore.sh -f /path/to/backup.sql.gz --verify-only
```

### Verificar Backups

#### Verificar todos los backups locales

```bash
./verify-backup.sh --all
```

#### Verificar frescura de backups

```bash
./verify-backup.sh --freshness
```

#### Generar reporte de salud completo

```bash
./verify-backup.sh --report
```

## Configuración de Hetzner Storage Box

### Configuración Inicial

1. **Adquirir Hetzner Storage Box**
   - Contratar en: https://www.hetzner.com/storage/storage-box
   - Anotar credenciales (username, hostname)

2. **Habilitar SSH en Robot Panel**
   - Ir a: https://robot.hetzner.com/
   - Navegar a tu Storage Box
   - Activar SSH/SFTP

3. **Ejecutar asistente de configuración**

```bash
./setup-hetzner.sh --setup
```

4. **Agregar clave pública**

El script mostrará tu clave pública. Agrégala en el panel de Hetzner o usa:

```bash
ssh-copy-id -p 23 -i ~/.ssh/id_rsa_hetzner_backup u123456@u123456.your-storagebox.de
```

5. **Probar conexión**

```bash
./setup-hetzner.sh --test
```

### Solución de Problemas Hetzner

#### Error: Connection refused

```bash
# Verificar que SSH está habilitado en Robot panel
# Verificar puerto (usualmente 23)
ssh -p 23 -v u123456@u123456.your-storagebox.de
```

#### Error: Permission denied (publickey)

```bash
# Verificar que la clave pública está agregada
# Regenerar y agregar nuevamente
./setup-hetzner.sh --generate-key
./setup-hetzner.sh --upload-key
```

#### Probar conexión manual

```bash
ssh -p 23 -i ~/.ssh/id_rsa_hetzner_backup u123456@u123456.your-storagebox.de
```

## Automatización con Cron

### Instalar trabajos cron

```bash
./setup-cron.sh --install
```

### Ver estado de cron

```bash
./setup-cron.sh --status
```

### Probar backup manualmente

```bash
./setup-cron.sh --test
```

### Desinstalar trabajos cron

```bash
./setup-cron.sh --uninstall
```

### Horarios configurados

- **Backup diario**: 02:00 AM todos los días
- **Verificación**: 03:00 AM todos los domingos
- **Reporte mensual**: 04:00 AM el día 1 de cada mes

Puedes modificar estos horarios editando el script `setup-cron.sh`.

## Notificaciones

### Configurar Email

Edita `configs/backup.conf`:

```bash
NOTIFICATIONS_ENABLED=true
NOTIFICATION_METHOD="email"
NOTIFY_EMAIL="admin@tudominio.com"
EMAIL_FROM="backup@tudominio.com"
```

Requiere que el sistema tenga configurado `sendmail` o `mail`.

### Configurar Webhook

```bash
WEBHOOK_ENABLED=true
WEBHOOK_URL="https://tu-webhook.com/endpoint"
```

El webhook recibirá un POST con JSON:

```json
{
  "status": "success",
  "timestamp": "2025-12-21T02:00:00Z",
  "database": "copilot_dev",
  "message": "Backup completed successfully"
}
```

### Configurar Slack

```bash
SLACK_ENABLED=true
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Healthchecks.io

Para monitoreo externo:

```bash
HEALTHCHECK_ENABLED=true
HEALTHCHECK_URL="https://hc-ping.com/your-uuid"
```

## Configuración Avanzada

### Ajustar Compresión

En `configs/backup.conf`:

```bash
# Nivel 1 = rápido, menos compresión
# Nivel 9 = lento, máxima compresión
COMPRESSION_LEVEL=9
```

### Habilitar Backups Paralelos

```bash
# Requiere PostgreSQL >= 9.3
USE_CUSTOM_FORMAT=true
PARALLEL_JOBS=4
```

### Ajustar Retención

```bash
# Retención local (días)
RETENTION_DAYS=30
MAX_LOCAL_BACKUPS=14

# Retención en Hetzner (días)
HETZNER_RETENTION_DAYS=90
```

### Backup Solo de Esquema

```bash
SCHEMA_ONLY_BACKUP=true
```

Esto creará archivos adicionales `*_schema.sql.gz` con solo la estructura.

### Ejecutar VACUUM antes del Backup

```bash
RUN_VACUUM=true
```

Optimiza la base de datos antes del backup (puede tardar más).

## Monitoreo y Logs

### Ubicación de Logs

```
/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/
├── backup_YYYYMM.log       # Logs de backup
├── restore_*.log           # Logs de restauración
├── verify_*.log            # Logs de verificación
├── cron.log                # Logs de cron (backups automáticos)
└── backup_health_report_*.txt  # Reportes de salud
```

### Ver logs en tiempo real

```bash
tail -f /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/backup_$(date +%Y%m).log
```

### Analizar logs

```bash
# Ver últimos errores
grep ERROR /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/backup_*.log

# Ver backups exitosos
grep "Backup Completed Successfully" /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/backup_*.log
```

## Seguridad

### Permisos de Archivos

El sistema configura automáticamente permisos seguros:

```bash
chmod 700 /Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres
chmod 600 /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/configs/backup.conf
chmod 600 ~/.ssh/id_rsa_hetzner_backup
```

### Proteger Contraseñas

Las contraseñas están en `backup.conf`. Opciones más seguras:

1. **Variables de entorno**:
```bash
export PGPASSWORD="tu_password"
# Luego modificar backup.sh para usar $PGPASSWORD
```

2. **Archivo .pgpass**:
```bash
echo "46.224.33.191:5432:copilot_dev:copilot_dev:PASSWORD" > ~/.pgpass
chmod 600 ~/.pgpass
```

3. **Encriptar backups** (próxima implementación):
```bash
ENCRYPTION_ENABLED=true
```

## Restauración de Desastres

### Escenario 1: Pérdida de Datos Reciente

```bash
# 1. Listar backups
./restore.sh --list

# 2. Restaurar el más reciente
./restore.sh -f /path/to/latest_backup.sql.gz
```

### Escenario 2: Servidor Destruido

```bash
# 1. Instalar PostgreSQL en nuevo servidor
# 2. Crear base de datos
# 3. Descargar backup desde Hetzner
./restore.sh --from-hetzner -d copilot_dev --new-db
```

### Escenario 3: Restaurar a Punto Específico

```bash
# 1. Encontrar backup del día deseado
./restore.sh --list

# 2. Restaurar a nueva base de datos para pruebas
./restore.sh -f backup_20251220_020000.sql.gz -d copilot_test --new-db

# 3. Verificar datos
psql -h 46.224.33.191 -U copilot_dev -d copilot_test

# 4. Si es correcto, restaurar a producción
./restore.sh -f backup_20251220_020000.sql.gz -D
```

## Mantenimiento

### Limpieza Manual de Backups Antiguos

```bash
# Eliminar backups locales mayores a 60 días
find /Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres -name "*.gz" -mtime +60 -delete
```

### Rotación Manual de Logs

```bash
# Comprimir logs antiguos
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs
gzip backup_$(date -d '1 month ago' +%Y%m).log
```

### Verificación Mensual

Ejecuta manualmente una vez al mes:

```bash
# Generar reporte de salud
./verify-backup.sh --report

# Probar restauración
./restore.sh --from-hetzner --verify-only
```

## Solución de Problemas

### Backup falla con "Cannot connect to database"

```bash
# Verificar conectividad
psql -h 46.224.33.191 -p 5432 -U copilot_dev -d copilot_dev

# Verificar credenciales en backup.conf
cat configs/backup.conf | grep DB_
```

### Espacio en disco lleno

```bash
# Ver uso de disco
df -h /Users/josegomez/Documents/Code/SaaS/Copilot/backups

# Limpiar backups antiguos
find /Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres -name "*.gz" -mtime +30 -delete
```

### Backup muy lento

```bash
# Habilitar compresión paralela
# En backup.conf:
USE_CUSTOM_FORMAT=true
PARALLEL_JOBS=4

# Reducir nivel de compresión
COMPRESSION_LEVEL=6
```

### Upload a Hetzner falla

```bash
# Probar conexión
./setup-hetzner.sh --test

# Ver logs detallados
grep -i hetzner /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/backup_*.log

# Probar rsync manual
rsync -avz --progress -e "ssh -p 23 -i ~/.ssh/id_rsa_hetzner_backup" \
  /path/to/backup.gz u123456@u123456.your-storagebox.de:/backups/postgres/
```

## Preguntas Frecuentes

### ¿Con qué frecuencia se hacen los backups?

Por defecto, diariamente a las 02:00 AM. Puedes modificarlo en `setup-cron.sh`.

### ¿Cuánto espacio necesito?

Depende del tamaño de tu base de datos. Con compresión nivel 9:
- Base de datos de 1 GB → ~100-200 MB comprimido
- Retención de 30 días → ~3-6 GB de espacio

### ¿Los backups son seguros?

Sí, los archivos tienen permisos 600 (solo el propietario puede leer). Para mayor seguridad, considera encriptar los backups.

### ¿Puedo hacer backup de múltiples bases de datos?

Sí, crea múltiples archivos de configuración y scripts separados para cada base de datos.

### ¿Funciona con Docker?

Sí, pero necesitas ajustar las rutas y posiblemente ejecutar los scripts dentro del contenedor o conectarte remotamente.

### ¿Qué pasa si el backup falla?

- Se registra en los logs
- Se envía notificación (si está configurada)
- El backup anterior permanece intacto
- Se puede reintentar manualmente

## Ejemplos de Uso

### Backup antes de actualización importante

```bash
# Backup manual con timestamp específico
./backup.sh
```

### Restaurar entorno de desarrollo

```bash
# Restaurar a base de datos local
./restore.sh -f /path/to/production_backup.sql.gz -d copilot_local --new-db
```

### Migrar a nuevo servidor

```bash
# En servidor antiguo: hacer backup
./backup.sh

# Subir a Hetzner (automático)

# En servidor nuevo: descargar y restaurar
./restore.sh --from-hetzner -d copilot_dev --new-db
```

## Soporte

Para problemas o preguntas:

1. Revisa los logs en `/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/logs/`
2. Ejecuta `./verify-backup.sh --report` para diagnóstico
3. Consulta la sección de Solución de Problemas

## Contribuir

Mejoras sugeridas:
- Encriptación de backups con GPG
- Backup incremental
- Soporte para PostgreSQL en Docker
- Dashboard web para monitoreo

## Licencia

Parte del proyecto Cloud Governance Copilot.
