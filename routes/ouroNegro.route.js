const express = require("express");
const router = express.Router();
const ouroNegroController = require("../controllers/ouroNegro.controller");

router.get("/track", ouroNegroController.getDadosOuroNegro);
router.get("/track/:data", ouroNegroController.getDadosOuroNegroPorData);

module.exports = router;
