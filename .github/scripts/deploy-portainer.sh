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
  -d "{\"username\":\"${PORTAINER_USERNAME}\",\"password\":\"${PORTAINER_PASSWORD}\"}")

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

COMPOSE_CONTENT=""
while IFS= read -r line || [ -n "$line" ]; do
  line=$(echo "$line" | sed 's/\\/\\\\/g')
  line=$(echo "$line" | sed 's/"/\\"/g')
  if [ -z "$COMPOSE_CONTENT" ]; then
    COMPOSE_CONTENT="$line"
  else
    COMPOSE_CONTENT="$COMPOSE_CONTENT\\n$line"
  fi
done < "$COMPOSE_FILE"

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
  "${PORTAINER_URL}/api/stacks" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

STACKS_HTTP_CODE=$(echo "$STACKS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
STACKS_BODY=$(echo "$STACKS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ -z "$STACKS_HTTP_CODE" ] || [ "$STACKS_HTTP_CODE" != "200" ]; then
  echo -e "${RED}Erro ao buscar stacks: Código HTTP ${STACKS_HTTP_CODE:-'N/A'}${NC}"
  echo "Resposta: $STACKS_BODY"
  exit 1
fi

if command -v jq &> /dev/null; then
  STACK_ID=$(echo "$STACKS_BODY" | jq -r ".[] | select(.EndpointId == ${PORTAINER_ENDPOINT_ID} and .Name == \"${PORTAINER_STACK_NAME}\") | .Id" | head -1)
else
  for id in $(echo "$STACKS_BODY" | grep -o '"Id":[0-9]*' | cut -d':' -f2); do
    stack_section=$(echo "$STACKS_BODY" | grep -A 30 "\"Id\":$id" | head -30)
    if echo "$stack_section" | grep -qi "\"Name\":\"${PORTAINER_STACK_NAME}\"" && \
       echo "$stack_section" | grep -q "\"EndpointId\":${PORTAINER_ENDPOINT_ID}"; then
      STACK_ID=$id
      break
    fi
  done
fi

if [ -n "$STACK_ID" ]; then
  echo -e "${YELLOW}Stack encontrada (ID: $STACK_ID). Atualizando...${NC}"
  
  # Parar a stack antes de atualizar para evitar conflitos de container
  echo -e "${YELLOW}Parando a stack...${NC}"
  STOP_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}/stop?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")
  
  STOP_HTTP_CODE=$(echo "$STOP_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  
  if [ -n "$STOP_HTTP_CODE" ] && [ "$STOP_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}Stack parada com sucesso${NC}"
    # Aguardar alguns segundos para garantir que os containers foram removidos
    sleep 3
  else
    echo -e "${YELLOW}Aviso: Não foi possível parar a stack (código: ${STOP_HTTP_CODE:-'N/A'})${NC}"
    echo -e "${YELLOW}Continuando com a atualização...${NC}"
  fi
  
  UPDATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"stackFileContent\": \"${COMPOSE_CONTENT}\",
      \"env\": ${ENV_JSON},
      \"pullImage\": true,
      \"prune\": true
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
  
  echo -e "${YELLOW}Tentando criar stack como Swarm...${NC}"
  CREATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    "${PORTAINER_URL}/api/stacks/create/swarm/string?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${PORTAINER_STACK_NAME}\",
      \"stackFileContent\": \"${COMPOSE_CONTENT}\",
      \"env\": ${ENV_JSON},
      \"fromAppTemplate\": false
    }")
  
  CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')
  
  if [ -z "$CREATE_HTTP_CODE" ] || [ "$CREATE_HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}Tentando criar stack como Standalone...${NC}"
    CREATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST \
      "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${PORTAINER_ENDPOINT_ID}" \
      -H "Authorization: Bearer ${JWT_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"${PORTAINER_STACK_NAME}\",
        \"stackFileContent\": \"${COMPOSE_CONTENT}\",
        \"env\": ${ENV_JSON},
        \"fromAppTemplate\": false
      }")
    
    CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')
  fi
  
  if [ -z "$CREATE_HTTP_CODE" ] || [ "$CREATE_HTTP_CODE" != "200" ]; then
    echo -e "${RED}Erro ao criar stack: Código HTTP ${CREATE_HTTP_CODE:-'N/A'}${NC}"
    echo "Endpoint ID: ${PORTAINER_ENDPOINT_ID}"
    echo "Stack Name: ${PORTAINER_STACK_NAME}"
    echo "Resposta completa: $CREATE_RESPONSE"
    echo "Corpo da resposta: $CREATE_BODY"
    echo ""
    echo "Possíveis causas:"
    echo "  - Endpoint ID incorreto"
    echo "  - Permissões insuficientes"
    echo "  - Formato do docker-compose.yml inválido"
    echo "  - Verifique a documentação da API: https://app.swaggerhub.com/apis/portainer/portainer-ce/2.33.3"
    exit 1
  fi
  
  if echo "$CREATE_BODY" | grep -qi "error"; then
    echo -e "${RED}Erro ao criar stack: $CREATE_BODY${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Stack criada com sucesso!${NC}"
fi

echo -e "${GREEN}Deploy concluído com sucesso via Portainer!${NC}"
