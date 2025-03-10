const sessionService = require("../services/session.service");

const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = await sessionService.validateToken(token);
    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

module.exports = { validateToken };
