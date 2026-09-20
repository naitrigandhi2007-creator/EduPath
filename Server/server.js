const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const profileRoutes = require("./routes/profileRoutes");

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.use("/api/profiles", profileRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌", error.message);
  });

app.get("/", (req, res) => {
  res.json({
    message: "EduPath backend is running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});