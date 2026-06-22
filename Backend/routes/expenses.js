const express = require("express");
const db = require("../config/db");

const router = express.Router();

// CREATE a new expense/income entry
router.post("/", (req, res) => {

    const { user_id, type, category, amount, note, expense_date } = req.body;

    if (!user_id || !type || !amount || !expense_date) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    db.query(
        "INSERT INTO expenses(user_id, type, category, amount, note, expense_date) VALUES(?,?,?,?,?,?)",
        [user_id, type, category, amount, note, expense_date],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: err.message });
            }

            res.status(201).json({
                message: "Entry saved",
                id: result.insertId
            });
        }
    );
});

// GET all entries for a specific user
router.get("/:userId", (req, res) => {

    const { userId } = req.params;

    db.query(
        "SELECT * FROM expenses WHERE user_id = ? ORDER BY expense_date DESC",
        [userId],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: err.message });
            }

            res.status(200).json(result);
        }
    );
});

// DELETE an entry
router.delete("/:id", (req, res) => {

    const { id } = req.params;

    db.query(
        "DELETE FROM expenses WHERE id = ?",
        [id],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: err.message });
            }

            res.status(200).json({ message: "Entry deleted" });
        }
    );
});

module.exports = router;