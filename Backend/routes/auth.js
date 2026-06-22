const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

const router = express.Router();

router.post("/signup", (req, res) => {

    const { name, email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: err.message });
            }

            if (result.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);

            db.query(
                "INSERT INTO users(name,email,password) VALUES(?,?,?)",
                [name, email, hashedPassword],
                (err, result) => {

                    if (err) {
                        return res.status(500).json({ message: err.message });
                    }

                    res.status(201).json({
                        message: "User Registered Successfully",
                        user: {
                            id: result.insertId,
                            name,
                            email
                        }
                    });
                }
            );
        }
    );
});

router.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: err.message });
            }

            if (result.length === 0) {
                return res.status(400).json({ message: "No account found. Please sign up." });
            }

            const user = result[0];
            const passwordMatches = bcrypt.compareSync(password, user.password);

            if (!passwordMatches) {
                return res.status(400).json({ message: "Incorrect password." });
            }

            res.status(200).json({
                message: "Login successful",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    );
});

module.exports = router;