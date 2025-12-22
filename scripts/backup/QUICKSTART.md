# Quick Start Guide - PostgreSQL Backup System

Guía rápida para poner en funcionamiento el sistema de backups en 5 minutos.

## Instalación Rápida (Método Recomendado)

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
./install.sh
```

El instalador interactivo te guiará por todos los pasos.

## Instalación Manual

### 1. Configurar Credenciales

Las credenciales de la base de datos ya están configuradas desde tu archivo `.env`:

- **Host**: 46.224.33.191
- **Puerto**: 5432
- **Base de datos**: copilot_dev
- **Usuario**: copilot_dev

No necesitas cambiar nada en `configs/backup.conf` para la configuración básica.

### 2. Primer Backup Manual

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
./backup.sh
```

El backup se guardará en: `/Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres/`

### 3. Verificar Backup

```bash
./verify-backup.sh --all
```

### 4. Listar Backups

```bash
./restore.sh --list
```

### 5. Configurar Automatización (Opcional)

```bash
./setup-cron.sh --install
```

Esto configurará backups diarios a las 2:00 AM.

## Configurar Hetzner Storage Box (Opcional pero Recomendado)

### Paso 1: Ejecutar Asistente

```bash
./setup-hetzner.sh --setup
```

### Paso 2: Ingresar Datos

El asistente te pedirá:
- **Username**: Tu usuario de Hetzner (ej: u123456)
- **Hostname**: Tu hostname de Hetzner (ej: u123456.your-storagebox.de)
- **Puerto SSH**: 23 (por defecto)

### Paso 3: Configurar Clave SSH

El script generará una clave SSH. Copia la clave pública mostrada y:

1. Ve a https://robot.hetzner.com/
2. Selecciona tu Storage Box
3. Habilita SSH/SFTP
4. Agrega la clave pública en "SSH Keys"

O usa este comando:

```bash
ssh-copy-id -p 23 -i ~/.ssh/id_rsa_hetzner_backup u123456@u123456.your-storagebox.de
```

### Paso 4: Probar Conexión

```bash
./setup-hetzner.sh --test
```

## Uso Diario

### Hacer Backup Manual

```bash
./backup.sh
```

### Ver Backups Disponibles

```bash
./restore.sh --list
```

### Restaurar Base de Datos

```bash
# Restaurar último backup
./restore.sh -f /path/to/backup.sql.gz

# Restaurar desde Hetzner
./restore.sh --from-hetzner
```

### Ver Logs

```bash
tail -f logs/backup_$(date +%Y%m).log
```

### Generar Reporte de Salud

```bash
./verify-backup.sh --report
```

## Verificar que Todo Funciona

```bash
# 1. Verificar instalación
ls -la *.sh

# 2. Verificar configuración
cat configs/backup.conf | grep -E "^(DB_|BACKUP_)"

# 3. Probar conexión a base de datos
psql -h 46.224.33.191 -p 5432 -U copilot_dev -d copilot_dev -c "SELECT version();"

# 4. Hacer backup de prueba
./backup.sh

# 5. Verificar backup
./verify-backup.sh --all

# 6. Ver backups creados
ls -lh /Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres/
```

## Estructura de Archivos Creados

```
/Users/josegomez/Documents/Code/SaaS/Copilot/
├── scripts/backup/
│   ├── backup.sh              # Script principal de backup
│   ├── restore.sh             # Script de restauración
│   ├── verify-backup.sh       # Verificación de backups
│   ├── setup-cron.sh          # Configurar automatización
│   ├── setup-hetzner.sh       # Configurar Hetzner
│   ├── install.sh             # Instalador automático
│   ├── configs/
│   │   └── backup.conf        # Configuración principal
│   └── logs/                  # Logs de operaciones
└── backups/postgres/          # Backups de PostgreSQL
    └── copilot_db_backup_*.gz # Archivos de backup
```

## Comandos Más Usados

```bash
# Hacer backup ahora
./backup.sh

# Listar backups
./restore.sh --list

# Restaurar último backup
./restore.sh --from-hetzner

# Ver estado de cron
./setup-cron.sh --status

# Verificar todos los backups
./verify-backup.sh --all

# Probar Hetzner
./setup-hetzner.sh --test

# Ver logs en tiempo real
tail -f logs/backup_$(date +%Y%m).log
```

## Solución Rápida de Problemas

### Error: "Cannot connect to database"

```bash
# Verificar credenciales
cat configs/backup.conf | grep DB_

# Probar conexión manual
psql -h 46.224.33.191 -p 5432 -U copilot_dev -d copilot_dev
```

### Error: "Permission denied"

```bash
# Dar permisos a scripts
chmod +x *.sh

# Dar permisos a directorios
chmod 700 /Users/josegomez/Documents/Code/SaaS/Copilot/backups/postgres
```

### Error: "Hetzner connection failed"

```bash
# Probar conexión SSH manual
ssh -p 23 -i ~/.ssh/id_rsa_hetzner_backup u123456@u123456.your-storagebox.de

# Verificar clave pública
cat ~/.ssh/id_rsa_hetzner_backup.pub
```

### Backup muy lento

```bash
# Editar configs/backup.conf
nano configs/backup.conf

# Cambiar:
COMPRESSION_LEVEL=6  # Reducir de 9 a 6
PARALLEL_JOBS=4      # Aumentar paralelismo
```

## Próximos Pasos

1. **Configurar Notificaciones**
   - Edita `configs/backup.conf`
   - Configura `NOTIFY_EMAIL` o `SLACK_WEBHOOK_URL`

2. **Ajustar Retención**
   - Edita `RETENTION_DAYS` y `MAX_LOCAL_BACKUPS` en `backup.conf`

3. **Probar Restauración**
   - Crea una base de datos de prueba
   - Restaura un backup para verificar integridad

4. **Monitorear**
   - Revisa logs semanalmente
   - Ejecuta `./verify-backup.sh --report` mensualmente

## Ayuda

Para documentación completa:
```bash
cat README.md
```

Para ayuda de un script específico:
```bash
./backup.sh --help
./restore.sh --help
./setup-hetzner.sh --help
```

## Contacto

Si tienes problemas:
1. Revisa los logs en `logs/`
2. Ejecuta `./verify-backup.sh --report`
3. Consulta el README.md completo
