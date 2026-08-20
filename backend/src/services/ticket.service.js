const TicketModel = require("../models/ticket.model");
const ApiError = require("../utils/apiError");
const notificationService = require('./notification.service');

exports.createTicket = async ({ title, purpose, context, priority, requester_id }) => {
  if (!purpose) throw new ApiError(400, "Purpose is required");
  const finalTitle = title || context || purpose || "Ticket";
  const count = await TicketModel.count();
  const ticketId = `TKT-${1000 + count + 1}`;
  const ticket = await TicketModel.insert({
    ticket_id: ticketId,
    title: finalTitle,
    purpose,
    context: context || "",
    priority: priority || "medium",
    requester_id,
  });

  // Fire notification without blocking
  notificationService.notifyTicketCreated(ticket).catch((err) => {
    console.error('Failed to send ticket creation notification:', err);
  });

  return ticket;
};

exports.getTickets = async ({ search, status, priority, purpose }) => {
  return await TicketModel.find({ search, status, priority, purpose });
};
