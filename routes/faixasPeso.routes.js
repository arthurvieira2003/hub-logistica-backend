const express = require("express");
const router = express.Router();
const faixasPesoController = require("../controllers/faixasPeso.controller");

router.get("/", faixasPesoController.getAllFaixasPeso);
router.get("/:id/count-related", faixasPesoController.countRelatedRecords);
router.get("/:id", faixasPesoController.getFaixaPesoById);
router.post("/", faixasPesoController.createFaixaPeso);
router.put("/:id", faixasPesoController.updateFaixaPeso);
router.delete("/:id", faixasPesoController.deleteFaixaPeso);

module.exports = router;

