const bcrypt = require("bcryptjs");
const User = require("./models/user.model");
const sequelize = require("./config/database.config");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createUser(name, email, password) {
  try {
    await sequelize.authenticate();

    await sequelize.sync({ force: false });

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: encryptedPassword,
      status: "active",
    });

    return newUser;
  } catch (error) {
    console.error("Erro ao criar usuário:", error.message);
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

main();
