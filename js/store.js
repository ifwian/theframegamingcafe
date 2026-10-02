// FRAME Gaming Cafe - store.js
// The client-side "database". Replaces the old Express + MySQL backend.
//
// Every method returns the exact same JSON shape the API used to return
// (the flattened, station-joined reservation rows), so reservation.js and
// admin.js only needed their fetch() calls swapped for Store calls.
//
// Public API:
//   Store.stations()            -> Station[]
//   Store.list()                -> Reservation[]   (READ, newest first)
//   Store.get(id)               -> Reservation | null
//   Store.create(data)          -> Reservation     (CREATE)
//   Store.update(id, data)      -> Reservation     (UPDATE)
//   Store.remove(id)            -> { message }     (DELETE)
//   Store.isDoubleBooked(...)   -> boolean
//   Store.reset()               -> re-seeds from data.js
//
// Failures are thrown as Error objects carrying an HTTP-like `.status`
// (400 validation, 404 missing, 409 slot taken) so the pages can keep
// reading `error.message` exactly as they read `result.error` before.

var Store = (function () {
  "use strict";

  var KEY_STATIONS = "frame.stations";
  var KEY_RESERVATIONS = "frame.reservations";
  var KEY_NEXT_ID = "frame.nextReservationId";
  var KEY_INITIALISED = "frame.initialised";

  var BOOKED_MESSAGE = "THIS STATION IS ALREADY RESERVED FOR THIS DATE AND TIME.";
  var ALLOWED_STATUS = ["Pending", "Confirmed", "Cancelled", "Completed"];

  // Private mode / disabled storage: fall back to memory so the demo still runs.
  var memory = {};

  function ls() {
    try {
      var store = window.localStorage;
      var probe = "__frame_probe__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch (error) {
      return null;
    }
  }

  function getItem(key) {
    var store = ls();
    if (store) {
      return store.getItem(key);
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function setItem(key, value) {
    var store = ls();
    if (!store) {
      memory[key] = value;
      return;
    }
    try {
      store.setItem(key, value);
    } catch (error) {
      throw storeError("Browser storage is full. Delete a few reservations and try again.", 507);
    }
  }

  function removeItem(key) {
    var store = ls();
    if (store) {
      store.removeItem(key);
      return;
    }
    delete memory[key];
  }

  function storeError(message, status) {
    var error = new Error(message);
    error.status = status;
    return error;
  }

  function readJson(key, fallback) {
    var raw = getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    try {
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    setItem(key, JSON.stringify(value));
  }

  // ---------- Seeding ----------

  function ensureSeeded() {
    // First ever run: write the reference data and the demo rows.
    if (getItem(KEY_INITIALISED) === null) {
      writeJson(KEY_STATIONS, FRAME_DATA.stations.slice());
      writeJson(
        KEY_RESERVATIONS,
        FRAME_DATA.seedDemoReservations ? FRAME_DATA.demoReservations.slice() : []
      );
      setItem(KEY_NEXT_ID, String(FRAME_DATA.nextReservationId));
      setItem(KEY_INITIALISED, String(new Date().getTime()));
      return;
    }

    // Later runs: only repair keys that are missing or corrupt.
    if (!Array.isArray(readJson(KEY_STATIONS, null))) {
      writeJson(KEY_STATIONS, FRAME_DATA.stations.slice());
    }
    if (!Array.isArray(readJson(KEY_RESERVATIONS, null))) {
      writeJson(KEY_RESERVATIONS, []);
    }
    if (!readJson(KEY_NEXT_ID, null)) {
      setItem(KEY_NEXT_ID, String(highestId() + 1));
    }
  }

  function highestId() {
    var rows = readJson(KEY_RESERVATIONS, []);
    var max = 0;
    for (var i = 0; i < rows.length; i++) {
      var id = Number(rows[i].reservation_id);
      if (id > max) {
        max = id;
      }
    }
    return max;
  }

  function takeNextId() {
    var next = Math.max(Number(getItem(KEY_NEXT_ID)) || 1, highestId() + 1);
    setItem(KEY_NEXT_ID, String(next + 1));
    return next;
  }

  // ---------- Normalisation ----------
  // The form gives strings; MySQL used to give back real INT columns.
  // Coerce here so page logic such as `duration === 1` still behaves.

  function normaliseTime(value) {
    var text = String(value || "").trim();
    if (text.length === 5) {
      return text + ":00";
    }
    return text;
  }

  function clean(data) {
    return {
      station_id: Number(data.station_id),
      reservation_date: String(data.reservation_date || ""),
      start_time: normaliseTime(data.start_time),
      duration: Number(data.duration),
      number_of_players: Number(data.number_of_players),
      payment_method: String(data.payment_method || "").trim(),
      status: String(data.status || "Pending").trim(),
      name: String(data.name || "").trim(),
      contact_number: String(data.contact_number || "").trim(),
      email: String(data.email || "").trim()
    };
  }

  // ---------- Helpers ----------

  function findStation(id) {
    var stations = readJson(KEY_STATIONS, []);
    for (var i = 0; i < stations.length; i++) {
      if (String(stations[i].station_id) === String(id)) {
        return stations[i];
      }
    }
    return null;
  }

  // Attach station_name / station_type / price_per_hour to a stored row.
  // This is the JOIN that the SQL query used to do.
  function decorate(row) {
    var station = findStation(row.station_id);
    return {
      reservation_id: row.reservation_id,
      customer_id: row.customer_id || 0,
      station_id: row.station_id,
      station_name: station ? station.station_name : "Unknown",
      station_type: station ? station.station_type : "-",
      price_per_hour: station ? station.price_per_hour : 0,
      reservation_date: row.reservation_date,
      start_time: row.start_time,
      duration: row.duration,
      number_of_players: row.number_of_players,
      payment_method: row.payment_method,
      status: row.status,
      name: row.name,
      contact_number: row.contact_number,
      email: row.email
    };
  }

  function readRows() {
    var rows = readJson(KEY_RESERVATIONS, []);
    return Array.isArray(rows) ? rows : [];
  }

  function writeRows(rows) {
    writeJson(KEY_RESERVATIONS, rows);
  }

  // Ported from server.js checkReservation().
  function validate(data) {
    if (!data.name) {
      return "Name is required.";
    }
    if (!data.contact_number) {
      return "Contact number is required.";
    }
    if (!data.email || data.email.indexOf("@") === -1) {
      return "A valid email is required.";
    }
    if (!data.station_id || isNaN(data.station_id)) {
      return "Please choose a station.";
    }
    if (!data.reservation_date) {
      return "Please choose a date.";
    }
    if (!data.start_time) {
      return "Please choose a start time.";
    }
    if (!data.duration || isNaN(data.duration) || data.duration < 1) {
      return "Please choose a duration.";
    }
    if (!data.number_of_players || isNaN(data.number_of_players) || data.number_of_players < 1) {
      return "Players must be at least 1.";
    }
    if (!data.payment_method) {
      return "Please choose a payment method.";
    }
    return "";
  }

  // Same slot check as server.js isDoubleBooked().
  // Cancelled rows never block a slot; ignoreId lets an edit skip itself.
  function isDoubleBooked(station_id, date, time, ignoreId) {
    var rows = readRows();
    var wanted = normaliseTime(time);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (String(row.station_id) === String(station_id) &&
          row.reservation_date === date &&
          normaliseTime(row.start_time) === wanted &&
          row.status !== "Cancelled" &&
          String(row.reservation_id) !== String(ignoreId || 0)) {
        return true;
      }
    }
    return false;
  }

  function indexOfId(id) {
    var rows = readRows();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].reservation_id) === String(id)) {
        return i;
      }
    }
    return -1;
  }

  // ---------- Public API ----------

  function stations() {
    ensureSeeded();
    return readJson(KEY_STATIONS, []).slice();
  }

  function list() {
    ensureSeeded();
    var rows = readRows().slice();
    rows.sort(function (a, b) {
      return Number(b.reservation_id) - Number(a.reservation_id);
    });

    var result = [];
    for (var i = 0; i < rows.length; i++) {
      result.push(decorate(rows[i]));
    }
    return result;
  }

  function get(id) {
    ensureSeeded();
    var index = indexOfId(id);
    if (index === -1) {
      return null;
    }
    return decorate(readRows()[index]);
  }

  function create(data) {
    ensureSeeded();

    var clean_ = clean(data);
    var problem = validate(clean_);
    if (problem !== "") {
      throw storeError(problem, 400);
    }

    if (isDoubleBooked(clean_.station_id, clean_.reservation_date, clean_.start_time, 0)) {
      throw storeError(BOOKED_MESSAGE, 409);
    }

    clean_.status = "Pending";
    clean_.reservation_id = takeNextId();
    clean_.customer_id = clean_.reservation_id;

    var rows = readRows();
    rows.push(clean_);
    writeRows(rows);

    return decorate(clean_);
  }

  function update(id, data) {
    ensureSeeded();

    var index = indexOfId(id);
    if (index === -1) {
      throw storeError("Reservation not found.", 404);
    }

    var merged = clean({
      name: data.name,
      contact_number: data.contact_number,
      email: data.email,
      station_id: data.station_id,
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      duration: data.duration,
      number_of_players: data.number_of_players,
      payment_method: data.payment_method,
      status: data.status
    });

    var problem = validate(merged);
    if (problem !== "") {
      throw storeError(problem, 400);
    }
    if (ALLOWED_STATUS.indexOf(merged.status) === -1) {
      throw storeError("Invalid status.", 400);
    }

    // A cancelled reservation does not block a slot, so only check the others.
    if (merged.status !== "Cancelled" &&
        isDoubleBooked(merged.station_id, merged.reservation_date, merged.start_time, id)) {
      throw storeError(BOOKED_MESSAGE, 409);
    }

    var rows = readRows();
    merged.reservation_id = rows[index].reservation_id;
    merged.customer_id = rows[index].customer_id;
    rows[index] = merged;
    writeRows(rows);

    return decorate(merged);
  }

  function remove(id) {
    ensureSeeded();

    var index = indexOfId(id);
    if (index === -1) {
      throw storeError("Reservation not found.", 404);
    }

    var rows = readRows();
    rows.splice(index, 1);
    writeRows(rows);

    return { message: "Reservation deleted." };
  }

  // Puts the demo data back. Handy for repeated live demos.
  function reset() {
    removeItem(KEY_STATIONS);
    removeItem(KEY_RESERVATIONS);
    removeItem(KEY_NEXT_ID);
    removeItem(KEY_INITIALISED);
    ensureSeeded();
  }

  return {
    stations: stations,
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
    isDoubleBooked: isDoubleBooked,
    reset: reset
  };
})();
