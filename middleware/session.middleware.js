const sessionService = require("../services/session.service");

const ensureSessionLoaded = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token de autenticação não fornecido",
      });
    }

    const userData = sessionService.validateToken(token);

    await sessionService.updateSessionActivity(token);

    req.user = userData;

    next();
  } catch (error) {
    console.error("Erro na validação da sessão:", error);
    return res.status(401).json({
      status: "error",
      message: "Sessão inválida ou expirada",
    });
  }
};

const waitForSession = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      status: "error",
      message: "Dados da sessão não carregados completamente",
    });
  }

  next();
};

module.exports = {
  ensureSessionLoaded,
  waitForSession,
};
