const express = require("express");
const router = express.Router();
const princesaController = require("../controllers/princesa.controller");

router.get("/track", princesaController.getDadosPrincesa);
router.get("/track/:data", princesaController.getDadosPrincesaPorData);

module.exports = router;
