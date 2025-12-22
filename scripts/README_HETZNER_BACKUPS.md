# Hetzner Storage Box - Scripts de Backup

Este directorio contiene scripts para gestionar backups automatizados de PostgreSQL en Hetzner Storage Box.

## Scripts Disponibles

### 1. Setup y Configuracion

#### `setup-hetzner-storagebox.sh`
**Proposito**: Configuracion inicial interactiva del Storage Box

**Uso**:
```bash
./setup-hetzner-storagebox.sh
```

**Acciones**:
- Genera clave SSH RSA-4096
- Prueba conexion al Storage Box
- Crea estructura de directorios remota
- Genera archivo `.env.storagebox` con configuracion

**Ejecutar**: Una vez, al inicio

---

#### `setup-backup-cron-hetzner.sh`
**Proposito**: Configurar backups automatizados con cron o systemd

**Uso**:
```bash
./setup-backup-cron-hetzner.sh
```

**Opciones de frecuencia**:
1. Cada 6 horas (produccion critica)
2. Diario a las 2:00 AM (produccion estandar)
3. Personalizado
4. Semanal

**Ejecutar**: Una vez, despues del setup inicial

---

### 2. Operaciones de Backup

#### `hetzner-storagebox-backup.sh`
**Proposito**: Ejecutar backup de PostgreSQL y subirlo a Storage Box

**Uso**:
```bash
# Con variables de entorno
source .env.storagebox
./hetzner-storagebox-backup.sh

# O con variables inline
DB_PASSWORD="secret" \
STORAGEBOX_USER="u123456" \
STORAGEBOX_HOST="u123456.your-storagebox.de" \
./hetzner-storagebox-backup.sh
```

**Proceso**:
1. Dump de PostgreSQL con pg_dump
2. Compresion gzip
3. Generacion de checksum SHA-256
4. Subida a Storage Box via rsync/SFTP
5. Verificacion de integridad
6. Limpieza de backups antiguos

**Variables requeridas**:
```bash
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
STORAGEBOX_USER, STORAGEBOX_HOST, STORAGEBOX_SSH_KEY
```

**Ejecutar**: Manualmente o via cron (automatizado)

---

#### `hetzner-storagebox-restore.sh`
**Proposito**: Restaurar base de datos desde backup en Storage Box

**Uso**:
```bash
source .env.storagebox
./hetzner-storagebox-restore.sh
```

**Proceso interactivo**:
1. Lista backups disponibles
2. Solicita seleccion
3. Descarga backup
4. Verifica checksum
5. Restaura base de datos (con confirmacion)

**ADVERTENCIA**: Elimina la base de datos actual. Usar con precaucion.

**Ejecutar**: Solo cuando necesites restaurar

---

### 3. Monitorizacion y Verificacion

#### `verify-hetzner-backups.sh`
**Proposito**: Verificar salud e integridad de backups

**Uso**:
```bash
source .env.storagebox
./verify-hetzner-backups.sh
```

**Verificaciones**:
- Conexion SSH al Storage Box
- Ultimos 10 backups
- Edad del ultimo backup
- Integridad (checksums + gzip test)
- Uso de almacenamiento
- Politica de retencion

**Ejecutar**: Semanalmente o mensualmente

---

## Flujo de Trabajo Recomendado

### Configuracion Inicial (Una vez)

```bash
# 1. Ejecutar setup
./setup-hetzner-storagebox.sh

# 2. Añadir clave SSH en Hetzner Robot
# (seguir instrucciones del script)

# 3. Editar configuracion
nano .env.storagebox

# 4. Probar backup manual
source .env.storagebox
./hetzner-storagebox-backup.sh

# 5. Configurar automatizacion
./setup-backup-cron-hetzner.sh

# 6. Verificar funcionamiento
./verify-hetzner-backups.sh
```

### Operacion Diaria (Automatizada)

```bash
# Cron ejecuta automaticamente:
# 0 2 * * * /path/to/hetzner-storagebox-backup.sh
```

### Mantenimiento Semanal

```bash
# Verificar salud de backups
source .env.storagebox
./verify-hetzner-backups.sh

# Revisar logs
tail -n 100 /var/log/hetzner-backup.log
grep ERROR /var/log/hetzner-backup.log
```

### Mantenimiento Mensual

```bash
# Probar restauracion en desarrollo
source .env.storagebox
./hetzner-storagebox-restore.sh

# Revisar uso de almacenamiento
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de \
    "du -sh /backups/postgresql"
```

---

## Estructura de Archivos

```
scripts/
├── hetzner-storagebox-backup.sh      # Script principal de backup
├── hetzner-storagebox-restore.sh     # Script de restauracion
├── setup-hetzner-storagebox.sh       # Setup inicial
├── setup-backup-cron-hetzner.sh      # Configurar automatizacion
├── verify-hetzner-backups.sh         # Verificacion de backups
└── README_HETZNER_BACKUPS.md         # Este archivo

.env.storagebox.example               # Plantilla de configuracion
.env.storagebox                       # Tu configuracion (no versionar)
```

---

## Variables de Entorno

