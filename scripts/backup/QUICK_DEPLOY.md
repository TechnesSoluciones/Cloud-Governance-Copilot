# Despliegue Rápido - 5 Minutos

Guía rápida para desplegar backups de PostgreSQL en tu servidor de base de datos (46.224.33.191).

## Pre-requisitos (2 minutos)

```bash
# 1. Configura SSH
ssh-copy-id root@46.224.33.191

# 2. Prueba conexión
ssh root@46.224.33.191 "echo 'OK'"
```

## Despliegue Automatizado (3 minutos)

```bash
# Navega al directorio
cd /Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup

# Ejecuta el despliegue
./deploy-to-db-server.sh \
  --remote-host 46.224.33.191 \
  --remote-user root

# El script te pedirá:
# - Nombre de la base de datos
# - Contraseña de PostgreSQL
# - Credenciales de Hetzner (opcional)
```

## Verificación

```bash
# Ejecuta backup de prueba
ssh root@46.224.33.191 "cd /opt/postgresql-backups && ./backup.sh"

# Verifica archivos
ssh root@46.224.33.191 "ls -lh /var/backups/postgres/"
```

## Siguiente Paso

Para configurar Hetzner Storage Box:

```bash
ssh root@46.224.33.191
cd /opt/postgresql-backups
./setup-hetzner.sh --setup
```

## Ventajas

- Backups directos desde servidor de BD (50% menos transferencia)
- Conexión localhost (más rápido y seguro)
- Credenciales aisladas en servidor de BD
- Backups automáticos diarios a las 2 AM

## Documentación Completa

- `/Users/josegomez/Documents/Code/SaaS/Copilot/docs/HETZNER_REMOTE_DEPLOYMENT.md`
- `/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/backup/DEPLOYMENT_EXAMPLES.md`

## Ayuda

```bash
./deploy-to-db-server.sh --help
```
