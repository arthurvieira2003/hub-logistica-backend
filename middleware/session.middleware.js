const jwt = require("jsonwebtoken");
const sessionService = require("../services/session.service");

// Middleware para garantir que a sessão seja carregada antes de qualquer operação
const ensureSessionLoaded = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token de autenticação não fornecido",
      });
    }

    // Validar token
    const userData = sessionService.validateToken(token);

    // Atualizar atividade da sessão
    await sessionService.updateSessionActivity(token);

    // Adicionar dados do usuário ao request
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

// Middleware para aguardar carregamento completo da sessão
const waitForSession = (req, res, next) => {
  // Verificar se os dados essenciais estão presentes
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
