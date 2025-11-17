const jwt = require("jsonwebtoken");
const Session = require("../models/session.model");
const User = require("../models/user.model");
const { Op } = require("sequelize");

require("dotenv").config();

const generateToken = (user) => {
  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    profile_picture: user.profile_picture,
    isAdmin: user.isAdmin,
  };

  return jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

const getUserFromToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded;
};

const validateToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Token inválido ou expirado");
  }
};

const createSession = async (userId, token, req) => {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newSession = await Session.create({
      userId,
      token,
      expiresAt,
      lastActivity: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      isActive: true,
    });

    return newSession;
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    throw error;
  }
};

const updateSessionActivity = async (token) => {
  try {
    const session = await Session.findOne({ where: { token } });
    if (session) {
      session.lastActivity = new Date();
      await session.save();
    }
    return session;
  } catch (error) {
    console.error("Erro ao atualizar atividade da sessão:", error);
    throw error;
  }
};

const deactivateSession = async (token) => {
  try {
    const session = await Session.findOne({ where: { token } });
    if (session) {
      session.isActive = false;
      await session.save();
    }
    return session;
  } catch (error) {
    console.error("Erro ao desativar sessão:", error);
    throw error;
  }
};

const getActiveSessions = async () => {
  try {
    const sessions = await Session.findAll({
      where: {
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "profile_picture"],
        },
      ],
      order: [["lastActivity", "DESC"]],
    });
    return sessions;
  } catch (error) {
    console.error("Erro ao buscar sessões ativas:", error);
    throw error;
  }
};

const getUserSessions = async (userId) => {
  try {
    const sessions = await Session.findAll({
      where: {
        userId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["lastActivity", "DESC"]],
    });
    return sessions;
  } catch (error) {
    console.error("Erro ao buscar sessões do usuário:", error);
    throw error;
  }
};

const terminateSession = async (sessionId) => {
  try {
    const session = await Session.findByPk(sessionId);

    if (!session) {
      throw new Error("Sessão não encontrada");
    }

    if (!session.isActive) {
      throw new Error("Sessão já está inativa");
    }

    session.isActive = false;
    await session.save();

    return session;
  } catch (error) {
    console.error("Erro ao terminar sessão:", error);
    throw error;
  }
};

const cleanupExpiredSessions = async () => {
  try {
    await Session.update(
      { isActive: false },
      {
        where: {
          expiresAt: { [Op.lt]: new Date() },
          isActive: true,
        },
      }
    );
  } catch (error) {
    console.error("Erro ao limpar sessões expiradas:", error);
    throw error;
  }
};

module.exports = {
  generateToken,
  getUserFromToken,
  validateToken,
  createSession,
  updateSessionActivity,
  deactivateSession,
  getActiveSessions,
  getUserSessions,
  terminateSession,
  cleanupExpiredSessions,
};
