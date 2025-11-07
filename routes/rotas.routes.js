const express = require("express");
const router = express.Router();
const rotasController = require("../controllers/rotas.controller");

router.get("/", rotasController.getAllRotas);
router.get("/:id/count-related", rotasController.countRelatedRecords);
router.get("/:id", rotasController.getRotaById);
router.post("/", rotasController.createRota);
router.put("/:id", rotasController.updateRota);
router.delete("/:id", rotasController.deleteRota);

module.exports = router;

