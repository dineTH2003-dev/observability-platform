const TicketModel = require("../models/ticket.model");
const ApiError = require("../utils/apiError");

const notificationService = require('./notification.service');

exports.createTicket = async ({ title, purpose, context, priority, requester_id }) => {
  if (!title) throw new ApiError(400, "Title is required");
  const count = await TicketModel.count();
  const ticketId = `TKT-${1000 + count + 1}`;
  const ticket = await TicketModel.insert({
    ticket_id: ticketId,
    title,
    purpose,
    context,
    priority,
    requester_id,
  });

  // Fire notification without blocking
  notificationService.notifyTicketCreated(ticket).catch((err) => {
    console.error('Failed to send ticket creation notification:', err);
  });

  return ticket;
};

exports.getTickets = async ({ search, status }) => {
  return await TicketModel.find({ search, status });
};
