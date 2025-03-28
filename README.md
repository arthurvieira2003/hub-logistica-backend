# Hub Logística Backend

Sistema de backend para gerenciamento de logística que integra diferentes transportadoras e serviços.

## 📋 Descrição do Projeto

Este projeto é uma API RESTful desenvolvida em Node.js com Express que oferece serviços de rastreamento de entregas, gerenciamento de usuários e integração com múltiplos serviços de logística como Ouro Negro e Alfa.

### Funcionalidades Principais

- **Autenticação de Usuários**: Sistema completo de cadastro, login e gerenciamento de usuários
- **Integração com Transportadoras**: API conecta com os seguintes sistemas:
  - Ouro Negro: Rastreamento de entregas
  - Alfa: Informações de logística
- **Gerenciamento de Notas Fiscais**: Consulta e rastreamento de notas fiscais

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript
- **Express**: Framework web para Node.js
- **Sequelize**: ORM para banco de dados
- **PostgreSQL**: Banco de dados relacional
- **JWT**: Autenticação baseada em tokens
- **Bcrypt**: Criptografia de senhas
- **Axios**: Cliente HTTP para requisições externas
- **Nodemon**: Reinicialização automática do servidor durante desenvolvimento

## 🗂️ Estrutura do Projeto

```
hub-logistica-backend/
├── config/                 # Configurações de banco de dados e CORS
├── controllers/            # Controladores da aplicação
├── models/                 # Modelos de dados (Sequelize)
├── routes/                 # Rotas da API
├── services/               # Camada de serviços e lógica de negócios
├── app.js                  # Arquivo principal da aplicação
├── .env                    # Variáveis de ambiente (não versionado)
├── .gitignore              # Configuração de arquivos ignorados pelo Git
├── package.json            # Dependências e scripts
└── README.md               # Documentação do projeto
```

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL
- NPM ou Yarn

### Configuração do Banco de Dados

1. Instale o PostgreSQL em sua máquina ou use um serviço de nuvem
2. Crie um banco de dados para a aplicação

### Configuração do Projeto

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
   - Renomeie o arquivo `.env.example` para `.env` (se existir) ou crie um novo com as seguintes variáveis:

```
DB_NAME=nome_do_banco
DB_USER=usuario_do_banco
DB_PASSWORD=senha_do_banco
DB_HOST=localhost
DB_DIALECT=postgres
OURO_NEGRO_URL=url_da_api_ouro_negro
JWT_SECRET=sua_chave_secreta
```

4. Inicie o servidor:

```bash
npm run test
```

O servidor estará rodando em `http://localhost:4010`

## 📡 Endpoints da API

### Usuários

- `POST /user` - Criar novo usuário
- `GET /user/:id` - Obter dados de um usuário
- `GET /user` - Listar todos os usuários
- `PUT /user/password` - Atualizar senha
- `PUT /user/status` - Alterar status do usuário
- `PUT /user/picture` - Atualizar foto do usuário
- `GET /user/picture/:email` - Obter foto do usuário

### Autenticação

- `POST /session` - Login e geração de token JWT

### Transportadoras

- `GET /ouroNegro` - Obter dados de rastreamento da Ouro Negro
- `GET /alfa` - Obter dados de rastreamento da Alfa

## 🔒 Autenticação

A API utiliza JWT (JSON Web Token) para autenticação. Para acessar endpoints protegidos:

1. Obtenha um token através do endpoint `/session`
2. Inclua o token no header das requisições:

```
Authorization: Bearer {seu_token}
```

## 🧪 Testes

Para executar os testes (se implementados):

```bash
npm test
```

## 👨‍💻 Desenvolvedor

- [Arthur Henrique Tscha Vieira](https://github.com/arthurvieira2003)
