const express = require("express");
const router = express.Router();

const { createTicket, getTickets } = require("../controllers/ticket.controller");

router.post("/", createTicket);
router.get("/", getTickets);

module.exports = router;