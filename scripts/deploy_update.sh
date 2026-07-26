#!/usr/bin/env bash
set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  SSO Deployment Update Script${NC}"
echo -e "${CYAN}=============================================${NC}"

# ============================================
# PARÁMETROS POR DEFECTO
# ============================================
SSH_PORT=22
PM2_NAME="sso-google-auth"
BRANCH=""
DEPLOY_PATH=""
SSH_HOST=""
SSH_USER=""
SSH_PASSWORD=""
SSH_KEY=""
AUTH_MODE="" # password o key

# ============================================
# PARSEO DE ARGUMENTOS
# ============================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h=*|--host=*) SSH_HOST="${1#*=}" ;;
    -u=*|--user=*) SSH_USER="${1#*=}" ;;
    -p=*|--port=*) SSH_PORT="${1#*=}" ;;
    -P=*|--password=*) SSH_PASSWORD="${1#*=}" ; AUTH_MODE="password" ;;
    -k=*|--key=*) SSH_KEY="${1#*=}" ; AUTH_MODE="key" ;;
    -b=*|--branch=*) BRANCH="${1#*=}" ;;
    -d=*|--deploy-path=*) DEPLOY_PATH="${1#*=}" ;;
    -n=*|--pm2-name=*) PM2_NAME="${1#*=}" ;;
    -h|--host) SSH_HOST="$2"; shift ;;
    -u|--user) SSH_USER="$2"; shift ;;
    -p|--port) SSH_PORT="$2"; shift ;;
    -P|--password) SSH_PASSWORD="$2"; AUTH_MODE="password"; shift ;;
    -k|--key) SSH_KEY="$2"; AUTH_MODE="key"; shift ;;
    -b|--branch) BRANCH="$2"; shift ;;
    -d|--deploy-path) DEPLOY_PATH="$2"; shift ;;
    -n|--pm2-name) PM2_NAME="$2"; shift ;;
    *) echo -e "${RED}Error: Parámetro desconocido: $1${NC}"; exit 1 ;;
  esac
  shift
done

# ============================================
# VALIDACIÓN DE REQUISITOS LOCALES
# ============================================
echo -e "\n${YELLOW}[1/5] Validando requisitos locales...${NC}"

if ! command -v ssh &>/dev/null; then
  echo -e "${RED}Error: SSH no está instalado.${NC}"
  exit 1
fi

if [[ "$AUTH_MODE" == "password" ]]; then
  if ! command -v sshpass &>/dev/null; then
    echo -e "${RED}Error: sshpass no está instalado. Instalar con: apt install sshpass${NC}"
    exit 1
  fi
fi

if [[ "$AUTH_MODE" == "key" ]]; then
  if [[ ! -f "$SSH_KEY" ]]; then
    echo -e "${RED}Error: El archivo .pem no existe: $SSH_KEY${NC}"
    exit 1
  fi
  local perms=$(stat -c "%a" "$SSH_KEY")
  if [[ "$perms" != "600" && "$perms" != "400" ]]; then
    echo -e "${YELLOW}Advertencia: Permisos de $SSH_KEY son $perms. Se recomienda: chmod 600 $SSH_KEY${NC}"
  fi
fi

echo -e "${GREEN}  ✓ Requisitos OK${NC}"

# ============================================
# PREGUNTAR DATOS FALTANTES
# ============================================
echo -e "\n${YELLOW}[2/5] Configurando parámetros de conexión...${NC}"

if [[ -z "$SSH_HOST" ]]; then
  read -r -p "  Host del servidor (IP o dominio): " SSH_HOST
fi

if [[ -z "$SSH_USER" ]]; then
  read -r -p "  Usuario SSH: " SSH_USER
fi

if [[ -z "$AUTH_MODE" ]]; then
  echo "  Método de autenticación:"
  echo "    1) Contraseña"
  echo "    2) Archivo .pem"
  read -r -p "  Selecciona (1/2): """ auth_choice
  if [[ "$auth_choice" == "1" ]]; then
    AUTH_MODE="password"
    read -r -s -p "  Contraseña SSH: " SSH_PASSWORD
    echo ""
  else
    AUTH_MODE="key"
    read -r -p "  Ruta al archivo .pem: " SSH_KEY
    if [[ ! -f "$SSH_KEY" ]]; then
      echo -e "${RED}Error: El archivo no existe.${NC}"
      exit 1
    fi
  fi
fi

