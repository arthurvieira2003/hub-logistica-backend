const express = require("express");
const ctesController = require("../controllers/cte.controller");

const router = express.Router();

router.get("/", ctesController.getCTEs);
router.get("/:serial/xml", ctesController.downloadXML);
router.get("/:serial/pdf", ctesController.downloadPDF);
router.get("/:serial/validar-preco", ctesController.validarPrecoCTE);
router.get("/:serial", ctesController.getCTEBySerial);

module.exports = router;
