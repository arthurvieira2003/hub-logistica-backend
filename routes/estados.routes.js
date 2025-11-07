const express = require("express");
const router = express.Router();
const estadosController = require("../controllers/estados.controller");

router.get("/", estadosController.getAllEstados);
router.get("/:id/count-related", estadosController.countRelatedRecords);
router.get("/:id", estadosController.getEstadoById);
router.post("/", estadosController.createEstado);
router.put("/:id", estadosController.updateEstado);
router.delete("/:id", estadosController.deleteEstado);

module.exports = router;

