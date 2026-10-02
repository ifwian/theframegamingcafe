// FRAME Gaming Cafe - admin.js  (private: only sent to a logged-in admin or staff)
//
// Sections: Overview, Reservations, Users (admin), Audit Log (admin)
// Every request goes through api(), which handles "not signed in" for us.

var PAGE_SIZE = 8;
var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

var me = null;                 // { username, role, ... } from /api/auth/me
var secondsLeft = 0;           // session countdown
var timeoutSeconds = 900;

var reservations = [];
var users = [];
var logs = [];

var currentFilter = "All";
var editingId = null;
var pageNumbers = { reservations: 1, users: 1, audit: 1 };

// ---------- Small helpers ----------
function $(id) {
  return document.getElementById(id);
}

function padId(id) {
  var text = String(id);
  while (text.length < 3) {
    text = "0" + text;
  }
  return text;
}

function twoDigits(number) {
  return number < 10 ? "0" + number : String(number);
}

// "2026-10-05" -> "OCT 05, 2026"
function formatDate(isoDate) {
  var parts = isoDate.split("-");
  return MONTHS[Number(parts[1]) - 1] + " " + parts[2] + ", " + parts[0];
}

// "2026-10-05 18:30:12" -> "OCT 05, 2026 18:30"
function formatDateTime(text) {
  if (!text) {
    return "—";
  }
  return formatDate(text.substring(0, 10)) + " " + text.substring(11, 16);
}

// Stops text like "<b>" from being treated as HTML
function safe(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Talking to the server ----------
async function api(url, options) {
  var response = await fetch(url, options);
  var data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401) {
    window.location = "/admin/login?expired=1";
    throw new Error("Signed out");
  }
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  secondsLeft = timeoutSeconds;   // the server just counted this as activity
  return data;
}

// ---------- Session timer ----------
function showTimer() {
  var minutes = Math.floor(secondsLeft / 60);
  var seconds = secondsLeft % 60;
  $("sessionTimer").textContent = twoDigits(minutes) + ":" + twoDigits(seconds);

  if (secondsLeft <= 60) {
    $("timeoutWarning").classList.remove("hidden");
  } else {
    $("timeoutWarning").classList.add("hidden");
  }
}

setInterval(function () {
  if (me === null) {
    return;
  }
  secondsLeft = secondsLeft - 1;
  if (secondsLeft <= 0) {
    window.location = "/admin/login?expired=1";
    return;
  }
  showTimer();
}, 1000);

$("stayBtn").addEventListener("click", async function () {
  await api("/api/auth/ping", { method: "POST" });
  showTimer();
});

$("logoutBtn").addEventListener("click", async function () {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location = "/admin/login";
});

// ---------- Pagination (used by all three tables) ----------
function drawPager(elementId, total, page, goToPage) {
  var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  var element = $(elementId);

  element.innerHTML =
    '<button type="button" class="btn btn-outline btn-small" data-page="' + (page - 1) + '"' +
      (page <= 1 ? " disabled" : "") + ">← PREV</button>" +
    '<span class="mono">PAGE ' + page + " / " + pages + " — " + total + " RESULTS</span>" +
    '<button type="button" class="btn btn-outline btn-small" data-page="' + (page + 1) + '"' +
      (page >= pages ? " disabled" : "") + ">NEXT →</button>";

  element.onclick = function (event) {
    var button = event.target.closest("button");
    if (button && !button.disabled) {
      goToPage(Number(button.dataset.page));
    }
  };
}

// Returns the part of the list that belongs on this page
function slicePage(list, page) {
  var start = (page - 1) * PAGE_SIZE;
  return list.slice(start, start + PAGE_SIZE);
}

// Keeps the page number inside 1..lastPage
function fixPage(name, total) {
  var lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageNumbers[name] > lastPage) {
    pageNumbers[name] = lastPage;
  }
  if (pageNumbers[name] < 1) {
    pageNumbers[name] = 1;
  }
}

function setEmpty(elementId, text) {
  var note = $(elementId);
  if (text === "") {
    note.classList.add("hidden");
  } else {
    note.textContent = text;
    note.classList.remove("hidden");
  }
}

// ---------- Sidebar navigation ----------
var sections = ["overview", "reservations", "users", "audit"];

function showSection(name) {
  for (var i = 0; i < sections.length; i++) {
    $("section-" + sections[i]).classList.toggle("hidden", sections[i] !== name);
  }
  var buttons = document.querySelectorAll(".side-nav button");
  for (var j = 0; j < buttons.length; j++) {
    if (buttons[j].dataset.section === name) {
      buttons[j].setAttribute("aria-current", "page");
    } else {
      buttons[j].removeAttribute("aria-current");
    }
  }
  $("sidePanel").classList.remove("is-open");
  $("sideToggle").setAttribute("aria-expanded", "false");

  loadSection(name);
}

