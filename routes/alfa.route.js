const express = require("express");
const router = express.Router();
const alfaController = require("../controllers/alfa.controller");

router.get("/track/:data", alfaController.getDadosAlfa);

module.exports = router;
