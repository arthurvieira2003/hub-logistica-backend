const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post("/create", userController.createUser);
router.post("/update-password", userController.updatePassword);
router.post("/change-status", userController.changeStatus);
router.get("/user/:id", userController.getUser);
router.get("/users", userController.getAllUsers);
router.post("/authenticate", userController.authenticateUser);
router.post("/update-picture", userController.updateUserPicture);
router.get("/get-picture/:email", userController.getUserPicture);
router.post("/update-admin-status", userController.updateAdminStatus);
router.post("/update-name-and-email", userController.updateUserNameAndEmail);

module.exports = router;
