# FRAME Gaming Cafe

**RESERVE. PLAY. REPEAT.**

A reservation system for a fictional gaming cafe. Customers book a gaming station;
the admin page lets staff view, edit and delete bookings.

Pure **HTML + CSS + vanilla JavaScript**. No build step, no dependencies,
no server. It is a static site, so it can be deployed for free on Vercel,
GitHub Pages or Netlify.

Built to demonstrate **CREATE / READ / UPDATE / DELETE**.

---

## 1. Quick start

You do not need to install anything.

**Option A — open it directly**

```text
double-click index.html
```

**Option B — serve it locally** (recommended, matches how Vercel serves it)

```bash
npx serve .
# or
python -m http.server 8000
```

Then open <http://localhost:8000>.

> Use a local server rather than double-clicking. `file://` can behave oddly in
> some browsers, and a local server matches the production environment.

---

## 2. Folder structure

```text
frame-gaming-cafe/
|-- index.html            Landing page (home, stations, games, pricing, contact)
|-- reservation.html      Booking form  -> CREATE
|-- admin.html            Admin table   -> READ / UPDATE / DELETE
|-- vercel.json           Deployment + security header config
|-- .gitignore
|-- README.md             This file
|-- DESIGN.md             Design system notes
|
|-- css/
|   `-- style.css         All styles (single stylesheet)
|
|-- js/
|   |-- data.js           Reference data: the station list
|   |-- store.js          The "database" -> all CRUD lives here
|   |-- main.js           Landing page + mobile menu
|   |-- reservation.js    Form validation + CREATE
|   `-- admin.js          READ, UPDATE, DELETE, search, filter, counts
|
`-- assets/
    `-- images/           Images and icons
```

Load order matters: `data.js` defines the seed data, `store.js` consumes it,
then the page script runs. Every page includes them in that order.

---

## 3. How the CRUD works now

The original version used Node.js, Express and MySQL. That version cannot run
on a static host, so the database was replaced with a **client-side data store
built on LocalStorage**.

The entire backend now lives in **one file: `js/store.js`**. The page scripts
never talk to a server — they call the store directly and synchronously.

```text
HTML  ->  JavaScript  ->  Store.create()  ->  localStorage
```

### The store API

`js/store.js` exposes a global `Store` object. Each method returns the same JSON
shape the old API returned, so the pages read records identically.

| Method | Does | Replaces |
|---|---|---|
| `Store.stations()` | List stations | `GET /stations` |
| `Store.list()` | List all reservations, newest first | `GET /reservations` |
| `Store.get(id)` | Get one reservation | `GET /reservations/:id` |
| `Store.create(data)` | Create a reservation | `POST /reservations` |
| `Store.update(id, data)` | Update a reservation | `PUT /reservations/:id` |
| `Store.remove(id)` | Delete a reservation | `DELETE /reservations/:id` |
| `Store.isDoubleBooked(...)` | Check a slot | internal `isDoubleBooked()` |
| `Store.reset()` | Restore the demo data | (new, useful for demos) |

### CRUD mapping

| Letter | Page | Call | What is stored |
|---|---|---|---|
| **C**reate | `reservation.html` | `Store.create(data)` | Appends a record, assigns the next ID |
| **R**ead | `admin.html` | `Store.list()` | Loads all records into the table |
| **U**pdate | `admin.html` EDIT | `Store.update(id, data)` | Replaces the record, same ID |
| **D**elete | `admin.html` DELETE | `Store.remove(id)` | Removes the record |

### Business rules kept from the backend

These did not get dropped in the port. They are enforced in `js/store.js`:

- **Field validation** — name, contact, email, station, date, start time,
  duration, players and payment method are all required (returns status `400`).
- **Double-booking protection** — the same station cannot be booked twice for
  the same date and start time (returns status `409`).
- **Cancelled rows free their slot** — a cancelled booking is ignored by the
  conflict check.
- **Status whitelist** — only `Pending`, `Confirmed`, `Cancelled`, `Completed`.
- **Station JOIN** — `store.js` attaches `station_name`, `station_type` and
  `price_per_hour` to each record, which is what the old SQL `JOIN` did. Names
  are stored once, not typed twice.
