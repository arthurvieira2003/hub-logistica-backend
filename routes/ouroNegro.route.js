const express = require("express");
const router = express.Router();
const ouroNegroController = require("../controllers/ouroNegro.controller");

router.get("/track", ouroNegroController.getDadosOuroNegro);

module.exports = router;