if [[ -z "$BRANCH" ]]; then
  read -r -p "  Rama de git a desplegar (default: main): " input_branch
  BRANCH="${input_branch:-main}"
fi

if [[ -z "$DEPLOY_PATH" ]]; then
  read -r -p "  Ruta de instalación en el servidor (ej: /var/www/sso_general): " DEPLOY_PATH
fi

if [[ -z "$PM2_NAME" ]]; then
  read -r -p "  Nombre del proceso PM2 (default: sso-google-auth): " input_pm2
  PM2_NAME="${input_pm2:-sso-google-auth}"
fi

echo -e "${GREEN}  ✓ Parámetros configurados${NC}"

# ============================================
# CONSTRUIR COMANDO SSH
# ============================================
SSH_OPTS="-p $SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH_DEST="$SSH_USER@$SSH_HOST"

PASSFILE=""
if [[ "$AUTH_MODE" == "password" ]]; then
  PASSFILE=$(mktemp)
  echo "$SSH_PASSWORD" > "$PASSFILE"
  SSH_CMD="sshpass -f '$PASSFILE' ssh $SSH_OPTS $SSH_DEST"
else
  SSH_CMD="ssh -i $SSH_KEY $SSH_OPTS $SSH_DEST"
fi

cleanup() {
  if [[ -n "$PASSFILE" && -f "$PASSFILE" ]]; then
    rm -f "$PASSFILE"
  fi
}
trap cleanup EXIT

# ============================================
# CONECTAR Y EJECUTAR COMANDOS REMOTOS
# ============================================
echo -e "\n${YELLOW}[3/5] Conectando al servidor...${NC}"

if ! eval "$SSH_CMD" "echo CONECTADO" | grep -q CONECTADO; then
  echo -e "${RED}Error: No se pudo conectar al servidor.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Conexión establecida${NC}"

echo -e "\n${YELLOW}[4/5] Ejecutando actualización en el servidor...${NC}"

REMOTE_SCRIPT=$(cat << 'REMOTEEOF'
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}  → Cambiando al directorio del proyecto...${NC}"
cd "DEPLOY_PATH_PLACEHOLDER"

echo -e "${YELLOW}  → Guardando cambios locales (git stash)...${NC}"
git stash --include-untracked || echo -e "${YELLOW}  (sin cambios locales para stash)${NC}"

echo -e "${YELLOW}  → Cambiando a rama BRANCH_PLACEHOLDER...${NC}"
git checkout "BRANCH_PLACEHOLDER"

echo -e "${YELLOW}  → Actualizando código (git pull)...${NC}"
git pull origin "BRANCH_PLACEHOLDER"

echo -e "${YELLOW}  → Instalando dependencias...${NC}"
npm install

echo -e "${YELLOW}  → Ejecutando migraciones de base de datos...${NC}"
npm run migrate:latest

echo -e "${YELLOW}  → Reiniciando proceso PM2...${NC}"
pm2 restart "PM2_NAME_PLACEHOLDER"

echo -e "${YELLOW}  → Estado de PM2:${NC}"
pm2 list

echo -e "${GREEN}  ✓ Actualización completada${NC}"
REMOTEEOF
)

REMOTE_SCRIPT="${REMOTE_SCRIPT//DEPLOY_PATH_PLACEHOLDER/$DEPLOY_PATH}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//BRANCH_PLACEHOLDER/$BRANCH}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//PM2_NAME_PLACEHOLDER/$PM2_NAME}"

eval "$SSH_CMD" "bash -s" <<< "$REMOTE_SCRIPT"

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  DESPLIEGUE ACTUALIZADO EXITOSAMENTE${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "  Servidor:    ${CYAN}$SSH_HOST${NC}"
echo -e "  Ruta:        ${CYAN}$DEPLOY_PATH${NC}"
echo -e "  Rama:        ${CYAN}$BRANCH${NC}"
echo -e "  PM2 proceso: ${CYAN}$PM2_NAME${NC}"
echo ""
echo -e "  Comandos útiles:"
echo -e "    Ver logs:          ${CYAN}pm2 logs $PM2_NAME --lines 50${NC}"
echo -e "    Monitorear:        ${CYAN}pm2 monit${NC}"
echo -e "    Reiniciar:         ${CYAN}pm2 restart $PM2_NAME${NC}"
echo -e "    Estado procesos:   ${CYAN}pm2 list${NC}"
echo ""

cleanup
