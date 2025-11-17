const sessionService = require("../services/session.service");

const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await sessionService.validateToken(token);

    await sessionService.updateSessionActivity(token);

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getActiveSessions = async (req, res) => {
  try {
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

const terminateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await sessionService.terminateSession(id);

    res.status(200).json({
      message: "Sessão terminada com sucesso",
      session: {
        id: session.id,
        userId: session.userId,
        terminatedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateToken,
  getActiveSessions,
  getUserSessions,
  logoutSession,
  terminateSession,
};