- **Type coercion** — the form gives strings, so `duration` and
  `number_of_players` are converted to numbers and `start_time` is padded to
  `HH:MM:SS`, exactly as MySQL returned them.

Errors are thrown as `Error` objects carrying `.status` (`400`, `404`, `409`),
so the pages read `error.message` just as they used to read `result.error`.

### LocalStorage keys

| Key | Contents |
|---|---|
| `frame.stations` | Station list (reference data) |
| `frame.reservations` | All bookings |
| `frame.nextReservationId` | Next ID to hand out |
| `frame.initialised` | Set once, prevents re-seeding |

To wipe everything and start clean, run this in the browser console:

```js
localStorage.clear();
```

Or call `Store.reset()` to put the three demo bookings back.

---

## 4. Important limitations

Please state these honestly in your write-up. They are inherent to a
browser-only design, not bugs.

1. **Data is per-browser.** Bookings are saved in the visitor's own browser. A
   booking made in Chrome is not visible in Firefox or on another computer.
   There is no shared database.
2. **Data is not permanent.** Clearing cookies, browsing data or site data
   deletes every booking. Always export or screenshot anything important.
3. **No real security.** `admin.html` is a normal public page — anyone can open
   it and delete records. Hiding a page in JavaScript is *not* access control,
   because the browser still has to download the page and the code. Genuine
   authentication needs a real backend.
4. **Not suitable for production.** A real cafe would need a server and database.

---

## 5. Deploying to Vercel

1. Push the project to GitHub.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Vercel detects a static site automatically — **Framework Preset: Other**,
   **Build Command: leave empty**, **Output Directory: `.`**.
4. Click **Deploy**.

That is the whole process. `vercel.json` already sets `cleanUrls` and adds
security headers.

### Deploying to GitHub Pages instead

Settings → Pages → Source: deploy from a branch → branch `main`, folder
`/ (root)`. The site is then served from
`https://<user>.github.io/<repo>/`.

> Relative paths (`css/style.css`, `js/store.js`) are used throughout, so the
> project works from a subdirectory without changes.

---

## 6. Testing checklist

1. Open `index.html` — the station list and pricing cards load.
2. Open `reservation.html` and submit an empty form — field errors appear.
3. Fill the form and submit — the confirmation screen shows an ID.
4. Repeat the same station, date and time — "THIS STATION IS ALREADY RESERVED".
5. Open `admin.html` — the booking is listed and the counts match.
6. Click **EDIT**, set the status to `Confirmed`, save — the badge and counts update.
7. Filter by status, and search by name, ID and station.
8. Click **DELETE**, confirm — the row disappears.
9. Reload the page — your changes are still there (LocalStorage).
10. Resize the browser to phone width.

---

## 7. Security notes for this repository

Handled:

- `.env` files, `*.sql`, `node_modules/` and local backups are git-ignored and
  are not part of the repository.
- The old Express server, `database.sql`, `package.json` and a stray nested copy
  of the project were removed from the tracked tree.
- Security headers are set in `vercel.json`.

**Action required — a leaked password.** An earlier commit of this repository
contained a real MySQL password inside `.env.example`
(commit `31d447b`). Because the repository was pushed to a public GitHub
repository, that password should be treated as public.

1. **Change the MySQL password** — this is the important one:

   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'a_new_password';
   FLUSH PRIVILEGES;
   ```

2. Optionally purge it from history with
   [git-filter-repo](https://github.com/newren/git-filter-repo), then force-push.
   This rewrites commit hashes, so do it only if you are comfortable with that.

Even after rewriting history, rotate the password first. Rotation alone is
enough for a local school database.

---

## 8. What changed from the original Node.js version

| Before | Now |
|---|---|
| `server.js` (Express routes) | removed |
| MySQL via `mysql2` | removed |
| `fetch("/reservations")` | `Store.list()` |
| `fetch("/stations")` | `Store.stations()` |
| `database.sql` | `js/data.js` (stations only) |
| `cors`, `dotenv`, `express` deps | none |
| `.env` for DB credentials | none — no secrets in the client |

The design system, page layouts and styling are unchanged.

---

> The cafe name, address, phone and email are sample content for a school project.