async function loadSection(name) {
  try {
    if (name === "overview") await loadOverview();
    if (name === "reservations") await loadReservations();
    if (name === "users") await loadUsers();
    if (name === "audit") await loadAudit();
  } catch (error) {
    console.log(error);
  }
}

document.querySelector(".side-nav").addEventListener("click", function (event) {
  var button = event.target.closest("button");
  if (button) {
    showSection(button.dataset.section);
  }
});

$("sideToggle").addEventListener("click", function () {
  var open = $("sidePanel").classList.toggle("is-open");
  $("sideToggle").setAttribute("aria-expanded", open);
});

// ---------- OVERVIEW ----------
async function loadOverview() {
  var stats = await api("/api/stats");
  reservations = await api("/reservations");

  var pending = 0;
  for (var i = 0; i < reservations.length; i++) {
    if (reservations[i].status === "Pending") pending++;
  }

  $("m-users").textContent = twoDigits(stats.total_users);
  $("m-reservations").textContent = twoDigits(reservations.length);
  $("m-pending").textContent = twoDigits(pending);

  var online = stats.database === "Online";
  $("m-status").textContent = online ? "ONLINE" : "ERROR";
  $("m-dot").className = "status-dot " + (online ? "is-on" : "");
  var minutes = Math.floor(stats.uptime_seconds / 60);
  $("m-status-sub").textContent = "DATABASE " + stats.database.toUpperCase() + " — UP " + minutes + " MIN";

  // Latest 5 reservations
  var html = "";
  var latest = reservations.slice(0, 5);
  for (var j = 0; j < latest.length; j++) {
    var r = latest[j];
    html +=
      "<tr>" +
        '<td data-label="ID" class="mono-cell">#' + padId(r.reservation_id) + "</td>" +
        '<td data-label="CUSTOMER">' + safe(r.name) + "</td>" +
        '<td data-label="STATION" class="mono-cell">' + safe(r.station_name) + "</td>" +
        '<td data-label="DATE" class="mono-cell">' + formatDate(r.reservation_date) + "</td>" +
        '<td data-label="STATUS"><span class="badge status-' + r.status.toLowerCase() + '">' + r.status + "</span></td>" +
      "</tr>";
  }
  $("recentBody").innerHTML = html;
  setEmpty("recentEmpty", latest.length === 0 ? "No reservations yet." : "");
}

// ---------- RESERVATIONS: read ----------
async function loadReservations() {
  try {
    reservations = await api("/reservations");
    updateCounts();
    showReservations();
  } catch (error) {
    $("tableBody").innerHTML = "";
    setEmpty("emptyNote", "Could not load reservations. " + error.message);
  }
}

function updateCounts() {
  var pending = 0;
  var confirmed = 0;
  var cancelled = 0;
  var completed = 0;
  for (var i = 0; i < reservations.length; i++) {
    var status = reservations[i].status;
    if (status === "Pending") pending++;
    if (status === "Confirmed") confirmed++;
    if (status === "Cancelled") cancelled++;
    if (status === "Completed") completed++;
  }
  $("count-total").textContent = twoDigits(reservations.length);
  $("count-pending").textContent = twoDigits(pending);
  $("count-confirmed").textContent = twoDigits(confirmed);
  $("count-cancelled").textContent = twoDigits(cancelled);
  $("count-completed").textContent = twoDigits(completed);
}

function getVisibleReservations() {
  var text = $("searchInput").value.trim().toLowerCase().replace("#", "");
  var result = [];
  for (var i = 0; i < reservations.length; i++) {
    var r = reservations[i];
    if (currentFilter !== "All" && r.status !== currentFilter) {
      continue;
    }
    if (text !== "") {
      var matches =
        r.name.toLowerCase().includes(text) ||
        padId(r.reservation_id).includes(text) ||
        r.station_name.toLowerCase().includes(text) ||
        r.station_type.toLowerCase().includes(text);
      if (!matches) {
        continue;
      }
    }
    result.push(r);
  }
  return result;
}

