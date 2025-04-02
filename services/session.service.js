const jwt = require("jsonwebtoken");

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

module.exports = {
  generateToken,
  getUserFromToken,
  validateToken,
};
