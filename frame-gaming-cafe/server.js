// FRAME Gaming Cafe - server.js
// Public side : Browser (fetch) -> Express route -> MySQL -> JSON
// Admin side  : login -> session cookie -> role check -> page / API
//
// No login libraries are used. Passwords are hashed with Node's built-in
// "crypto" module and sessions are kept in memory (a Map).

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Idle time before an admin is logged out (minutes can be a decimal, e.g. 0.5)
const SESSION_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES) || 15;
const SESSION_MS = SESSION_MINUTES * 60 * 1000;
const SESSION_COOKIE = "frame_session";
const startedAt = Date.now();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// Small safety headers on every response
app.use(function (req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// The public website (landing page, reservation page, css, js)
app.use(express.static(path.join(__dirname, "public")));

// ---------- MySQL connection ----------
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "frame_gaming_cafe",
  dateStrings: true                     // keep DATE and TIME as plain text
});

// =====================================================================
//  SECURITY: passwords, sessions, roles, audit log
// =====================================================================

// ----- Passwords: "salt:hash" using scrypt (built into Node) -----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function checkPassword(password, stored) {
  const parts = stored.split(":");
  const hash = crypto.scryptSync(password, parts[0], 64);
  const storedHash = Buffer.from(parts[1], "hex");
  return crypto.timingSafeEqual(hash, storedHash);
}

// ----- Audit log: writes one row for every important action -----
// "user" is { user_id, username } or null (for a public customer).
async function audit(user, action, details, req) {
  try {
    await db.query(
      "INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
      [user ? user.user_id : null,
       user ? user.username : (action === "RESERVATION_CREATED" ? "customer" : "anonymous"),
       action,
       String(details).substring(0, 255),
       req ? req.ip : null]
    );
  } catch (err) {
    console.log("Audit log failed: " + err.message);   // never crash because of logging
  }
}

// ----- Sessions: token -> { user_id, username, role, lastActive } -----
const sessions = new Map();

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const pieces = header.split(";");
  for (let i = 0; i < pieces.length; i++) {
    const pair = pieces[i].trim().split("=");
    if (pair[0] === name) {
      return pair[1];
    }
  }
  return null;
}

function setSessionCookie(res, token, clear) {
  // HttpOnly = JavaScript in the page cannot read it. SameSite=Strict = other sites cannot use it.
  // No fixed lifetime: it lasts until the browser closes, and the SERVER ends the
  // session after the idle timeout (so an active admin is never cut off early).
  let cookie = SESSION_COOKIE + "=" + token + "; HttpOnly; SameSite=Strict; Path=/";
  if (clear) {
    cookie += "; Max-Age=0";
  }
  res.setHeader("Set-Cookie", cookie);
}

function expireSession(token, req) {
  const s = sessions.get(token);
  if (s) {
    sessions.delete(token);
    audit(s, "SESSION_TIMEOUT", "Signed out after " + SESSION_MINUTES + " idle minutes", req);
  }
}

// Runs on every request: finds the logged-in user from the cookie.
function loadSession(req, res, next) {
  req.user = null;
  req.sessionExpired = false;

  const token = getCookie(req, SESSION_COOKIE);
  const session = token ? sessions.get(token) : null;

  if (session) {
    if (Date.now() - session.lastActive > SESSION_MS) {
      expireSession(token, req);
      setSessionCookie(res, "", true);
      req.sessionExpired = true;
    } else {
      // Any request counts as activity, except the countdown check itself
      if (req.path !== "/api/auth/me") {
        session.lastActive = Date.now();
      }
      req.user = session;
      req.token = token;
    }
  }
  next();
}
app.use(loadSession);

// Remove sessions nobody came back to (checked every 30 seconds)
setInterval(function () {
  sessions.forEach(function (session, token) {
    if (Date.now() - session.lastActive > SESSION_MS) {
      expireSession(token, null);
    }
  });
}, 30000);

// ----- Role-based access control (RBAC) -----
//   admin : everything (view, edit, delete, users, audit log)
//   staff : view and edit reservations only
function requireRole() {
  const allowed = Array.from(arguments);
  return function (req, res, next) {
    if (!req.user) {
      const message = req.sessionExpired ? "Your session expired. Please sign in again." : "Please sign in.";
      return res.status(401).json({ error: message });
    }
    if (!allowed.includes(req.user.role)) {
      audit(req.user, "ACCESS_DENIED", req.method + " " + req.originalUrl, req);
      return res.status(403).json({ error: "Your role (" + req.user.role + ") cannot do this." });
    }
    next();
  };
}

const anyStaff = requireRole("admin", "staff");
const adminOnly = requireRole("admin");

// ----- Login attempts: 5 wrong passwords = locked for 5 minutes -----
const failedLogins = new Map();   // "ip|username" -> { count, lockedUntil }
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

// ----- Create the first accounts when the users table is empty -----
async function createFirstUsers() {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM users");
  if (rows[0].total > 0) {
    return;
  }
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const staffPassword = process.env.STAFF_PASSWORD || "Staff@123";
  await db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
    ["admin", hashPassword(adminPassword)]);
  await db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'staff')",
    ["staff", hashPassword(staffPassword)]);
  console.log("First accounts created: 'admin' and 'staff' (passwords come from your .env file).");
}

// =====================================================================
//  ADMIN PAGES (kept in the "private" folder, NOT in "public")
// =====================================================================

function sendPrivate(res, fileName) {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "private", fileName));
}

// Login page (anyone can open it)
app.get("/admin/login", function (req, res) {
  if (req.user) {
    return res.redirect("/admin");
  }
  sendPrivate(res, "login.html");
});

