const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const sessionService = require("./session.service");
const axios = require("axios");

const createUser = async (email, password) => {
  try {
    const userSesuite = await getUserSesuite();

    const user = userSesuite.find((user) => user.dsuseremail === email);

    if (!user) {
      throw new Error("Usuário não encontrado ou desativado");
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: user.nmuser,
      email: user.dsuseremail,
      password: encryptedPassword,
    });
    return newUser;
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    throw error;
  }
};

const getUser = async (id) => {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    throw error;
  }
};

const updatePassword = async (email, password) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    user.password = password;
    await user.save();
    return user;
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    throw error;
  }
};

const changeStatus = async (email, status) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    user.status = status;
    await user.save();
    return user;
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    throw error;
  }
};

const getUserSesuite = async () => {
  try {
    const dataset = process.env.SESUITE_DATASET;

    const url = `https://se.copapel.com.br/apigateway/v1/dataset-integration/${dataset}`;

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    throw error;
  }
};

const getAllUsers = async () => {
  try {
    const users = await User.findAll();
    return users;
  } catch (error) {
    console.error("Erro ao buscar todos os usuários:", error);
    throw error;
  }
};

const authenticateUser = async (email, password, req) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Senha inválida");
    }

    const token = sessionService.generateToken(user);

    // Criar uma sessão para o usuário
    await sessionService.createSession(user.id, token, req);

    return token;
  } catch (error) {
    console.error("Erro ao autenticar usuário:", error);
    throw error;
  }
};

const updateUserPicture = async (email, image) => {
  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    user.profile_picture = image;
    await user.save();
    return user;
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    throw error;
  }
};

const getUserPicture = async (email) => {
  try {
    const user = await User.findOne({ where: { email: email } });
    return user.profile_picture;
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    throw error;
  }
};

const updateAdminStatus = async (email, isAdmin) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    user.isAdmin = isAdmin;
    await user.save();
    return user;
  } catch (error) {
    console.error("Erro ao atualizar status de administrador:", error);
    throw error;
  }
};

const updateUserNameAndEmail = async (email, name) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    user.email = email;
    user.name = name;
    await user.save();
    return user;
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUser,
  updatePassword,
  changeStatus,
  getAllUsers,
  authenticateUser,
  updateUserPicture,
  getUserPicture,
  updateAdminStatus,
  updateUserNameAndEmail,
};
