const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET all rules
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM alerts ORDER BY id DESC");
  res.json(result.rows);
});

// CREATE rule
router.post("/", async (req, res) => {
  const r = req.body;

  const result = await db.query(
    `INSERT INTO alerts 
    (id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      `rule-${Date.now()}`,
      r.name,
      r.condition,
      r.severity,
      r.duration,
      r.enabled,
      r.recipients,
      r.scope,
      r.cooldown,
      r.sendOnce,
      r.threshold,
    ]
  );

  res.json(result.rows[0]);
});

// TOGGLE rule
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const result = await db.query(
    "UPDATE alerts SET enabled=$1 WHERE id=$2 RETURNING *",
    [enabled, id]
  );

  res.json(result.rows[0]);
});

// DELETE rule
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  await db.query("DELETE FROM alerts WHERE id=$1", [id]);

  res.json({ message: "Deleted" });
});

module.exports = router;