### Requeridas

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `STORAGEBOX_USER` | Usuario del Storage Box | `u123456` |
| `STORAGEBOX_HOST` | Host del Storage Box | `u123456.your-storagebox.de` |
| `STORAGEBOX_SSH_KEY` | Ruta a clave SSH privada | `~/.ssh/hetzner_storagebox_rsa` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `secret123` |

### Opcionales

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `STORAGEBOX_PORT` | Puerto SSH | `23` |
| `STORAGEBOX_REMOTE_DIR` | Directorio remoto | `/backups/postgresql` |
| `LOCAL_BACKUP_DIR` | Directorio local temporal | `/tmp/postgres-backups` |
| `RETENTION_DAYS` | Dias de retencion | `30` |
| `LOG_FILE` | Archivo de log | `/var/log/hetzner-backup.log` |
| `ENABLE_SLACK_NOTIFICATIONS` | Habilitar Slack | `false` |
| `SLACK_WEBHOOK_URL` | URL de webhook Slack | - |

---

## Logs

### Ubicaciones

- **Backup principal**: `/var/log/hetzner-backup.log`
- **Cron wrapper**: `/var/log/hetzner-backup-cron.log`

### Ver logs

```bash
# Ultimas 50 lineas
tail -n 50 /var/log/hetzner-backup.log

# Seguir en tiempo real
tail -f /var/log/hetzner-backup.log

# Buscar errores
grep ERROR /var/log/hetzner-backup.log

# Contar backups exitosos
grep SUCCESS /var/log/hetzner-backup.log | wc -l
```

---

## Resolucion de Problemas

### Error: Permission denied (publickey)

**Causa**: Clave SSH no configurada correctamente

**Solucion**:
```bash
chmod 600 ~/.ssh/hetzner_storagebox_rsa
ssh-add ~/.ssh/hetzner_storagebox_rsa
```

Verificar que la clave publica esta en Hetzner Robot.

---

### Error: Connection refused

**Causa**: Puerto incorrecto o SSH deshabilitado

**Solucion**:
1. Verificar puerto es **23** (no 22)
2. Habilitar "SSH support" en Hetzner Robot
3. Revisar firewall/IP restrictions

---

### Error: command not found: pg_dump

**Causa**: PostgreSQL client no instalado

**Solucion**:
```bash
# Debian/Ubuntu
sudo apt-get install postgresql-client-15

# Verificar
which pg_dump
```

---

### Backup muy lento

**Causa**: Usando SFTP en lugar de rsync

**Solucion**:
```bash
# Instalar rsync
sudo apt-get install rsync

# El script detectara y usara rsync automaticamente
```

---

## Comandos Utiles

### Acceso SSH al Storage Box

```bash
# SSH interactivo
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de

# SFTP
sftp -P 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de

# Ejecutar comando remoto
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de "ls -lh /backups"
```

### Gestion de Backups

```bash
# Listar todos los backups
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de \
    "find /backups/postgresql -name '*.sql.gz' -type f -ls"

# Ver espacio usado
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de \
    "du -sh /backups/postgresql"

# Contar backups
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de \
    "find /backups/postgresql -name '*.sql.gz' | wc -l"

# Eliminar backup especifico
ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de \
    "rm /backups/postgresql/2024/12/21/backup_old.sql.gz"
```

### Descargar Backup

```bash
# Via rsync (rapido)
rsync -avz --progress \
    -e "ssh -p 23 -i ~/.ssh/hetzner_storagebox_rsa" \
    u123456@u123456.your-storagebox.de:/backups/postgresql/2024/12/21/backup.sql.gz \
    ./local-backup.sql.gz

# Via SFTP
sftp -P 23 -i ~/.ssh/hetzner_storagebox_rsa u123456@u123456.your-storagebox.de <<EOF
get /backups/postgresql/2024/12/21/backup.sql.gz
bye
EOF
```

---

## Seguridad

### Mejores Practicas

1. **Claves SSH**:
   - Usar RSA-4096 o Ed25519
   - Proteger clave privada: `chmod 600`
   - Rotar cada 6-12 meses

2. **Variables de Entorno**:
   - NO versionar `.env.storagebox`
   - Permisos: `chmod 600 .env.storagebox`
   - Usar gestores de secretos en produccion

3. **Acceso al Storage Box**:
   - Restringir IPs en Hetzner Robot
   - Deshabilitar protocolos no usados (FTP, Samba)
   - Monitorizar accesos

4. **Backups**:
   - Verificar checksums regularmente
   - Probar restauracion mensualmente
   - Mantener politica de retencion

---

## Referencias

- **Guia Completa**: `docs/HETZNER_STORAGEBOX_BACKUP_GUIDE.md`
- **Inicio Rapido**: `docs/HETZNER_QUICKSTART.md`
- **Configuracion**: `.env.storagebox.example`
- **Hetzner Docs**: [https://docs.hetzner.com/storage/storage-box/](https://docs.hetzner.com/storage/storage-box/)

---

## Soporte

Para problemas o preguntas:

1. Revisar guia de resolucion de problemas
2. Consultar logs: `/var/log/hetzner-backup.log`
3. Verificar configuracion: `./verify-hetzner-backups.sh`
4. Contactar soporte Hetzner: [https://www.hetzner.com/support](https://www.hetzner.com/support)

---

**Version**: 1.0
**Ultima actualizacion**: 2024-12-21
