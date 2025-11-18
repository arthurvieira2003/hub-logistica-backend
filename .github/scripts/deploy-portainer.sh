#!/bin/bash

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

ENV_FILE=".env"
ENV_ARRAY=()
if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}Carregando variáveis de ambiente de $ENV_FILE...${NC}"
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
      line=$(echo "$line" | xargs)
      if [[ -n "$line" ]]; then
        ENV_ARRAY+=("$line")
      fi
    fi
  done < "$ENV_FILE"
  echo -e "${GREEN}Variáveis de ambiente carregadas${NC}"
fi

echo -e "${YELLOW}Autenticando no Portainer...${NC}"
echo "URL do Portainer: ${PORTAINER_URL}"

CURL_OPTS=""
if [[ "${PORTAINER_URL}" == https://* ]]; then
  echo -e "${YELLOW}Aviso: Usando HTTPS. Ignorando verificação de certificado SSL (flag -k)${NC}"
  CURL_OPTS="-k"
fi

AUTH_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${PORTAINER_USERNAME}\",\"Password\":\"${PORTAINER_PASSWORD}\"}")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ -z "$HTTP_CODE" ] || [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}Erro: Falha na autenticação no Portainer${NC}"
  echo "Código HTTP: ${HTTP_CODE:-'N/A'}"
  echo "Resposta: $AUTH_BODY"
  echo "Verifique:"
  echo "  - Se a URL do Portainer está correta: ${PORTAINER_URL}"
  echo "  - Se as credenciais estão corretas"
  echo "  - Se o Portainer está acessível do servidor"
  exit 1
fi

JWT_TOKEN=$(echo "$AUTH_BODY" | grep -o '"jwt":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Erro: Token JWT não encontrado na resposta${NC}"
  echo "Resposta: $AUTH_BODY"
  exit 1
fi

echo -e "${GREEN}Autenticado com sucesso${NC}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}Erro: Arquivo $COMPOSE_FILE não encontrado${NC}"
  exit 1
fi

if base64 --help 2>&1 | grep -q "wrap"; then
  COMPOSE_CONTENT=$(cat "$COMPOSE_FILE" | base64 -w 0)
else
  COMPOSE_CONTENT=$(cat "$COMPOSE_FILE" | base64 | tr -d '\n')
fi

ENV_JSON="[]"
if [ ${#ENV_ARRAY[@]} -gt 0 ]; then
  ENV_JSON="["
  for i in "${!ENV_ARRAY[@]}"; do
    if [ $i -gt 0 ]; then
      ENV_JSON+=","
    fi
    KEY=$(echo "${ENV_ARRAY[$i]}" | cut -d'=' -f1)
    VALUE=$(echo "${ENV_ARRAY[$i]}" | cut -d'=' -f2-)
    VALUE=$(echo "$VALUE" | sed 's/"/\\"/g')
    ENV_JSON+="{\"name\":\"$KEY\",\"value\":\"$VALUE\"}"
  done
  ENV_JSON+="]"
fi

echo -e "${YELLOW}Verificando se a stack existe...${NC}"
STACKS_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  "${PORTAINER_URL}/api/stacks?filters={\"EndpointID\":${PORTAINER_ENDPOINT_ID}}" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

STACKS_HTTP_CODE=$(echo "$STACKS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
STACKS_BODY=$(echo "$STACKS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ -z "$STACKS_HTTP_CODE" ] || [ "$STACKS_HTTP_CODE" != "200" ]; then
  echo -e "${RED}Erro ao buscar stacks: Código HTTP ${STACKS_HTTP_CODE:-'N/A'}${NC}"
  echo "Resposta: $STACKS_BODY"
  exit 1
fi

STACK_ID=$(echo "$STACKS_BODY" | grep -o "\"Id\":[0-9]*" | head -1 | cut -d':' -f2)

if [ -z "$STACK_ID" ]; then
  STACK_NAME_MATCH=$(echo "$STACKS_BODY" | grep -i "\"Name\":\"${PORTAINER_STACK_NAME}\"" -A 5 | grep -o "\"Id\":[0-9]*" | head -1 | cut -d':' -f2)
  if [ -n "$STACK_NAME_MATCH" ]; then
    STACK_ID="$STACK_NAME_MATCH"
  fi
fi

if [ -n "$STACK_ID" ]; then
  echo -e "${YELLOW}Stack encontrada (ID: $STACK_ID). Atualizando...${NC}"
  
  UPDATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"StackFileContent\": \"${COMPOSE_CONTENT}\",
      \"Env\": ${ENV_JSON}
    }")
  
  UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_CODE:/d')
  
  if [ -z "$UPDATE_HTTP_CODE" ] || [ "$UPDATE_HTTP_CODE" != "200" ]; then
    echo -e "${RED}Erro ao atualizar stack: Código HTTP ${UPDATE_HTTP_CODE:-'N/A'}${NC}"
    echo "Resposta: $UPDATE_BODY"
    exit 1
  fi
  
  if echo "$UPDATE_BODY" | grep -qi "error"; then
    echo -e "${RED}Erro ao atualizar stack: $UPDATE_BODY${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Stack atualizada com sucesso!${NC}"
else
  echo -e "${YELLOW}Stack não encontrada. Criando nova stack...${NC}"
  
  CREATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    "${PORTAINER_URL}/api/stacks?type=2&method=string&endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"Name\": \"${PORTAINER_STACK_NAME}\",
      \"StackFileContent\": \"${COMPOSE_CONTENT}\",
      \"Env\": ${ENV_JSON}
    }")
  
  CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')
  
  if [ -z "$CREATE_HTTP_CODE" ] || [ "$CREATE_HTTP_CODE" != "200" ]; then
    echo -e "${RED}Erro ao criar stack: Código HTTP ${CREATE_HTTP_CODE:-'N/A'}${NC}"
    echo "Resposta: $CREATE_BODY"
    exit 1
  fi
  
  if echo "$CREATE_BODY" | grep -qi "error"; then
    echo -e "${RED}Erro ao criar stack: $CREATE_BODY${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Stack criada com sucesso!${NC}"
fi

echo -e "${GREEN}Deploy concluído com sucesso via Portainer!${NC}"

