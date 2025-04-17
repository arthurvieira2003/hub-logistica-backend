const sequelize = require("./config/database.config");
const Tracking = require("./models/tracking.model");

// Importar outros modelos, se necessário
// const User = require("./models/user.model");
// const Session = require("./models/session.model");

async function syncDatabase() {
  try {
    // Testar conexão
    await sequelize.authenticate();
    console.log("Conexão com o banco de dados estabelecida com sucesso.");

    // Sincronizar todos os modelos
    // Usar {force: true} apenas em ambiente de desenvolvimento/teste para recriar tabelas
    // Em produção, usar {alter: true} para fazer alterações seguras
    const forceSync = process.argv.includes("--force");

    if (forceSync) {
      console.log("Recriando todas as tabelas (--force)");
      await sequelize.sync({ force: true });
    } else {
      console.log("Atualizando esquema do banco de dados (alteração segura)");
      await sequelize.sync({ alter: true });
    }

    console.log("Banco de dados sincronizado com sucesso!");

    process.exit(0);
  } catch (error) {
    console.error("Erro ao sincronizar o banco de dados:", error);
    process.exit(1);
  }
}

syncDatabase();
