const express = require("express");
const router = express.Router();
const ouroNegroController = require("../controllers/ouroNegro.controller");

router.post("/track", ouroNegroController.getDadosOuroNegro);

module.exports = router;
