const express = require("express");
const ctesController = require("../controllers/cte.controller");

const router = express.Router();

router.get("/", ctesController.getCTEs);
// Rotas específicas devem vir antes da rota genérica :serial
router.get("/:serial/xml", ctesController.downloadXML);
router.get("/:serial/pdf", ctesController.downloadPDF);
router.get("/:serial", ctesController.getCTEBySerial);

module.exports = router;
