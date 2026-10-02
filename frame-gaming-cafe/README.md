# FRAME Gaming Café

**RESERVE. PLAY. REPEAT.**

A reservation system for a fictional gaming café. Customers reserve a gaming station; an admin page lets staff view, edit and delete reservations. Built for a Web Design subject to demonstrate **CREATE → READ → UPDATE → DELETE**.

## 1. Features

- Landing page: home, about, stations, games, pricing, contact, reserve
- Stations and prices are loaded from MySQL (not typed twice)
- Reservation form with validation and a confirmation screen (the ID comes from MySQL)
- Separate, protected admin area (`/admin`) with login, roles (admin / staff), session timeout and an audit log
- Admin dashboard: sidebar navigation, summary cards, tables with search + pagination, edit form, delete with confirmation
- Double-booking protection (same station + same date + same start time)
- Responsive (desktop, tablet, mobile), soft dark, eye-friendly design system (see `DESIGN.md`)

## 2. Technologies

HTML5, CSS3, vanilla JavaScript, Node.js, Express.js, MySQL (MySQL Workbench), VS Code.

The idea in one picture:

```text
HTML  ->  JavaScript  ->  fetch()  ->  Express.js  ->  MySQL
```

### npm packages (and why)

| Package | Used for |
|---|---|
| `express` | The web server and the API routes |
| `mysql2` | Talking to MySQL from Node.js |
| `cors` | Allows the browser to call the API |
| `dotenv` | Reads the database password from the `.env` file |

## 3. Folder structure

```text
frame-gaming-cafe/
├── public/
│   ├── index.html          landing page
│   ├── reservation.html    reservation form
│   ├── css/style.css       all styles (public + admin)
│   ├── js/main.js          landing page + mobile menu
│   ├── js/reservation.js   form validation + CREATE
│   └── assets/images/      put hero.jpg here
├── private/                NOT public: only sent after login
│   ├── login.html          admin sign-in page
│   ├── admin.html          admin dashboard
│   └── admin.js            dashboard logic (READ, UPDATE, DELETE, search, pages)
├── server.js               Express server, API routes, login, roles, audit log
├── database.sql            creates the database and ALL tables (fresh start)
├── database-update.sql     adds only the new tables (keeps your data)
├── package.json
├── .env.example            copy to .env
├── .gitignore
├── DESIGN.md
└── README.md
```

## 4. Database setup

1. Open **MySQL Workbench** and connect to your local server.
2. Choose **File → Open SQL Script…** and select `database.sql`.
3. Click the **lightning bolt** (Execute).
4. In the left panel, click refresh. You should see the `frame_gaming_cafe` database with `customers`, `stations` and `reservations`.

Relationship: a customer can have many reservations, and a station can appear in many reservations.

```text
customers (customer_id) ──┐
                          ├──> reservations
stations  (station_id)  ──┘
```

> Running `database.sql` again deletes and recreates the tables (all reservations are erased).

**Already ran the first version?** Run `database-update.sql` instead. It only adds the `users` and `audit_logs` tables and keeps your reservations.

## 5. Installation

Install **Node.js** (LTS) from https://nodejs.org and **MySQL Community Server + Workbench** from https://dev.mysql.com/downloads/. Then:

```bash
cd frame-gaming-cafe
npm install
```

## 6. `.env` setup

Copy `.env.example` to a new file named `.env` and write your own MySQL password:

```text
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=frame_gaming_cafe
ADMIN_PASSWORD=choose-a-strong-password
STAFF_PASSWORD=choose-another-password
SESSION_TIMEOUT_MINUTES=15
```

`ADMIN_PASSWORD` and `STAFF_PASSWORD` are used **once**, the first time the server starts, to create the `admin` and `staff` accounts. If you leave them out, demo passwords are used (`Admin@123`, `Staff@123`), so set your own.

The `.env` file is ignored by Git, so your password is never uploaded.

## 7. Running locally

```bash
npm start
```

You should see `FRAME server running at http://localhost:3000` and `MySQL connected.`

| Page | URL |
|---|---|
| Landing page | http://localhost:3000/ |
| Reservation form | http://localhost:3000/reservation.html |
| Admin sign-in | http://localhost:3000/admin |

## 8. API routes

| Method | Route | What it does |
|---|---|---|
| GET | `/stations` | List all stations (public) |
| POST | `/reservations` | Create a reservation (public, customers use it) |
| GET | `/reservations` | List all reservations (admin, staff) |
| GET | `/reservations/:id` | Get one reservation (admin, staff) |
| PUT | `/reservations/:id` | Update a reservation (admin, staff) |
| DELETE | `/reservations/:id` | Delete a reservation (**admin only**) |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Who am I + time left in the session |
| POST | `/api/auth/ping` | "Stay signed in" |
| GET | `/api/stats` | Dashboard card numbers (admin, staff) |
| GET | `/api/users` | List users (**admin only**) |
| GET | `/api/audit-logs` | Latest 500 log entries (**admin only**) |

