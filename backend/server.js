// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { authMiddleware } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const memoryRoutes = require("./routes/memoryRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Public auth routes
app.use("/api/auth", authRoutes);

// Protected memory routes
app.use("/api/memories", authMiddleware, memoryRoutes);

app.use("/api", require("./routes/parseMemoryRoute"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) {
    res.status(res.statusCode !== 200 ? res.statusCode : 500).json({
      error: err.message || "Server error"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

// console.log("authRoutes =", authRoutes);
// console.log("memoryRoutes =", memoryRoutes);
