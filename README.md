# HUB Logística - Backend

API RESTful para gerenciamento de logística que integra diferentes transportadoras e serviços de rastreamento.

## Sobre o Projeto

Este projeto é uma API RESTful desenvolvida em Node.js com Express que oferece serviços de rastreamento de entregas, gerenciamento de usuários e integração com múltiplos serviços de logística. O sistema centraliza informações de diferentes transportadoras e fornece uma interface unificada para consulta e gerenciamento de dados logísticos.

## Funcionalidades Principais

### Autenticação e Usuários

- Sistema completo de autenticação com JWT
- Cadastro, edição e gerenciamento de usuários
- Controle de permissões e status de usuários
- Gerenciamento de sessões ativas
- Upload e gerenciamento de fotos de perfil
- Alteração de senhas com criptografia bcrypt

### Integração com Transportadoras

- **Ouro Negro**: Rastreamento de entregas e consulta de notas fiscais
- **Alfa**: Consulta de informações logísticas e rastreamento
- **Princesa**: Integração com serviços da transportadora Princesa
- **Generic**: Serviço genérico para outras transportadoras
- **CTE**: Consulta e gerenciamento de Conhecimentos de Transporte Eletrônico

### Gerenciamento de Dados Logísticos

- **Estados**: CRUD completo de estados brasileiros
- **Cidades**: Gerenciamento de cidades com relacionamento com estados
- **Transportadoras**: Cadastro e gerenciamento de transportadoras
- **Faixas de Peso**: Configuração de faixas de peso para cálculo de frete
- **Rotas**: Gerenciamento de rotas de entrega
- **Preços de Faixas**: Configuração de preços por faixa de peso e rota

### Logging e Monitoramento

- Sistema de logging com Winston
- Integração com Loki para centralização de logs
- Middleware de logging HTTP com request ID
- Tratamento global de erros
- Logs estruturados para análise

## Tecnologias Utilizadas

### Backend

- **Node.js**: Ambiente de execução JavaScript
- **Express.js**: Framework web para Node.js
- **Sequelize**: ORM para banco de dados
- **PostgreSQL**: Banco de dados relacional
- **MySQL2**: Driver MySQL (para integrações externas)

### Autenticação e Segurança

- **JWT (jsonwebtoken)**: Autenticação baseada em tokens
- **Bcryptjs**: Criptografia de senhas
- **CORS**: Configuração de Cross-Origin Resource Sharing

### Integrações e Utilitários

- **Axios**: Cliente HTTP para requisições externas
- **XML2JS**: Parser de XML para integrações
- **CSV-Parse**: Parser de arquivos CSV
- **UUID**: Geração de identificadores únicos
- **Winston**: Sistema de logging
- **Dotenv**: Gerenciamento de variáveis de ambiente

### Desenvolvimento

- **Nodemon**: Reinicialização automática do servidor
- **Jest**: Framework de testes
- **Supertest**: Testes de integração HTTP

## Estrutura do Projeto

