const express = require("express");
const router = express.Router();
const precosFaixasController = require("../controllers/precosFaixas.controller");

router.get("/", precosFaixasController.getAllPrecosFaixas);
router.get("/:id", precosFaixasController.getPrecoFaixaById);
router.post("/", precosFaixasController.createPrecoFaixa);
router.put("/:id", precosFaixasController.updatePrecoFaixa);
router.delete("/:id", precosFaixasController.deletePrecoFaixa);

module.exports = router;

