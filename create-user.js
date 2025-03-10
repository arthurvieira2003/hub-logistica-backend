const bcrypt = require("bcrypt");
const User = require("./models/user.model");
const sequelize = require("./config/database.config");
const readline = require("readline");

// Criar interface de leitura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Função para criar um usuário
async function createUser(name, email, password) {
  try {
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log("Conexão com o banco de dados estabelecida com sucesso.");

    // Sincronizar o modelo (garantir que a tabela exista)
    await sequelize.sync({ force: false });

    // Criptografar a senha
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Criar o usuário
    const newUser = await User.create({
      name,
      email,
      password: encryptedPassword,
      status: "active",
    });

    console.log("\nUsuário criado com sucesso:");
    console.log({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      status: newUser.status,
      createdAt: newUser.createdAt,
    });

    return newUser;
  } catch (error) {
    console.error("Erro ao criar usuário:", error.message);
    throw error;
  } finally {
    rl.close();
    // Fechar a conexão com o banco de dados após um pequeno delay
    setTimeout(() => process.exit(0), 1000);
  }
}

// Função para perguntar interativamente
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Função principal
async function main() {
  console.log("=== Criação de Usuário ===");

  try {
    const name = await askQuestion("Nome: ");
    const email = await askQuestion("Email: ");
    const password = await askQuestion("Senha: ");

    if (!name || !email || !password) {
      console.error("Todos os campos são obrigatórios!");
      rl.close();
      return;
    }

    await createUser(name, email, password);
  } catch (error) {
    console.error("Falha ao criar usuário:", error);
    rl.close();
    process.exit(1);
  }
}

// Iniciar o programa
main();
