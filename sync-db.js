const sequelize = require("./config/database.config");

async function syncDatabase() {
  try {
    await sequelize.authenticate();

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
