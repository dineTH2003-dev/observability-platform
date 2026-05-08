const pool = require("../config/db"); // adjust path if needed

exports.createTicket = async (req, res) => {
  try {
    const { title, purpose, context, priority } = req.body;

    const countResult = await pool.query("SELECT COUNT(*) FROM tickets");
    const count = parseInt(countResult.rows[0].count, 10);

    const ticketId = `TKT-${1000 + count + 1}`;

    const result = await pool.query(
      `INSERT INTO tickets (ticket_id, title, purpose, context, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ticketId, title, purpose, context, priority]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating ticket" });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `SELECT * FROM tickets WHERE 1=1`;
    const values = [];
    let i = 1;

    if (search) {
      query += ` AND (ticket_id ILIKE $${i} OR title ILIKE $${i})`;
      values.push(`%${search}%`);
      i++;
    }

    if (status && status.toLowerCase() !== "all") {
      query += ` AND lower(status) = lower($${i})`;
      values.push(status);
      i++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tickets" });
  }
};