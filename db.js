require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "splitwise_calculator",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,     // DATE columns come back as "2026-10-09", not JS Dates
  decimalNumbers: true,  // DECIMAL columns come back as numbers, not strings
});

// Promise API: lets us use async/await and transactions
const db = pool.promise();

db.query("SELECT 1")
  .then(() => console.log("MySQL database connected successfully!"))
  .catch((err) => console.log("Database connection failed:", err.message));

module.exports = db;
