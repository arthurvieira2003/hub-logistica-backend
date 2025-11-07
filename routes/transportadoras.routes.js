const express = require("express");
const router = express.Router();
const transportadorasController = require("../controllers/transportadoras.controller");

router.get("/", transportadorasController.getAllTransportadoras);
router.get("/:id/count-related", transportadorasController.countRelatedRecords);
router.get("/:id", transportadorasController.getTransportadoraById);
router.post("/", transportadorasController.createTransportadora);
router.put("/:id", transportadorasController.updateTransportadora);
router.delete("/:id", transportadorasController.deleteTransportadora);

module.exports = router;

