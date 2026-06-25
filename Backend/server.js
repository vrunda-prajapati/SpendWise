const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const goalsRoutes = require("./routes/goals");  
const expensesRoutes = require("./routes/expenses");   // ← add this

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);               
app.use("/api/expenses", expensesRoutes);   

app.get("/", (req, res) => {
  res.send("Backend Working");
});

app.listen(3002, () => {
    console.log("Server Running");
});