// Admin dashboard: checks the session AND the role before sending anything
app.get("/admin", function (req, res) {
  if (!req.user) {
    return res.redirect(req.sessionExpired ? "/admin/login?expired=1" : "/admin/login");
  }
  if (req.user.role !== "admin" && req.user.role !== "staff") {
    audit(req.user, "ACCESS_DENIED", "GET /admin", req);
    return res.status(403).send("403 - You do not have access to this page.");
  }
  sendPrivate(res, "admin.html");
});

// The dashboard script is also protected, so it is never sent to visitors
app.get("/admin/app.js", anyStaff, function (req, res) {
  sendPrivate(res, "admin.js");
});

// Old address from the first version
app.get("/admin.html", function (req, res) {
  res.redirect("/admin");
});

// =====================================================================
//  AUTH API
// =====================================================================

// POST /api/auth/login
app.post("/api/auth/login", async function (req, res) {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const key = req.ip + "|" + username;

  if (username === "" || password === "") {
    return res.status(400).json({ error: "Enter your username and password." });
  }

  const record = failedLogins.get(key);
  if (record && record.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: "Too many wrong attempts. Try again in " + minutes + " minute(s)." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];

    if (!user || !checkPassword(password, user.password_hash)) {
      const fails = (record ? record.count : 0) + 1;
      failedLogins.set(key, { count: fails, lockedUntil: fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
      audit(null, "LOGIN_FAILED", "Failed login for '" + username.substring(0, 50) + "'", req);
      return res.status(401).json({ error: "Wrong username or password." });
    }

    failedLogins.delete(key);
    await db.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [user.user_id]);

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      lastActive: Date.now()
    });
    setSessionCookie(res, token, false);

    audit(user, "LOGIN_SUCCESS", "Signed in as " + user.role, req);
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed. Did you run database-update.sql?" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", function (req, res) {
  if (req.user) {
    audit(req.user, "LOGOUT", "Signed out", req);
    sessions.delete(req.token);
  }
  setSessionCookie(res, "", true);
  res.json({ message: "Signed out." });
});

// GET /api/auth/me - who am I, and how long until timeout? (does not extend the session)
app.get("/api/auth/me", anyStaff, function (req, res) {
  const left = SESSION_MS - (Date.now() - req.user.lastActive);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    username: req.user.username,
    role: req.user.role,
    expiresInSeconds: Math.max(0, Math.floor(left / 1000)),
    timeoutSeconds: Math.floor(SESSION_MS / 1000)
  });
});

// POST /api/auth/ping - "stay signed in" button (the middleware extends the session)
app.post("/api/auth/ping", anyStaff, function (req, res) {
  res.json({ expiresInSeconds: Math.floor(SESSION_MS / 1000) });
});

// =====================================================================
//  ADMIN DATA API
// =====================================================================

// GET /api/stats - numbers for the dashboard cards
app.get("/api/stats", anyStaff, async function (req, res) {
  let dbOnline = true;
  let totalUsers = 0;
  try {
    const [rows] = await db.query("SELECT COUNT(*) AS total FROM users");
    totalUsers = rows[0].total;
  } catch (err) {
    dbOnline = false;
  }
  res.json({
    total_users: totalUsers,
    database: dbOnline ? "Online" : "Error",
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    active_sessions: sessions.size
  });
});

// GET /api/users - admin only
app.get("/api/users", adminOnly, async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT user_id, username, role, created_at, last_login FROM users ORDER BY user_id");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load users." });
  }
});

// GET /api/audit-logs - admin only (latest 500)
app.get("/api/audit-logs", adminOnly, async function (req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 500");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load the audit log." });
  }
});

// =====================================================================
//  RESERVATIONS + STATIONS
// =====================================================================

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

// GET /stations - public
app.get("/stations", async function (req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM stations ORDER BY station_id");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load stations." });
  }
});

// GET /reservations - READ all (admin + staff only)
app.get("/reservations", anyStaff, async function (req, res) {
  try {
    const [rows] = await db.query(SELECT_RESERVATIONS + " ORDER BY r.reservation_id DESC");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not load reservations." });
  }
});

// GET /reservations/:id - READ one (admin + staff only)
app.get("/reservations/:id", anyStaff, async function (req, res) {
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

// POST /reservations - CREATE (public: customers use this)
app.post("/reservations", async function (req, res) {
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

    audit(null, "RESERVATION_CREATED",
      "Reservation #" + reservationResult.insertId + " (" + rows[0].station_name + ") created online", req);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not save the reservation." });
  }
});

// PUT /reservations/:id - UPDATE (admin + staff)
app.put("/reservations/:id", anyStaff, async function (req, res) {
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
    audit(req.user, "RESERVATION_UPDATED",
      "Reservation #" + id + " updated (status: " + data.status + ")", req);
    res.json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not update the reservation." });
  }
});

// DELETE /reservations/:id - DELETE (admin only)
app.delete("/reservations/:id", adminOnly, async function (req, res) {
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

    audit(req.user, "RESERVATION_DELETED", "Reservation #" + id + " deleted", req);
    res.json({ message: "Reservation deleted." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not delete the reservation." });
  }
});

// ---------- Start ----------
app.listen(PORT, async function () {
  console.log("FRAME server running at http://localhost:" + PORT);
  console.log("Admin login:          http://localhost:" + PORT + "/admin");
  try {
    await db.query("SELECT 1");
    console.log("MySQL connected.");
  } catch (err) {
    console.log("MySQL connection FAILED: " + err.message);
    console.log("Check your .env file and that database.sql was executed.");
    return;
  }
  try {
    await createFirstUsers();
  } catch (err) {
    console.log("Could not set up the admin accounts: " + err.message);
    console.log("Run database-update.sql (or database.sql) in MySQL Workbench, then restart.");
  }
});
