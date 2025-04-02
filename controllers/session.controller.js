const sessionService = require("../services/session.service");

const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await sessionService.validateToken(token);

    // Atualizar a atividade da sessão
    await sessionService.updateSessionActivity(token);

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    // Limpar sessões expiradas antes de listar as ativas
    await sessionService.cleanupExpiredSessions();

    const sessions = await sessionService.getActiveSessions();
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await sessionService.getUserSessions(userId);
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logoutSession = async (req, res) => {
  try {
    const token = req.headers.authorization;
    await sessionService.deactivateSession(token);
    res.status(200).json({ message: "Sessão encerrada com sucesso" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateToken,
  getActiveSessions,
  getUserSessions,
  logoutSession,
};
