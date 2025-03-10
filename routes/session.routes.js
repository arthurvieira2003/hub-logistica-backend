const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/session.controller");

router.get("/validate", sessionController.validateToken);

module.exports = router;
