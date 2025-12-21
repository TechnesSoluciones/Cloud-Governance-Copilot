# GitHub Secrets Configuration

Para que el workflow de release automático funcione, necesitas configurar los siguientes secrets en GitHub.

## Cómo Configurar Secrets

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agrega cada secret a continuación

## Secrets Requeridos

### 🔐 Deployment Secrets

#### `APP_SERVER_HOST`
**Descripción**: IP o hostname del servidor de producción
**Ejemplo**: `104.248.123.45` o `copilot.yourdomain.com`
**Requerido**: ✅ Sí

#### `APP_SERVER_USER`
**Descripción**: Usuario SSH para conectarse al servidor
**Ejemplo**: `deploy` o `ubuntu` o `root`
**Requerido**: ✅ Sí

#### `SSH_PRIVATE_KEY`
**Descripción**: Llave SSH privada para autenticación
**Cómo obtenerla**:
```bash
# En tu máquina local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/copilot-deploy
cat ~/.ssh/copilot-deploy  # Esta es tu private key para el secret

# En el servidor de producción, agrega la public key
cat ~/.ssh/copilot-deploy.pub >> ~/.ssh/authorized_keys
```
**Requerido**: ✅ Sí

#### `DEPLOY_PORT`
**Descripción**: Puerto SSH del servidor (opcional, default: 22)
**Ejemplo**: `22`
**Requerido**: ❌ No (usa 22 por default)

#### `DEPLOY_PATH`
**Descripción**: Ruta absoluta del proyecto en el servidor
**Ejemplo**: `/opt/copilot` o `/home/deploy/copilot`
**Requerido**: ❌ No (usa `/opt/copilot` por default)

### 🔑 GitHub Token

#### `GITHUB_TOKEN`
**Descripción**: Token automático de GitHub
**Requerido**: ✅ Sí (ya viene incluido automáticamente)
**Nota**: No necesitas crear este secret, GitHub lo provee automáticamente.

## Verificar Configuración

Después de configurar los secrets:

1. Ve a Actions → Release & Deploy
2. Click "Run workflow"
3. Selecciona el tipo de bump (patch/minor/major)
4. Click "Run workflow"

Si todos los secrets están bien configurados, el workflow debería ejecutarse sin errores.

## Troubleshooting

### Error: "Permission denied (publickey)"
- Verifica que `DEPLOY_SSH_KEY` tenga la llave privada correcta
- Verifica que la llave pública esté en `~/.ssh/authorized_keys` del servidor

### Error: "Host key verification failed"
- Primera vez que GitHub se conecta al servidor
- Conéctate manualmente una vez desde tu máquina al servidor para aceptar la host key

### Error: "No such file or directory"
- Verifica que `DEPLOY_PATH` apunte al directorio correcto
- Asegúrate de que el directorio exista en el servidor

## Setup Inicial del Servidor

En el servidor de producción, asegúrate de tener:

```bash
# Clonar el repositorio
cd /opt
git clone https://github.com/TechnesSoluciones/Cloud-Governance-Copilot.git copilot
cd copilot

# Configurar permisos
chown -R deploy:deploy /opt/copilot  # Cambia 'deploy' por tu usuario

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin

# Agregar usuario al grupo docker
usermod -aG docker deploy  # Cambia 'deploy' por tu usuario

# Crear archivo .env con las variables de producción
cp .env.example .env
nano .env  # Configura todas las variables
```
