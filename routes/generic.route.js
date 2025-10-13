const express = require("express");
const router = express.Router();
const genericController = require("../controllers/generic.controller");
const {
  ensureSessionLoaded,
  waitForSession,
} = require("../middleware/session.middleware");

router.get(
  "/track/:data",
  ensureSessionLoaded,
  waitForSession,
  genericController.getDadosGeneric
);

module.exports = router;
