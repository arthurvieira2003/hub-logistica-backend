const sequelize = require("./config/database.config");
const Tracking = require("./models/tracking.model");

// Importar outros modelos, se necessário
// const User = require("./models/user.model");
// const Session = require("./models/session.model");

async function syncDatabase() {
  try {
    // Testar conexão
    await sequelize.authenticate();

    // Sincronizar todos os modelos
    // Usar {force: true} apenas em ambiente de desenvolvimento/teste para recriar tabelas
    // Em produção, usar {alter: true} para fazer alterações seguras
    const forceSync = process.argv.includes("--force");

    if (forceSync) {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: true });
    }

    process.exit(0);
  } catch (error) {
    console.error("Erro ao sincronizar o banco de dados:", error);
    process.exit(1);
  }
}

syncDatabase();
