# FRAME Gaming Café

**RESERVE. PLAY. REPEAT.**

A reservation system for a fictional gaming café. Customers reserve a gaming station; an admin page lets staff view, edit and delete reservations. Built for a Web Design subject to demonstrate **CREATE → READ → UPDATE → DELETE**.

## 1. Features

- Landing page: home, about, stations, games, pricing, contact, reserve
- Stations and prices are loaded from MySQL (not typed twice)
- Reservation form with validation and a confirmation screen (the ID comes from MySQL)
- Admin page: live counts, table, search, status filter, edit form, delete with confirmation
- Double-booking protection (same station + same date + same start time)
- Responsive (desktop, tablet, mobile), black-and-white design system (see `DESIGN.md`)

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
│   ├── admin.html          admin page
│   ├── css/style.css       all styles
│   ├── js/main.js          landing page + mobile menu
│   ├── js/reservation.js   form validation + CREATE
│   ├── js/admin.js         READ, UPDATE, DELETE, search, filter, counts
│   └── assets/images/
├── server.js               Express server + API routes
├── database.sql            creates the database and tables
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
```

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
| Admin | http://localhost:3000/admin.html |

## 8. API routes

| Method | Route | What it does |
|---|---|---|
| GET | `/stations` | List all stations |
| GET | `/reservations` | List all reservations |
| GET | `/reservations/:id` | Get one reservation |
| POST | `/reservations` | Create a reservation |
| PUT | `/reservations/:id` | Update a reservation |
| DELETE | `/reservations/:id` | Delete a reservation |

## 9. CRUD explained

| Letter | Where | Flow |
|---|---|---|
| **C**reate | `reservation.html` | form → `fetch(POST)` → Express → `INSERT` into `customers` and `reservations` |
| **R**ead | `admin.html` | `fetch(GET)` → Express → `SELECT` (joined) → JSON → HTML table |
| **U**pdate | admin → EDIT | form → `fetch(PUT)` → Express → `UPDATE` → table refreshes |
| **D**elete | admin → DELETE | confirm → `fetch(DELETE)` → Express → `DELETE` → table refreshes |

Double booking: before saving, `server.js` runs a `SELECT` for the same station + date + start time (ignoring cancelled reservations). If one exists, it answers with status 409 and the message is shown to the user.

## 10. Testing checklist

1. Open `/reservation.html`, press the button with an empty form → error messages appear.
2. Fill the form and submit → confirmation with a reservation number.
3. Check MySQL Workbench: `SELECT * FROM reservations;` shows the new row.
4. Submit the same station + date + time again → "THIS STATION IS ALREADY RESERVED…".
5. Open `/admin.html` → the reservation is in the table; counts match.
6. Click **EDIT**, change the status to Confirmed, save → counts and MySQL change.
7. Try search (name, ID, station) and the status filters.
8. Click **DELETE**, confirm → row disappears and is gone from MySQL.
9. Resize the browser to phone width.

## 11. GitHub

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
- **Stations do not load**: open the site through `http://localhost:3000`, not by double-clicking the HTML files.

> Café name, address, phone and email are sample content for a school project.
