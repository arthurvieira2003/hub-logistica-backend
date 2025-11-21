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
  echo -e "${YELLOW}Stack encontrada (ID: $STACK_ID). Deletando para recriar...${NC}"
  
  DELETE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${PORTAINER_ENDPOINT_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")
  
  DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  
  if [ -n "$DELETE_HTTP_CODE" ] && [ "$DELETE_HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}Stack deletada com sucesso${NC}"
    echo -e "${YELLOW}Aguardando limpeza completa...${NC}"
    
    MAX_RETRIES=5
    RETRY_COUNT=0
    STACK_STILL_EXISTS=true
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$STACK_STILL_EXISTS" = true ]; do
      sleep 10
      RETRY_COUNT=$((RETRY_COUNT + 1))
      echo -e "${YELLOW}Verificando se a limpeza foi concluída (tentativa $RETRY_COUNT/$MAX_RETRIES)...${NC}"
      
      CHECK_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X GET \
        "${PORTAINER_URL}/api/stacks" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
      
      CHECK_HTTP_CODE=$(echo "$CHECK_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
      CHECK_BODY=$(echo "$CHECK_RESPONSE" | sed '/HTTP_CODE:/d')
      
      FOUND_STACK_ID=""
      if command -v jq &> /dev/null; then
        FOUND_STACK_ID=$(echo "$CHECK_BODY" | jq -r ".[] | select(.EndpointId == ${PORTAINER_ENDPOINT_ID} and .Name == \"${PORTAINER_STACK_NAME}\") | .Id" | head -1)
      else
        for id in $(echo "$CHECK_BODY" | grep -o '"Id":[0-9]*' | cut -d':' -f2); do
          stack_section=$(echo "$CHECK_BODY" | grep -A 30 "\"Id\":$id" | head -30)
          if echo "$stack_section" | grep -qi "\"Name\":\"${PORTAINER_STACK_NAME}\"" && \
             echo "$stack_section" | grep -q "\"EndpointId\":${PORTAINER_ENDPOINT_ID}"; then
            FOUND_STACK_ID=$id
            break
          fi
        done
      fi
      
      if [ -z "$FOUND_STACK_ID" ] || [ "$FOUND_STACK_ID" = "" ] || [ "$FOUND_STACK_ID" = "null" ]; then
        echo -e "${GREEN}Limpeza confirmada. Stack não existe mais.${NC}"
        STACK_STILL_EXISTS=false
      else
        echo -e "${YELLOW}Stack ainda existe (ID: $FOUND_STACK_ID). Aguardando...${NC}"
      fi
    done
    
    if [ "$STACK_STILL_EXISTS" = true ]; then
      echo -e "${YELLOW}Aviso: Stack ainda pode estar sendo processada, mas continuando com a criação...${NC}"
    fi
    
    STACK_ID=""
  else
    echo -e "${RED}Erro ao deletar stack: Código HTTP ${DELETE_HTTP_CODE:-'N/A'}${NC}"
    DELETE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_CODE:/d')
    echo "Resposta: $DELETE_BODY"
    exit 1
  fi
fi

if [ -z "$STACK_ID" ]; then
  echo -e "${YELLOW}Criando stack...${NC}"
  
  STACK_CREATED=false
  MAX_CREATE_RETRIES=3
  CREATE_RETRY_COUNT=0
  
  while [ "$STACK_CREATED" = false ] && [ $CREATE_RETRY_COUNT -lt $MAX_CREATE_RETRIES ]; do
    CREATE_RETRY_COUNT=$((CREATE_RETRY_COUNT + 1))
    
    if [ $CREATE_RETRY_COUNT -eq 1 ]; then
      echo -e "${YELLOW}Tentando criar stack como Swarm...${NC}"
      STACK_TYPE="swarm"
    else
      echo -e "${YELLOW}Tentando criar stack como Standalone (tentativa $CREATE_RETRY_COUNT/$MAX_CREATE_RETRIES)...${NC}"
      STACK_TYPE="standalone"
    fi
    
    CREATE_RESPONSE=$(curl $CURL_OPTS -s -w "\nHTTP_CODE:%{http_code}" -X POST \
      "${PORTAINER_URL}/api/stacks/create/${STACK_TYPE}/string?endpointId=${PORTAINER_ENDPOINT_ID}" \
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
    
    if [ "$CREATE_HTTP_CODE" = "200" ]; then
      STACK_CREATED=true
      echo -e "${GREEN}Stack criada com sucesso!${NC}"
    elif [ "$CREATE_HTTP_CODE" = "409" ]; then
      echo -e "${YELLOW}Erro 409 (Conflict): Stack ainda existe. Aguardando 15 segundos antes da próxima tentativa...${NC}"
      if [ $CREATE_RETRY_COUNT -lt $MAX_CREATE_RETRIES ]; then
        sleep 15
      fi
    else
      echo -e "${YELLOW}Erro ao criar stack: Código HTTP ${CREATE_HTTP_CODE:-'N/A'}${NC}"
      if [ $CREATE_RETRY_COUNT -lt $MAX_CREATE_RETRIES ]; then
        echo -e "${YELLOW}Aguardando 10 segundos antes da próxima tentativa...${NC}"
        sleep 10
      fi
    fi
  done
  
  if [ "$STACK_CREATED" = false ]; then
    echo -e "${RED}Erro ao criar stack após $MAX_CREATE_RETRIES tentativas: Código HTTP ${CREATE_HTTP_CODE:-'N/A'}${NC}"
    echo "Endpoint ID: ${PORTAINER_ENDPOINT_ID}"
    echo "Stack Name: ${PORTAINER_STACK_NAME}"
    echo "Resposta completa: $CREATE_RESPONSE"
    echo "Corpo da resposta: $CREATE_BODY"
    echo ""
    echo "Possíveis causas:"
    echo "  - Endpoint ID incorreto"
    echo "  - Permissões insuficientes"
    echo "  - Formato do docker-compose.yml inválido"
    echo "  - Stack ainda existe no Portainer (tente deletar manualmente)"
    echo "  - Verifique a documentação da API: https://app.swaggerhub.com/apis/portainer/portainer-ce/2.33.3"
    exit 1
  fi
  
  if echo "$CREATE_BODY" | grep -qi "error"; then
    echo -e "${RED}Erro ao criar stack: $CREATE_BODY${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Deploy concluído com sucesso via Portainer!${NC}"
