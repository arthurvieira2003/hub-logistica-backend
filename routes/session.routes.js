const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/session.controller");

router.get("/validate", sessionController.validateToken);
router.get("/active", sessionController.getActiveSessions);
router.get("/user/:userId", sessionController.getUserSessions);
router.post("/logout", sessionController.logoutSession);
router.delete("/:id/terminate", sessionController.terminateSession);

module.exports = router;
