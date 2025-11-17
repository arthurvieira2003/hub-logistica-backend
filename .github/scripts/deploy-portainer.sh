#!/bin/bash

# Script alternativo usando API do Portainer
# Requer: PORTAINER_URL, PORTAINER_USERNAME, PORTAINER_PASSWORD, PORTAINER_ENDPOINT_ID, PORTAINER_STACK_NAME

set -e

echo "Iniciando deploy do HUB Logística via Portainer API..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORTAINER_URL=${PORTAINER_URL:-"http://localhost:9000"}
PORTAINER_USERNAME=${PORTAINER_USERNAME}
PORTAINER_PASSWORD=${PORTAINER_PASSWORD}
PORTAINER_ENDPOINT_ID=${PORTAINER_ENDPOINT_ID:-1}
PORTAINER_STACK_NAME=${PORTAINER_STACK_NAME:-"hub-logistica"}
COMPOSE_FILE="docker-compose.yml"

if [ -z "$PORTAINER_USERNAME" ] || [ -z "$PORTAINER_PASSWORD" ]; then
  echo -e "${RED}Erro: PORTAINER_USERNAME e PORTAINER_PASSWORD devem estar definidos${NC}"
  exit 1
fi

# Carregar variáveis de ambiente do .env se existir
ENV_FILE=".env"
ENV_ARRAY=()
if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}Carregando variáveis de ambiente de $ENV_FILE...${NC}"
  while IFS= read -r line || [ -n "$line" ]; do
    # Ignorar linhas vazias e comentários
    if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
      # Remover espaços em branco no início e fim
      line=$(echo "$line" | xargs)
      if [[ -n "$line" ]]; then
        ENV_ARRAY+=("$line")
      fi
    fi
  done < "$ENV_FILE"
  echo -e "${GREEN}Variáveis de ambiente carregadas${NC}"
fi

# Obter token de autenticação
echo -e "${YELLOW}Autenticando no Portainer...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${PORTAINER_USERNAME}\",\"Password\":\"${PORTAINER_PASSWORD}\"}")

JWT_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"jwt":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Erro: Falha na autenticação no Portainer${NC}"
  echo "Resposta: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}Autenticado com sucesso${NC}"

# Ler o arquivo docker-compose.yml
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}Erro: Arquivo $COMPOSE_FILE não encontrado${NC}"
  exit 1
fi

# Ler o arquivo docker-compose.yml e codificar em base64
# Usar base64 sem -w para compatibilidade (macOS não tem -w)
if base64 --help 2>&1 | grep -q "wrap"; then
  COMPOSE_CONTENT=$(cat "$COMPOSE_FILE" | base64 -w 0)
else
  COMPOSE_CONTENT=$(cat "$COMPOSE_FILE" | base64 | tr -d '\n')
fi

# Preparar array de variáveis de ambiente para o Portainer
ENV_JSON="[]"
if [ ${#ENV_ARRAY[@]} -gt 0 ]; then
  ENV_JSON="["
  for i in "${!ENV_ARRAY[@]}"; do
    if [ $i -gt 0 ]; then
      ENV_JSON+=","
    fi
    # Separar chave e valor
    KEY=$(echo "${ENV_ARRAY[$i]}" | cut -d'=' -f1)
    VALUE=$(echo "${ENV_ARRAY[$i]}" | cut -d'=' -f2-)
    # Escapar aspas no valor
    VALUE=$(echo "$VALUE" | sed 's/"/\\"/g')
    ENV_JSON+="{\"name\":\"$KEY\",\"value\":\"$VALUE\"}"
  done
  ENV_JSON+="]"
fi

# Verificar se a stack já existe
echo -e "${YELLOW}Verificando se a stack existe...${NC}"
STACKS_RESPONSE=$(curl -s -X GET \
  "${PORTAINER_URL}/api/stacks?filters={\"EndpointID\":${PORTAINER_ENDPOINT_ID}}" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

# Buscar o ID da stack pelo nome
STACK_ID=$(echo "$STACKS_RESPONSE" | grep -o "\"Id\":[0-9]*" | head -1 | cut -d':' -f2)

# Verificar se encontrou a stack pelo nome também
if [ -z "$STACK_ID" ]; then
  # Tentar buscar pelo nome da stack
  STACK_NAME_MATCH=$(echo "$STACKS_RESPONSE" | grep -i "\"Name\":\"${PORTAINER_STACK_NAME}\"" -A 5 | grep -o "\"Id\":[0-9]*" | head -1 | cut -d':' -f2)
  if [ -n "$STACK_NAME_MATCH" ]; then
    STACK_ID="$STACK_NAME_MATCH"
  fi
fi

if [ -n "$STACK_ID" ]; then
  echo -e "${YELLOW}Stack encontrada (ID: $STACK_ID). Atualizando...${NC}"
  
  # Atualizar stack existente
  UPDATE_RESPONSE=$(curl -s -X PUT \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"StackFileContent\": \"${COMPOSE_CONTENT}\",
      \"Env\": ${ENV_JSON}
    }")
  
  if echo "$UPDATE_RESPONSE" | grep -q "error"; then
    echo -e "${RED}Erro ao atualizar stack: $UPDATE_RESPONSE${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Stack atualizada com sucesso!${NC}"
else
  echo -e "${YELLOW}Stack não encontrada. Criando nova stack...${NC}"
  
  # Criar nova stack
  CREATE_RESPONSE=$(curl -s -X POST \
    "${PORTAINER_URL}/api/stacks?type=2&method=string&endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"Name\": \"${PORTAINER_STACK_NAME}\",
      \"StackFileContent\": \"${COMPOSE_CONTENT}\",
      \"Env\": ${ENV_JSON}
    }")
  
  if echo "$CREATE_RESPONSE" | grep -q "error"; then
    echo -e "${RED}Erro ao criar stack: $CREATE_RESPONSE${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Stack criada com sucesso!${NC}"
fi

echo -e "${GREEN}Deploy concluído com sucesso via Portainer!${NC}"