function showReservations() {
  var list = getVisibleReservations();
  fixPage("reservations", list.length);
  var pageItems = slicePage(list, pageNumbers.reservations);
  var isAdmin = me.role === "admin";
  var html = "";

  for (var i = 0; i < pageItems.length; i++) {
    var r = pageItems[i];
    // Only admins get a DELETE button (the server checks this too)
    var deleteButton = isAdmin
      ? '<button type="button" class="btn btn-small" data-action="delete" data-id="' + r.reservation_id + '">DELETE</button>'
      : "";
    html +=
      "<tr>" +
        '<td data-label="ID" class="mono-cell">#' + padId(r.reservation_id) + "</td>" +
        '<td data-label="CUSTOMER"><span class="cust">' + safe(r.name) + '<span class="cell-sub">' + safe(r.contact_number) + "</span></span></td>" +
        '<td data-label="STATION" class="mono-cell">' + safe(r.station_name) + "</td>" +
        '<td data-label="DATE" class="mono-cell">' + formatDate(r.reservation_date) + "</td>" +
        '<td data-label="TIME" class="mono-cell">' + r.start_time.substring(0, 5) + "</td>" +
        '<td data-label="DURATION" class="mono-cell">' + r.duration + " HR</td>" +
        '<td data-label="PLAYERS" class="mono-cell">' + r.number_of_players + "</td>" +
        '<td data-label="PAYMENT" class="mono-cell">' + safe(r.payment_method) + "</td>" +
        '<td data-label="STATUS"><span class="badge status-' + r.status.toLowerCase() + '">' + r.status + "</span></td>" +
        '<td class="action-cell">' +
          '<button type="button" class="btn btn-outline btn-small" data-action="edit" data-id="' + r.reservation_id + '">EDIT</button>' +
          deleteButton +
        "</td>" +
      "</tr>";
  }
  $("tableBody").innerHTML = html;

  if (list.length === 0) {
    setEmpty("emptyNote", reservations.length === 0
      ? "No reservations yet. New reservations from the reservation page will appear here."
      : "No reservations match your search or filter.");
  } else {
    setEmpty("emptyNote", "");
  }

  drawPager("resPager", list.length, pageNumbers.reservations, function (page) {
    pageNumbers.reservations = page;
    showReservations();
  });
}

$("searchInput").addEventListener("input", function () {
  pageNumbers.reservations = 1;
  showReservations();
});

$("filterGroup").addEventListener("click", function (event) {
  var button = event.target.closest(".filter-btn");
  if (!button) {
    return;
  }
  currentFilter = button.dataset.status;
  var buttons = $("filterGroup").querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].setAttribute("aria-pressed", buttons[i] === button ? "true" : "false");
  }
  pageNumbers.reservations = 1;
  showReservations();
});

$("tableBody").addEventListener("click", function (event) {
  var button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.dataset.action === "edit") {
    openEdit(button.dataset.id);
  }
  if (button.dataset.action === "delete") {
    deleteReservation(button.dataset.id);
  }
});

// ---------- RESERVATIONS: update ----------
async function loadStationsForEdit() {
  try {
    var response = await fetch("/stations");
    var stations = await response.json();
    var html = "";
    for (var i = 0; i < stations.length; i++) {
      html += '<option value="' + stations[i].station_id + '">' +
              stations[i].station_name + " — " + stations[i].station_type + "</option>";
    }
    $("e-station").innerHTML = html;
  } catch (error) {
    console.log("Could not load stations", error);
  }
}

function openEdit(id) {
  var r = null;
  for (var i = 0; i < reservations.length; i++) {
    if (String(reservations[i].reservation_id) === String(id)) {
      r = reservations[i];
    }
  }
  if (r === null) {
    return;
  }

  editingId = id;
  $("editTitle").textContent = "EDIT RESERVATION #" + padId(id);
  $("e-name").value = r.name;
  $("e-contact").value = r.contact_number;
  $("e-email").value = r.email;
  $("e-station").value = r.station_id;
  $("e-date").value = r.reservation_date;
  $("e-time").value = r.start_time.substring(0, 5);
  $("e-duration").value = r.duration;
  $("e-players").value = r.number_of_players;
  $("e-payment").value = r.payment_method;
  $("e-status").value = r.status;
  $("editMessage").classList.add("hidden");
  $("editDialog").showModal();
}

function closeEdit() {
  $("editDialog").close();
  editingId = null;
}

$("editClose").addEventListener("click", closeEdit);
$("editCancel").addEventListener("click", closeEdit);

$("editForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  var data = {
    name: $("e-name").value,
    contact_number: $("e-contact").value,
    email: $("e-email").value,
    station_id: $("e-station").value,
    reservation_date: $("e-date").value,
    start_time: $("e-time").value,
    duration: $("e-duration").value,
    number_of_players: $("e-players").value,
    payment_method: $("e-payment").value,
    status: $("e-status").value
  };

  try {
    await api("/reservations/" + editingId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    closeEdit();
    loadReservations();
  } catch (error) {
    $("editMessage").textContent = error.message;
    $("editMessage").classList.remove("hidden");
  }
});

