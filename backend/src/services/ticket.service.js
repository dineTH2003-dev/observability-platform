const TicketModel = require("../models/ticket.model");
const ApiError = require("../utils/apiError");

exports.createTicket = async ({ title, purpose, context, priority }) => {
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
  });
  return ticket;
};

exports.getTickets = async ({ search, status, priority, purpose }) => {
  return await TicketModel.find({ search, status, priority, purpose });
};