```
hub-logistica-backend/
├── config/                          # Configurações
│   ├── cors.config.js               # Configuração de CORS
│   ├── database.config.js           # Configuração do banco de dados
│   └── logger.config.js             # Configuração do logger
├── controllers/                     # Controladores (camada de apresentação)
│   ├── alfa.controller.js           # Controller Alfa
│   ├── cidades.controller.js        # Controller de cidades
│   ├── cte.controller.js            # Controller de CTE
│   ├── estados.controller.js        # Controller de estados
│   ├── faixasPeso.controller.js     # Controller de faixas de peso
│   ├── generic.controller.js        # Controller genérico
│   ├── ouroNegro.controller.js      # Controller Ouro Negro
│   ├── princesa.controller.js       # Controller Princesa
│   ├── precosFaixas.controller.js   # Controller de preços
│   ├── rotas.controller.js          # Controller de rotas
│   ├── session.controller.js        # Controller de autenticação
│   ├── transportadoras.controller.js # Controller de transportadoras
│   └── user.controller.js           # Controller de usuários
├── middleware/                      # Middlewares
│   ├── logger.middleware.js         # Middleware de logging
│   └── session.middleware.js        # Middleware de autenticação
├── models/                          # Modelos Sequelize
│   ├── cidades.model.js             # Modelo de cidades
│   ├── estados.model.js             # Modelo de estados
│   ├── faixasPeso.model.js          # Modelo de faixas de peso
│   ├── index.js                     # Índice de modelos
│   ├── precosFaixas.model.js        # Modelo de preços
│   ├── rotas.model.js               # Modelo de rotas
│   ├── session.model.js             # Modelo de sessões
│   ├── tracking.model.js            # Modelo de rastreamento
│   ├── transportadoras.model.js     # Modelo de transportadoras
│   └── user.model.js                # Modelo de usuários
├── routes/                          # Rotas da API
│   ├── alfa.route.js                # Rotas Alfa
│   ├── cidades.routes.js            # Rotas de cidades
│   ├── cte.route.js                 # Rotas de CTE
│   ├── estados.routes.js            # Rotas de estados
│   ├── faixasPeso.routes.js         # Rotas de faixas de peso
│   ├── generic.route.js             # Rotas genéricas
│   ├── index.js                     # Registro de todas as rotas
│   ├── ouroNegro.route.js           # Rotas Ouro Negro
│   ├── princesa.route.js            # Rotas Princesa
│   ├── precosFaixas.routes.js       # Rotas de preços
│   ├── rotas.routes.js              # Rotas de rotas
│   ├── session.routes.js            # Rotas de autenticação
│   ├── transportadoras.routes.js    # Rotas de transportadoras
│   └── user.routes.js               # Rotas de usuários
├── services/                        # Camada de serviços (lógica de negócios)
│   ├── alfa.service.js              # Serviço Alfa
│   ├── carrier.service.js           # Serviço de transportadoras
│   ├── cidades.service.js           # Serviço de cidades
│   ├── cte.service.js               # Serviço de CTE
│   ├── estados.service.js           # Serviço de estados
│   ├── faixasPeso.service.js        # Serviço de faixas de peso
│   ├── generic.service.js           # Serviço genérico
│   ├── logger.service.js            # Serviço de logging
│   ├── nf.service.js                # Serviço de notas fiscais
│   ├── ouroNegro.service.js         # Serviço Ouro Negro
│   ├── precoValidation.service.js   # Validação de preços
│   ├── princesa.service.js          # Serviço Princesa
│   ├── rotas.service.js             # Serviço de rotas
│   ├── session.service.js           # Serviço de autenticação
│   ├── transportadoras.service.js   # Serviço de transportadoras
│   └── user.service.js              # Serviço de usuários
├── test/                            # Testes
│   ├── controllers/                 # Testes de controllers
│   ├── helpers/                     # Helpers de teste
│   ├── middleware/                  # Testes de middlewares
│   ├── services/                    # Testes de serviços
│   ├── utils/                       # Testes de utilitários
│   └── setup.js                     # Configuração de testes
├── utils/                           # Utilitários
│   ├── error.handler.js             # Tratamento de erros
│   ├── logger.utils.js              # Utilitários de logging
│   └── startup.handler.js           # Handlers de inicialização
├── scripts/                         # Scripts auxiliares
│   └── importTranspCSV.js           # Importação de CSV de transportadoras
├── app.js                           # Arquivo principal da aplicação
├── sync-db.js                       # Script de sincronização do banco
├── create-user.js                   # Script de criação de usuário
├── update-admin.js                  # Script de atualização de admin
├── jest.config.js                   # Configuração do Jest
├── package.json                     # Dependências e scripts
└── README.md                        # Documentação
```

## Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL (banco de dados principal)
- MySQL (opcional, para integrações externas)
- NPM ou Yarn

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/arthurvieira2003/hub-logistica-backend.git
cd hub-logistica-backend
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de Dados
DB_NAME=nome_do_banco
DB_USER=usuario_do_banco
DB_PASSWORD=senha_do_banco
DB_HOST=localhost
DB_DIALECT=postgres
DB_PORT=5432

# JWT
JWT_SECRET=sua_chave_secreta_jwt

# Porta do Servidor
PORT=4010

# URLs de Integração (exemplos)
OURO_NEGRO_URL=url_da_api_ouro_negro
ALFA_URL=url_da_api_alfa
PRINCESA_URL=url_da_api_princesa

# Configurações de Logging (opcional)
LOKI_HOST=localhost
LOKI_PORT=3100
```

4. Sincronize o banco de dados:

```bash
npm run sync-db
```

Para forçar a recriação das tabelas (cuidado: apaga dados existentes):

```bash
npm run sync-db:force
```

## Como Executar

### Modo Desenvolvimento

Para executar o servidor em modo desenvolvimento com reinicialização automática:

```bash
npm run dev
```

O servidor será iniciado e estará disponível em `http://localhost:4010`

### Modo Produção

Para executar o servidor em modo produção:

```bash
npm start
```

### Executar Testes

Para executar todos os testes:

```bash
npm test
```

Para executar os testes em modo watch:

```bash
npm run test:watch
```

Para executar apenas testes unitários:

```bash
npm run test:unit
```

## Scripts Disponíveis

- `npm start` - Inicia o servidor em modo produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento com nodemon
- `npm test` - Executa todos os testes com cobertura
- `npm run test:watch` - Executa os testes em modo watch
- `npm run test:unit` - Executa apenas testes unitários
- `npm run sync-db` - Sincroniza o banco de dados
- `npm run sync-db:force` - Força a recriação das tabelas

## Endpoints da API

### Autenticação

