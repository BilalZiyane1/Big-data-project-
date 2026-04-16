const express = require("express");
const { ingestClientLogs } = require("../controllers/logController");

const router = express.Router();

router.post("/client", ingestClientLogs);

module.exports = router;
