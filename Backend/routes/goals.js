// Backend/routes/goals.js
const express = require("express");
const db      = require("../config/db");
const router  = express.Router();

// ── POST /api/goals ─────────────────────────────────────────────────────────
// Create a new savings goal
router.post("/", (req, res) => {
    const { user_id, goal_name, target_amount, target_date } = req.body;

    if (!user_id || !goal_name || !target_amount || !target_date) {
        return res.status(400).json({ message: "All fields are required" });
    }

    db.query(
        "INSERT INTO goals (user_id, goal_name, target_amount, target_date) VALUES (?, ?, ?, ?)",
        [user_id, goal_name, target_amount, target_date],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.status(201).json({
                message: "Goal created successfully",
                id: result.insertId
            });
        }
    );
});

// ── GET /api/goals/:userId ───────────────────────────────────────────────────
// Get all goals for a specific user
router.get("/:userId", (req, res) => {
    const { userId } = req.params;

    db.query(
        "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ message: err.message });
            res.status(200).json(results);
        }
    );
});

// ── PUT /api/goals/:id/add-savings ──────────────────────────────────────────
// Add savings amount to a goal (increases saved_amount)
router.put("/:id/add-savings", (req, res) => {
    const { id }     = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Enter a valid amount" });
    }

    // Fetch current goal first so we can compute the new total
    db.query("SELECT * FROM goals WHERE id = ?", [id], (err, result) => {
        if (err)             return res.status(500).json({ message: err.message });
        if (!result.length)  return res.status(404).json({ message: "Goal not found" });

        const goal     = result[0];
        const newSaved = parseFloat(goal.saved_amount) + parseFloat(amount);

        db.query(
            "UPDATE goals SET saved_amount = ? WHERE id = ?",
            [newSaved, id],
            (err) => {
                if (err) return res.status(500).json({ message: err.message });
                res.status(200).json({
                    message:      "Savings added successfully",
                    saved_amount: newSaved,
                    achieved:     newSaved >= parseFloat(goal.target_amount)
                });
            }
        );
    });
});

// ── DELETE /api/goals/:id ────────────────────────────────────────────────────
// Delete a savings goal permanently
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM goals WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.status(200).json({ message: "Goal deleted successfully" });
    });
});

module.exports = router;