const ticketService = require("../services/ticket.service");
const ApiError = require("../utils/apiError");

exports.createTicket = async (req, res) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Error creating ticket" });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const tickets = await ticketService.getTickets(req.query);
    res.json(tickets);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Error fetching tickets" });
  }
};