const express = require("express");
const ctesController = require("../controllers/cte.controller");

const router = express.Router();

router.get("/", ctesController.getCTEs);
router.get("/:serial/xml", ctesController.downloadXML);
router.get("/:serial/pdf", ctesController.downloadPDF);

module.exports = router;
