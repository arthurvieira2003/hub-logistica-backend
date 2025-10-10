const express = require("express");
const router = express.Router();
const genericController = require("../controllers/generic.controller");

router.get("/track/:data", genericController.getDadosGeneric);

module.exports = router;
