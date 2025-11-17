const User = require("./models/user.model");
const sequelize = require("./config/database.config");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function makeUserAdmin(email) {
  try {
    await sequelize.authenticate();

    await sequelize.sync({ force: false });

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`Usuário com email ${email} não encontrado.`);
      return null;
    }

    user.isAdmin = true;
    await user.save();

    return user;
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error.message);
    throw error;
  } finally {
    rl.close();
    setTimeout(() => process.exit(0), 1000);
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
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

main();
