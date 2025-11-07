const express = require("express");
const router = express.Router();
const cidadesController = require("../controllers/cidades.controller");

router.get("/", cidadesController.getAllCidades);
router.get("/buscar-ibge", cidadesController.buscarCodigoIBGE);
router.get("/:id/count-related", cidadesController.countRelatedRecords);
router.get("/:id", cidadesController.getCidadeById);
router.post("/", cidadesController.createCidade);
router.put("/:id", cidadesController.updateCidade);
router.delete("/:id", cidadesController.deleteCidade);

module.exports = router;