## 9. CRUD explained

| Letter | Where | Flow |
|---|---|---|
| **C**reate | `reservation.html` | form → `fetch(POST)` → Express → `INSERT` into `customers` and `reservations` |
| **R**ead | Admin → Reservations | `fetch(GET)` → Express → `SELECT` (joined) → JSON → HTML table |
| **U**pdate | admin → EDIT | form → `fetch(PUT)` → Express → `UPDATE` → table refreshes |
| **D**elete | admin → DELETE | confirm → `fetch(DELETE)` → Express → `DELETE` → table refreshes |

Double booking: before saving, `server.js` runs a `SELECT` for the same station + date + start time (ignoring cancelled reservations). If one exists, it answers with status 409 and the message is shown to the user.

## 10. Admin area and security

The admin area is **not** part of the public folder. `server.js` only sends it after checking the session and the role.

| What | How it works |
|---|---|
| Separate page | `/admin/login` (sign in) and `/admin` (dashboard). They live in `private/`. Visitors who are not signed in are redirected to the login page. |
| Passwords | Hashed with `scrypt` from Node's built-in `crypto` module. Plain passwords are never stored. |
| Sessions | After login the server creates a random token and sends it in an `HttpOnly`, `SameSite=Strict` cookie. Sessions are kept in memory, so restarting the server signs everyone out. |
| Session timeout | Idle for `SESSION_TIMEOUT_MINUTES` (default 15) = signed out. The sidebar shows a countdown, and a "STAY SIGNED IN" button appears in the last minute. |
| Roles (RBAC) | Checked on the server for every request, not only by hiding buttons. |
| Brute-force | 5 wrong passwords for the same username and IP = locked for 5 minutes. |
| Audit log | `audit_logs` table. Records logins, failed logins, logouts, timeouts, denied access and every reservation create / update / delete. Admins read it in **Audit Log**. |

| Role | Reservations (view, edit) | Reservations (delete) | Users | Audit log |
|---|---|---|---|---|
| admin | yes | yes | yes | yes |
| staff | yes | no | no | no |

Good to know for your presentation:
- This is *basic* security for a school project. For a real website you would also use HTTPS (then add the `Secure` cookie flag), a persistent session store, and CSRF tokens.
- Customers never log in. The reservation form stays public.

## 11. Testing checklist

1. Open `/reservation.html`, press the button with an empty form → error messages appear.
2. Fill the form and submit → confirmation with a reservation number.
3. Check MySQL Workbench: `SELECT * FROM reservations;` shows the new row.
4. Submit the same station + date + time again → "THIS STATION IS ALREADY RESERVED…".
5. Open `/admin` without signing in → you are sent to the login page.
6. Sign in as `admin` → the reservation is in the table; counts match.
7. Click **EDIT**, change the status to Confirmed, save → counts and MySQL change.
8. Try search (name, ID, station), the status filters and the page buttons.
9. Click **DELETE**, confirm → row disappears and is gone from MySQL.
10. Open **Audit Log** → your actions are listed.
11. Sign out, sign in as `staff` → no DELETE buttons, no Users / Audit Log. 
12. Set `SESSION_TIMEOUT_MINUTES=1`, restart, sign in and wait → you are signed out.
13. Resize the browser to phone width.

## 12. Hero image

The landing page shows an **image placeholder**. To use a real photo, save it as `public/assets/images/hero.jpg` (4:3 works best). It replaces the placeholder automatically and is shown in muted grayscale. (Until then the browser console may show a harmless 404 for `hero.jpg`.)

## 13. GitHub

```bash
git init
git add .
git commit -m "FRAME Gaming Cafe"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/frame-gaming-cafe.git
git push -u origin main
```

Before pushing, check that `.env` does not appear in `git status` (it should be ignored).

## Troubleshooting

- **`MySQL connection FAILED`**: check `DB_PASSWORD` in `.env`, make sure MySQL is running, and that `database.sql` was executed.
- **`ER_NOT_SUPPORTED_AUTH_MODE` / auth error on MySQL 8**: run in Workbench: `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YOUR_PASSWORD';` then `FLUSH PRIVILEGES;`
- **Port already in use**: change `PORT` in `.env`.
- **`Could not set up the admin accounts` / login fails**: the `users` table is missing. Run `database-update.sql` (or `database.sql`) in Workbench and restart.
- **Locked out of `admin`**: wait 5 minutes, or restart the server.
- **Forgot the admin password**: in Workbench run `DELETE FROM users;`, then restart the server. New accounts are created from `.env`.
- **Stations do not load**: open the site through `http://localhost:3000`, not by double-clicking the HTML files.

> Café name, address, phone and email are sample content for a school project.
