# Ejemplos de Despliegue Remoto

Este documento contiene ejemplos prácticos para desplegar el sistema de backups en el servidor de base de datos remoto (46.224.33.191).

## Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Ejemplos de Despliegue](#ejemplos-de-despliegue)
4. [Comandos Post-Despliegue](#comandos-post-despliegue)
5. [Troubleshooting Común](#troubleshooting-común)

---

## Prerequisitos

### 1. Configurar Acceso SSH

```bash
# Generar llave SSH si no existe
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_db_server -C "db-admin@local"

# Copiar llave al servidor remoto
ssh-copy-id -i ~/.ssh/id_ed25519_db_server root@46.224.33.191

# Probar conexión
ssh root@46.224.33.191 "echo 'Connection OK'"
```

### 2. Configurar SSH Config (Opcional pero Recomendado)

```bash
# Editar ~/.ssh/config
nano ~/.ssh/config
```

Agregar:

```
Host db-server
    HostName 46.224.33.191
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519_db_server
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Ahora puedes conectar simplemente con:

```bash
ssh db-server
```

---

## Configuración Inicial

### Navegar al Directorio de Scripts

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup
```

### Verificar Scripts Locales

```bash
# Listar scripts disponibles
ls -la *.sh

# Verificar que deploy script sea ejecutable
chmod +x deploy-to-db-server.sh
```

---

## Ejemplos de Despliegue

### Ejemplo 1: Despliegue Básico (Interactivo)

El script te pedirá las credenciales durante la ejecución:

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root

# El script solicitará:
# - Nombre de la base de datos
# - Contraseña de PostgreSQL
# - Confirmación para proceder
```

### Ejemplo 2: Despliegue Completo con Todas las Credenciales

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'MiPassword!Seguro123' \
  --hetzner-user u123456 \
  --hetzner-host u123456.your-storagebox.de
```

### Ejemplo 3: Dry-Run (Previsualización Sin Cambios)

Útil para ver qué hará el script sin ejecutar nada:

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'password' \
  --dry-run
```

### Ejemplo 4: Despliegue con Directorios Personalizados

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --remote-dir /opt/backups/postgres \
  --backup-dir /data/backups/postgres \
  --log-dir /var/log/backups \
  --db-name mi_base_datos \
  --db-password 'password'
```

### Ejemplo 5: Despliegue Sin Configurar Hetzner

Si solo quieres backups locales por ahora:

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'password' \
  --skip-hetzner
```

### Ejemplo 6: Despliegue Sin Instalar Dependencias

Si ya instalaste las dependencias manualmente:

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'password' \
  --skip-deps
```

### Ejemplo 7: Despliegue Rápido Sin Validación

Útil para redeploys cuando ya sabes que todo funciona:

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'password' \
  --skip-validation
```

### Ejemplo 8: Despliegue en Puerto SSH No Estándar

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --remote-port 2222 \
  --db-name mi_base_datos \
  --db-password 'password'
```

### Ejemplo 9: Despliegue con Usuario No-Root

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user dbadmin \
  --remote-dir /home/dbadmin/postgres-backups \
  --backup-dir /home/dbadmin/backups \
  --db-name mi_base_datos \
  --db-password 'password'
```

### Ejemplo 10: Despliegue Completo con Todas las Opciones

```bash
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --remote-port 22 \
  --remote-dir /opt/postgresql-backups \
  --backup-dir /var/backups/postgres \
  --log-dir /var/log/postgres-backup \
  --db-host localhost \
  --db-port 5432 \
  --db-name production_db \
  --db-user postgres \
  --db-password 'SuperSecurePassword123!' \
  --hetzner-user u123456 \
  --hetzner-host u123456.your-storagebox.de \
  --hetzner-port 23 \
  --hetzner-dir /backups/postgres/production
```

---

## Comandos Post-Despliegue

### Verificar Instalación

```bash
# Conectar al servidor
ssh root@46.224.33.191

# Verificar scripts instalados
ls -la /opt/postgresql-backups/

# Verificar configuración
cat /opt/postgresql-backups/configs/backup.conf

# Ejecutar validación
cd /opt/postgresql-backups
./validate-setup.sh
```

### Ejecutar Primer Backup Manual

```bash
# Conectar al servidor
ssh root@46.224.33.191

# Ejecutar backup
cd /opt/postgresql-backups
./backup.sh

# Monitorear log en tiempo real
tail -f /var/log/postgres-backup/backup.log

# En otra terminal, verificar archivos generados
ls -lh /var/backups/postgres/
```

### Verificar Cron Job

```bash
# Ver cron jobs instalados
ssh root@46.224.33.191 "crontab -l"

# Debería mostrar:
# 0 2 * * * /opt/postgresql-backups/backup.sh >> /opt/postgresql-backups/logs/cron.log 2>&1
```

### Configurar Hetzner (Post-Despliegue)

Si no configuraste Hetzner durante el despliegue:

```bash
# Conectar al servidor
ssh root@46.224.33.191

# Ejecutar wizard de Hetzner
cd /opt/postgresql-backups
./setup-hetzner.sh --setup

# Seguir instrucciones para agregar llave pública

# Probar conexión
./setup-hetzner.sh --test
```

### Monitorear Sistema

```bash
# Ver estado de backups
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./monitor.sh"

# Ver últimos logs
ssh root@46.224.33.191 "tail -n 50 /var/log/postgres-backup/backup.log"

# Ver espacio en disco
ssh root@46.224.33.191 "df -h /var/backups/postgres"
```

### Ejecutar Test de Restore

```bash
# Conectar al servidor
ssh root@46.224.33.191

# Listar backups disponibles
ls -lt /var/backups/postgres/*.gz | head -n 5

# Crear BD de prueba
psql -h localhost -U postgres -c "CREATE DATABASE test_restore;"

# Ejecutar restore
cd /opt/postgresql-backups
./restore.sh \
  --backup-file /var/backups/postgres/postgres_backup_YYYYMMDD_HHMMSS.custom.gz \
  --target-db test_restore

# Verificar datos
psql -h localhost -U postgres -d test_restore -c "\dt"

# Limpiar
psql -h localhost -U postgres -c "DROP DATABASE test_restore;"
```

---

## Troubleshooting Común

### Problema: Error de Conexión SSH

```bash
# Verificar conectividad básica
ping 46.224.33.191

# Verificar puerto SSH abierto
nc -zv 46.224.33.191 22
telnet 46.224.33.191 22

# Verificar autenticación
ssh -v root@46.224.33.191

# Solución: Copiar llave SSH
ssh-copy-id root@46.224.33.191
```

### Problema: Permission Denied

```bash
# Verificar permisos en servidor remoto
ssh root@46.224.33.191 "ls -la /opt/postgresql-backups"

# Corregir permisos
ssh root@46.224.33.191 "chmod 700 /opt/postgresql-backups/*.sh"
ssh root@46.224.33.191 "chmod 600 /opt/postgresql-backups/configs/*"
```

### Problema: PostgreSQL Connection Failed

```bash
# Verificar servicio PostgreSQL
ssh root@46.224.33.191 "systemctl status postgresql"

# Verificar puerto escuchando
ssh root@46.224.33.191 "netstat -tlnp | grep 5432"

# Probar conexión local
ssh root@46.224.33.191 "psql -h localhost -U postgres -d postgres -c 'SELECT 1'"

# Verificar pg_hba.conf
ssh root@46.224.33.191 "cat /etc/postgresql/*/main/pg_hba.conf | grep localhost"
```

### Problema: Cron Job No Ejecuta

```bash
# Verificar servicio cron
ssh root@46.224.33.191 "systemctl status cron"

# Ver logs de cron
ssh root@46.224.33.191 "tail -f /var/log/syslog | grep CRON"

# Verificar crontab
ssh root@46.224.33.191 "crontab -l"

# Ejecutar manualmente para debug
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./backup.sh"
```

### Problema: Backup Muy Lento

```bash
# Verificar carga del servidor
ssh root@46.224.33.191 "top -bn1 | head -20"

# Verificar I/O
ssh root@46.224.33.191 "iostat -x 1 5"

# Ajustar configuración
ssh root@46.224.33.191 "nano /opt/postgresql-backups/configs/backup.conf"

# Aumentar parallel jobs:
# PARALLEL_JOBS=4
```

### Problema: Espacio en Disco Lleno

```bash
# Verificar espacio
ssh root@46.224.33.191 "df -h"

# Limpiar backups antiguos
ssh root@46.224.33.191 "find /var/backups/postgres -name '*.gz' -mtime +30 -delete"

# Ajustar retención
ssh root@46.224.33.191 "nano /opt/postgresql-backups/configs/backup.conf"

# Reducir:
# RETENTION_DAYS=7
# MAX_LOCAL_BACKUPS=5
```

---

## Scripts de Utilidad

### Script: Backup y Log en Tiempo Real

Guardar como `watch-backup.sh`:

```bash
#!/bin/bash
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./backup.sh & tail -f /var/log/postgres-backup/backup.log"
```

### Script: Status Rápido

Guardar como `backup-status.sh`:

```bash
#!/bin/bash
echo "=== Backup Status ==="
ssh root@46.224.33.191 "ls -lht /var/backups/postgres/ | head -n 5"
echo ""
echo "=== Últimos logs ==="
ssh root@46.224.33.191 "tail -n 10 /var/log/postgres-backup/backup.log"
```

### Script: Restore Rápido

Guardar como `quick-restore.sh`:

```bash
#!/bin/bash
BACKUP_FILE=$1
TARGET_DB=${2:-test_restore}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [target_db]"
    exit 1
fi

ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./restore.sh --backup-file $BACKUP_FILE --target-db $TARGET_DB"
```

---

## Mantenimiento Regular

### Comando Diario

```bash
# Verificar último backup
ssh root@46.224.33.191 "ls -lht /var/backups/postgres/ | head -n 1"
```

### Comando Semanal

```bash
# Ejecutar reporte completo
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./monitor.sh --send-report"
```

### Comando Mensual

```bash
# Test de restore
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./verify-backup.sh --all"
```

---

## Actualizar Scripts

Para actualizar scripts en el servidor remoto después de cambios locales:

```bash
# Hacer backup de configuración actual
ssh root@46.224.33.191 "cp /opt/postgresql-backups/configs/backup.conf /tmp/backup.conf.bak"

# Re-ejecutar despliegue sin reinstalar dependencias
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root \
  --db-name mi_base_datos \
  --db-password 'password' \
  --skip-deps \
  --skip-validation

# Restaurar configuración personalizada si es necesario
ssh root@46.224.33.191 "cp /tmp/backup.conf.bak /opt/postgresql-backups/configs/backup.conf"
```

---

## Contactos y Recursos

- Documentación completa: `/Users/josegomez/Documents/Code/SaaS/Copilot/docs/HETZNER_REMOTE_DEPLOYMENT.md`
- Scripts: `/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/`
- Logs de despliegue: `/tmp/postgres_backup_deployment_*.log`

---

**Última actualización:** 2025-12-22
**Versión:** 1.0.0