- `POST /session` - Login e geração de token JWT
  - Body: `{ "email": "string", "password": "string" }`
  - Retorna: Token JWT e dados do usuário

### Usuários

- `POST /user` - Criar novo usuário (requer autenticação)
- `GET /user/:id` - Obter dados de um usuário específico (requer autenticação)
- `GET /user` - Listar todos os usuários (requer autenticação)
- `PUT /user/password` - Atualizar senha do usuário (requer autenticação)
- `PUT /user/status` - Alterar status do usuário (requer autenticação)
- `PUT /user/picture` - Atualizar foto do usuário (requer autenticação)
- `GET /user/picture/:email` - Obter foto do usuário

### Transportadoras e Rastreamento

- `GET /ouroNegro` - Obter dados de rastreamento da Ouro Negro
- `GET /alfa` - Obter dados de rastreamento da Alfa
- `GET /princesa` - Obter dados de rastreamento da Princesa
- `GET /generic` - Serviço genérico de rastreamento
- `GET /cte` - Consultar Conhecimento de Transporte Eletrônico

### Estados e Cidades

- `GET /estados` - Listar todos os estados
- `GET /estados/:id` - Obter estado por ID
- `POST /estados` - Criar novo estado (requer autenticação)
- `PUT /estados/:id` - Atualizar estado (requer autenticação)
- `DELETE /estados/:id` - Deletar estado (requer autenticação)

- `GET /cidades` - Listar todas as cidades
- `GET /cidades/:id` - Obter cidade por ID
- `POST /cidades` - Criar nova cidade (requer autenticação)
- `PUT /cidades/:id` - Atualizar cidade (requer autenticação)
- `DELETE /cidades/:id` - Deletar cidade (requer autenticação)

### Transportadoras

- `GET /transportadoras` - Listar todas as transportadoras
- `GET /transportadoras/:id` - Obter transportadora por ID
- `POST /transportadoras` - Criar nova transportadora (requer autenticação)
- `PUT /transportadoras/:id` - Atualizar transportadora (requer autenticação)
- `DELETE /transportadoras/:id` - Deletar transportadora (requer autenticação)

### Faixas de Peso

- `GET /faixas-peso` - Listar todas as faixas de peso
- `GET /faixas-peso/:id` - Obter faixa de peso por ID
- `POST /faixas-peso` - Criar nova faixa de peso (requer autenticação)
- `PUT /faixas-peso/:id` - Atualizar faixa de peso (requer autenticação)
- `DELETE /faixas-peso/:id` - Deletar faixa de peso (requer autenticação)

### Rotas

- `GET /rotas` - Listar todas as rotas
- `GET /rotas/:id` - Obter rota por ID
- `POST /rotas` - Criar nova rota (requer autenticação)
- `PUT /rotas/:id` - Atualizar rota (requer autenticação)
- `DELETE /rotas/:id` - Deletar rota (requer autenticação)

### Preços de Faixas

- `GET /precos-faixas` - Listar todos os preços de faixas
- `GET /precos-faixas/:id` - Obter preço de faixa por ID
- `POST /precos-faixas` - Criar novo preço de faixa (requer autenticação)
- `PUT /precos-faixas/:id` - Atualizar preço de faixa (requer autenticação)
- `DELETE /precos-faixas/:id` - Deletar preço de faixa (requer autenticação)

## Autenticação

A API utiliza JWT (JSON Web Token) para autenticação. Para acessar endpoints protegidos:

1. Obtenha um token através do endpoint `POST /session` com email e senha
2. Inclua o token no header das requisições:

```
Authorization: Bearer {seu_token}
```

O token expira após um período determinado (configurável via JWT_SECRET e configurações do token).

## Scripts Auxiliares

### Criar Usuário

Para criar um novo usuário via linha de comando:

```bash
node create-user.js
```

### Atualizar Admin

Para atualizar permissões de administrador:

```bash
node update-admin.js
```

### Importar Transportadoras CSV

Para importar transportadoras de um arquivo CSV:

```bash
node scripts/importTranspCSV.js
```

## Logging

O sistema utiliza Winston para logging com as seguintes funcionalidades:

- Logs estruturados em JSON
- Integração com Loki (opcional)
- Middleware de logging HTTP com request ID
- Níveis de log: error, warn, info, debug
- Logs de requisições e respostas HTTP

## Tratamento de Erros

O sistema possui tratamento global de erros:

- Handler centralizado de erros
- Respostas padronizadas de erro
- Logging automático de erros
- Códigos de status HTTP apropriados

## Testes

O projeto possui uma suíte de testes abrangente:

- Testes unitários de serviços
- Testes de integração de controllers
- Testes de middlewares
- Cobertura de código configurada

Para executar os testes com cobertura:

```bash
npm test
```

Os relatórios de cobertura são gerados em `coverage/`.

## Desenvolvedor

- [Arthur Henrique Tscha Vieira](https://github.com/arthurvieira2003)