// ---------- RESERVATIONS: delete (admin only) ----------
async function deleteReservation(id) {
  var sure = confirm("Are you sure you want to delete this reservation?");
  if (!sure) {
    return;
  }
  try {
    await api("/reservations/" + id, { method: "DELETE" });
    loadReservations();
  } catch (error) {
    alert(error.message);
  }
}

// ---------- USERS (admin only) ----------
async function loadUsers() {
  try {
    users = await api("/api/users");
    showUsers();
  } catch (error) {
    $("userBody").innerHTML = "";
    setEmpty("userEmpty", error.message);
  }
}

function showUsers() {
  var text = $("userSearch").value.trim().toLowerCase();
  var list = [];
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (text === "" || u.username.toLowerCase().includes(text) || u.role.toLowerCase().includes(text)) {
      list.push(u);
    }
  }
  fixPage("users", list.length);

  var pageItems = slicePage(list, pageNumbers.users);
  var html = "";
  for (var j = 0; j < pageItems.length; j++) {
    var user = pageItems[j];
    html +=
      "<tr>" +
        '<td data-label="ID" class="mono-cell">' + padId(user.user_id) + "</td>" +
        '<td data-label="USERNAME">' + safe(user.username) + "</td>" +
        '<td data-label="ROLE"><span class="badge ' + (user.role === "admin" ? "status-confirmed" : "") + '">' + safe(user.role) + "</span></td>" +
        '<td data-label="CREATED" class="mono-cell">' + formatDateTime(user.created_at) + "</td>" +
        '<td data-label="LAST LOGIN" class="mono-cell">' + formatDateTime(user.last_login) + "</td>" +
      "</tr>";
  }
  $("userBody").innerHTML = html;
  setEmpty("userEmpty", list.length === 0 ? "No users match your search." : "");

  drawPager("userPager", list.length, pageNumbers.users, function (page) {
    pageNumbers.users = page;
    showUsers();
  });
}

$("userSearch").addEventListener("input", function () {
  pageNumbers.users = 1;
  showUsers();
});

// ---------- AUDIT LOG (admin only) ----------
async function loadAudit() {
  try {
    logs = await api("/api/audit-logs");
    showAudit();
  } catch (error) {
    $("auditBody").innerHTML = "";
    setEmpty("auditEmpty", error.message);
  }
}

function showAudit() {
  var text = $("auditSearch").value.trim().toLowerCase();
  var list = [];
  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    if (text === "" ||
        l.username.toLowerCase().includes(text) ||
        l.action.toLowerCase().includes(text) ||
        l.details.toLowerCase().includes(text)) {
      list.push(l);
    }
  }
  fixPage("audit", list.length);

  var pageItems = slicePage(list, pageNumbers.audit);
  var html = "";
  for (var j = 0; j < pageItems.length; j++) {
    var log = pageItems[j];
    html +=
      "<tr>" +
        '<td data-label="TIME" class="mono-cell">' + formatDateTime(log.created_at) + "</td>" +
        '<td data-label="USER">' + safe(log.username) + "</td>" +
        '<td data-label="ACTION"><span class="badge">' + safe(log.action) + "</span></td>" +
        '<td data-label="DETAILS">' + safe(log.details) + "</td>" +
        '<td data-label="IP" class="mono-cell">' + safe(log.ip_address || "—") + "</td>" +
      "</tr>";
  }
  $("auditBody").innerHTML = html;
  setEmpty("auditEmpty", list.length === 0 ? "No log entries match your search." : "");

  drawPager("auditPager", list.length, pageNumbers.audit, function (page) {
    pageNumbers.audit = page;
    showAudit();
  });
}

$("auditSearch").addEventListener("input", function () {
  pageNumbers.audit = 1;
  showAudit();
});

// ---------- Start ----------
async function start() {
  var response = await fetch("/api/auth/me");
  if (!response.ok) {
    window.location = "/admin/login?expired=1";
    return;
  }
  me = await response.json();
  timeoutSeconds = me.timeoutSeconds;
  secondsLeft = me.expiresInSeconds;

  $("whoName").textContent = me.username;
  $("whoRole").textContent = me.role.toUpperCase();

  // Staff do not see the admin-only sections (the server blocks them as well)
  if (me.role !== "admin") {
    var adminOnly = document.querySelectorAll("[data-admin-only]");
    for (var i = 0; i < adminOnly.length; i++) {
      adminOnly[i].classList.add("hidden");
    }
  }

  showTimer();
  loadStationsForEdit();
  showSection("overview");
}

start();
