#!/bin/bash

set -e

echo "🚀 Iniciando deploy do HUB Logística..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="/opt/hub-logistica/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -f "$ENV_FILE" ]; then
  export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Variáveis de ambiente carregadas de $ENV_FILE${NC}"
else
  echo -e "${YELLOW}⚠ Arquivo .env não encontrado. Usando variáveis de ambiente do sistema.${NC}"
fi

mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Fazendo backup do docker-compose atual...${NC}"
if [ -f "$COMPOSE_FILE" ]; then
  cp "$COMPOSE_FILE" "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml"
  echo -e "${GREEN}✓ Backup criado em $BACKUP_DIR/docker-compose_$TIMESTAMP.yml${NC}"
fi

echo -e "${YELLOW}🔐 Fazendo login no Docker Hub...${NC}"
if [ -z "$DOCKER_HUB_TOKEN" ] || [ -z "$DOCKER_HUB_USERNAME" ]; then
  echo -e "${YELLOW}⚠ DOCKER_HUB_TOKEN ou DOCKER_HUB_USERNAME não definidos. Pulando login...${NC}"
  echo -e "${YELLOW}⚠ Certifique-se de que as imagens são públicas ou que o login já foi feito.${NC}"
else
  echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin || {
    echo -e "${YELLOW}⚠ Erro ao fazer login. Tentando continuar...${NC}"
  }
fi

echo -e "${YELLOW}📥 Baixando imagens mais recentes...${NC}"
docker-compose -f "$COMPOSE_FILE" pull || {
  echo -e "${RED}✗ Erro ao fazer pull das imagens${NC}"
  exit 1
}

echo -e "${YELLOW}🛑 Parando containers existentes...${NC}"
docker-compose -f "$COMPOSE_FILE" down || {
  echo -e "${YELLOW}⚠ Nenhum container em execução${NC}"
}

echo -e "${YELLOW}🧹 Limpando imagens antigas...${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d || {
  echo -e "${RED}✗ Erro ao iniciar containers${NC}"
  echo -e "${YELLOW}🔄 Tentando restaurar backup...${NC}"
  if [ -f "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml" ]; then
    cp "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml" "$COMPOSE_FILE"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
  fi
  exit 1
}

echo -e "${YELLOW}⏳ Aguardando containers iniciarem...${NC}"
sleep 10

echo -e "${YELLOW}🏥 Verificando saúde dos containers...${NC}"
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
  echo -e "${GREEN}✓ Containers iniciados com sucesso!${NC}"
else
  echo -e "${RED}✗ Erro: Containers não estão rodando${NC}"
  docker-compose -f "$COMPOSE_FILE" ps
  docker-compose -f "$COMPOSE_FILE" logs --tail=50
  exit 1
fi

echo -e "${YELLOW}📊 Status dos containers:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

echo -e "${YELLOW}📝 Últimas linhas dos logs:${NC}"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
if [ -n "$VPS_IP" ]; then
  echo -e "${GREEN}🌐 Backend: http://${VPS_IP}:4010${NC}"
  echo -e "${GREEN}🌐 Frontend: http://${VPS_IP}:3060${NC}"
fi

