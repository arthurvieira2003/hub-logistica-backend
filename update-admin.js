const User = require("./models/user.model");
const sequelize = require("./config/database.config");
const readline = require("readline");

// Criar interface de leitura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Função para atualizar um usuário como administrador
async function makeUserAdmin(email) {
  try {
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log("Conexão com o banco de dados estabelecida com sucesso.");

    // Sincronizar o modelo (garantir que a tabela esteja atualizada)
    await sequelize.sync({ force: false });

    // Buscar o usuário
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`Usuário com email ${email} não encontrado.`);
      return null;
    }

    // Atualizar para administrador
    user.isAdmin = true;
    await user.save();

    console.log("\nUsuário atualizado como administrador com sucesso:");
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      updatedAt: user.updatedAt,
    });

    return user;
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error.message);
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
  console.log("=== Definir Usuário como Administrador ===");

  try {
    const email = await askQuestion("Email do usuário: ");

    if (!email) {
      console.error("O email é obrigatório!");
      rl.close();
      return;
    }

    await makeUserAdmin(email);
  } catch (error) {
    console.error("Falha ao atualizar usuário:", error);
    rl.close();
    process.exit(1);
  }
}

// Iniciar o programa
main();
