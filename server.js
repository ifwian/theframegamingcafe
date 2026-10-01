// FRAME Gaming Cafe - server.js
// Flow: Browser (fetch) -> Express route -> MySQL -> JSON back to the browser

require("dotenv").config();            // reads the .env file
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());                        // allows the browser to call our API
app.use(express.json());                // lets us read JSON sent by fetch()
app.use(express.static("public"));      // serves the HTML, CSS and JS files

// ---------- MySQL connection ----------
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "frame_gaming_cafe",
  dateStrings: true                     // keep DATE and TIME as plain text
});

// The SELECT used by GET /reservations and GET /reservations/:id
// It joins the 3 tables so we get names instead of only ids.
const SELECT_RESERVATIONS = `
  SELECT r.reservation_id, r.customer_id, r.station_id,
         r.reservation_date, r.start_time, r.duration,
         r.number_of_players, r.payment_method, r.status,
         c.name, c.contact_number, c.email,
         s.station_name, s.station_type, s.price_per_hour
  FROM reservations r
  JOIN customers c ON r.customer_id = c.customer_id
  JOIN stations  s ON r.station_id  = s.station_id
`;

// ---------- Helpers ----------

// Checks the fields sent by the browser. Returns an error message or "".
function checkReservation(data) {
  if (!data.name || data.name.trim() === "") return "Name is required.";
  if (!data.contact_number || data.contact_number.trim() === "") return "Contact number is required.";
  if (!data.email || !data.email.includes("@")) return "A valid email is required.";
  if (!data.station_id) return "Please choose a station.";
  if (!data.reservation_date) return "Please choose a date.";
  if (!data.start_time) return "Please choose a start time.";
  if (!data.duration || Number(data.duration) < 1) return "Please choose a duration.";
  if (!data.number_of_players || Number(data.number_of_players) < 1) return "Players must be at least 1.";
  if (!data.payment_method) return "Please choose a payment method.";
  return "";
}

// Is this station already booked at the same date and start time?
// "ignoreId" lets an edit skip the reservation being edited.
// Cancelled reservations do not block the slot.
async function isDoubleBooked(station_id, date, time, ignoreId) {
  const sql = `
    SELECT reservation_id FROM reservations
    WHERE station_id = ? AND reservation_date = ? AND start_time = ?
      AND status <> 'Cancelled' AND reservation_id <> ?
  `;
  const [rows] = await db.query(sql, [station_id, date, time, ignoreId || 0]);
  return rows.length > 0;
}

const BOOKED_MESSAGE = "THIS STATION IS ALREADY RESERVED FOR THIS DATE AND TIME.";

// ---------- Routes ----------

// GET /stations - all stations
app.get("/stations", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM stations ORDER BY station_id");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load stations." });
  }
});

// GET /reservations - READ all
app.get("/reservations", async (req, res) => {
  try {
    const [rows] = await db.query(SELECT_RESERVATIONS + " ORDER BY r.reservation_id DESC");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load reservations." });
  }
});

// GET /reservations/:id - READ one
app.get("/reservations/:id", async (req, res) => {
  try {
    const [rows] = await db.query(SELECT_RESERVATIONS + " WHERE r.reservation_id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found." });
    }
    res.json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load the reservation." });
  }
});

// POST /reservations - CREATE
app.post("/reservations", async (req, res) => {
  const data = req.body;

  const problem = checkReservation(data);
  if (problem !== "") {
    return res.status(400).json({ error: problem });
  }

  try {
    if (await isDoubleBooked(data.station_id, data.reservation_date, data.start_time, 0)) {
      return res.status(409).json({ error: BOOKED_MESSAGE });
    }

    // Step 1: save the customer
    const [customerResult] = await db.query(
      "INSERT INTO customers (name, contact_number, email) VALUES (?, ?, ?)",
      [data.name.trim(), data.contact_number.trim(), data.email.trim()]
    );
    const customerId = customerResult.insertId;

    // Step 2: save the reservation
    const [reservationResult] = await db.query(
      `INSERT INTO reservations
       (customer_id, station_id, reservation_date, start_time, duration,
        number_of_players, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [customerId, data.station_id, data.reservation_date, data.start_time,
       data.duration, data.number_of_players, data.payment_method]
    );

    // Send back the new reservation (the id comes from MySQL)
    const [rows] = await db.query(
      SELECT_RESERVATIONS + " WHERE r.reservation_id = ?",
      [reservationResult.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not save the reservation." });
  }
});

// PUT /reservations/:id - UPDATE
app.put("/reservations/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const problem = checkReservation(data);
  if (problem !== "") {
    return res.status(400).json({ error: problem });
  }
  const allowedStatus = ["Pending", "Confirmed", "Cancelled", "Completed"];
  if (!allowedStatus.includes(data.status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  try {
    // Find the reservation so we know which customer to update
    const [found] = await db.query("SELECT customer_id FROM reservations WHERE reservation_id = ?", [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: "Reservation not found." });
    }
    const customerId = found[0].customer_id;

    // A cancelled reservation does not block a slot, so only check others
    if (data.status !== "Cancelled" &&
        await isDoubleBooked(data.station_id, data.reservation_date, data.start_time, id)) {
      return res.status(409).json({ error: BOOKED_MESSAGE });
    }

    await db.query(
      "UPDATE customers SET name = ?, contact_number = ?, email = ? WHERE customer_id = ?",
      [data.name.trim(), data.contact_number.trim(), data.email.trim(), customerId]
    );

    await db.query(
      `UPDATE reservations
       SET station_id = ?, reservation_date = ?, start_time = ?, duration = ?,
           number_of_players = ?, payment_method = ?, status = ?
       WHERE reservation_id = ?`,
      [data.station_id, data.reservation_date, data.start_time, data.duration,
       data.number_of_players, data.payment_method, data.status, id]
    );

    const [rows] = await db.query(SELECT_RESERVATIONS + " WHERE r.reservation_id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not update the reservation." });
  }
});

// DELETE /reservations/:id - DELETE
app.delete("/reservations/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const [found] = await db.query("SELECT customer_id FROM reservations WHERE reservation_id = ?", [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: "Reservation not found." });
    }
    const customerId = found[0].customer_id;

    await db.query("DELETE FROM reservations WHERE reservation_id = ?", [id]);

    // Remove the customer too if they have no other reservations
    await db.query(
      `DELETE FROM customers WHERE customer_id = ?
       AND NOT EXISTS (SELECT 1 FROM reservations WHERE customer_id = ?)`,
      [customerId, customerId]
    );

    res.json({ message: "Reservation deleted." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not delete the reservation." });
  }
});

// ---------- Start ----------
app.listen(PORT, async () => {
  console.log("FRAME server running at http://localhost:" + PORT);
  try {
    await db.query("SELECT 1");
    console.log("MySQL connected.");
  } catch (err) {
    console.log("MySQL connection FAILED: " + err.message);
    console.log("Check your .env file and that database.sql was executed.");
  }
});
