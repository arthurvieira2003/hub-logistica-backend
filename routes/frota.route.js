const express = require("express");
const router = express.Router();
const frotaController = require("../controllers/frota.controller");

router.get("/", frotaController.getFrota);
router.get("/manutencoes", frotaController.getManutencoes);

module.exports = router;
