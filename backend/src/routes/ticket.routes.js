const express = require("express");
const router = express.Router();

const { createTicket, getTickets, deleteTicket } = require("../controllers/ticket.controller");

router.post("/", createTicket);
router.get("/", getTickets);
router.delete("/:ticketId", deleteTicket);

module.exports = router;