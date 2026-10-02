// FRAME Gaming Cafe - admin.js
// READ   : Store.list()
// UPDATE : Store.update()
// DELETE : Store.remove()

var tableBody = document.getElementById("tableBody");
var tableInfo = document.getElementById("tableInfo");
var emptyNote = document.getElementById("emptyNote");
var searchInput = document.getElementById("searchInput");
var filterGroup = document.getElementById("filterGroup");

var editDialog = document.getElementById("editDialog");
var editForm = document.getElementById("editForm");
var editMessage = document.getElementById("editMessage");

var allReservations = [];   // every stored reservation
var stations = [];          // for the edit dropdown
var currentFilter = "All";  // status filter
var editingId = null;       // which reservation is being edited

var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// ---------- Helpers ----------
function padId(id) {
  var text = String(id);
  while (text.length < 3) {
    text = "0" + text;
  }
  return text;
}

function formatDate(isoDate) {
  var parts = isoDate.split("-");
  return MONTHS[Number(parts[1]) - 1] + " " + parts[2] + ", " + parts[0];
}

// Stops names like "<b>" from being treated as HTML
function safe(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- READ ----------
function loadReservations() {
  try {
    allReservations = Store.list();
    updateCounts();
    showTable();
  } catch (error) {
    tableBody.innerHTML = "";
    tableInfo.textContent = "";
    emptyNote.textContent = "Could not load reservations. Try refreshing the page.";
    emptyNote.classList.remove("hidden");
  }
}

function loadStations() {
  try {
    stations = Store.stations();
  } catch (error) {
    return;
  }

  var html = "";
  for (var i = 0; i < stations.length; i++) {
    html += '<option value="' + stations[i].station_id + '">' +
            stations[i].station_name + " — " + stations[i].station_type + "</option>";
  }
  document.getElementById("e-station").innerHTML = html;
}

// ---------- Dashboard counts (calculated from the real data) ----------
function updateCounts() {
  var pending = 0;
  var confirmed = 0;
  var cancelled = 0;
  var completed = 0;

  for (var i = 0; i < allReservations.length; i++) {
    var status = allReservations[i].status;
    if (status === "Pending") pending++;
    if (status === "Confirmed") confirmed++;
    if (status === "Cancelled") cancelled++;
    if (status === "Completed") completed++;
  }

  function show(id, number) {
    document.getElementById(id).textContent = number < 10 ? "0" + number : number;
  }
  show("count-total", allReservations.length);
  show("count-pending", pending);
  show("count-confirmed", confirmed);
  show("count-cancelled", cancelled);
  show("count-completed", completed);
}

// ---------- Search + filter + draw the table ----------
function getVisibleReservations() {
  var text = searchInput.value.trim().toLowerCase();
  var result = [];

  for (var i = 0; i < allReservations.length; i++) {
    var r = allReservations[i];

    // status filter
    if (currentFilter !== "All" && r.status !== currentFilter) {
      continue;
    }

    // search: customer name, reservation id (24 or #024), station
    if (text !== "") {
      var idText = padId(r.reservation_id);
      var matches =
        r.name.toLowerCase().includes(text) ||
        idText.includes(text.replace("#", "")) ||
        String(r.reservation_id) === text.replace("#", "") ||
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

function showTable() {
  var list = getVisibleReservations();
  var html = "";

  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    var statusClass = "status-" + r.status.toLowerCase();
    html +=
      "<tr>" +
        '<td data-label="ID" class="mono-cell">#' + padId(r.reservation_id) + "</td>" +
        '<td data-label="CUSTOMER">' + '<span class="cust">' + safe(r.name) + '<span class="cell-sub">' + safe(r.contact_number) + "</span></span></td>" +
        '<td data-label="STATION" class="mono-cell">' + safe(r.station_name) + "</td>" +
        '<td data-label="DATE" class="mono-cell">' + formatDate(r.reservation_date) + "</td>" +
        '<td data-label="TIME" class="mono-cell">' + r.start_time.substring(0, 5) + "</td>" +
        '<td data-label="DURATION" class="mono-cell">' + r.duration + " HR</td>" +
        '<td data-label="PLAYERS" class="mono-cell">' + r.number_of_players + "</td>" +
        '<td data-label="PAYMENT" class="mono-cell">' + safe(r.payment_method) + "</td>" +
        '<td data-label="STATUS"><span class="badge ' + statusClass + '">' + r.status + "</span></td>" +
        '<td class="action-cell">' +
          '<button type="button" class="btn btn-outline btn-small" data-action="edit" data-id="' + r.reservation_id + '">EDIT</button>' +
          '<button type="button" class="btn btn-small" data-action="delete" data-id="' + r.reservation_id + '">DELETE</button>' +
        "</td>" +
      "</tr>";
  }
  tableBody.innerHTML = html;

  tableInfo.textContent = "SHOWING " + list.length + " OF " + allReservations.length;

  if (list.length === 0) {
    if (allReservations.length === 0) {
      emptyNote.textContent = "No reservations yet. New reservations from the reservation page will appear here.";
    } else {
      emptyNote.textContent = "No reservations match your search or filter.";
    }
    emptyNote.classList.remove("hidden");
  } else {
    emptyNote.classList.add("hidden");
  }
}

// ---------- Search and filter events ----------
searchInput.addEventListener("input", showTable);

filterGroup.addEventListener("click", function (event) {
  var button = event.target.closest(".filter-btn");
  if (!button) {
    return;
  }
  currentFilter = button.dataset.status;

  var buttons = filterGroup.querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].setAttribute("aria-pressed", buttons[i] === button ? "true" : "false");
  }
  showTable();
});

// ---------- EDIT / DELETE button clicks ----------
tableBody.addEventListener("click", function (event) {
  var button = event.target.closest("button");
  if (!button) {
    return;
  }
  var id = button.dataset.id;
  if (button.dataset.action === "edit") {
    openEdit(id);
  }
  if (button.dataset.action === "delete") {
    deleteReservation(id);
  }
});

// ---------- UPDATE ----------
function openEdit(id) {
  var r = null;
  for (var i = 0; i < allReservations.length; i++) {
    if (String(allReservations[i].reservation_id) === String(id)) {
      r = allReservations[i];
    }
  }
  if (r === null) {
    return;
  }

  editingId = id;
  document.getElementById("editTitle").textContent = "EDIT RESERVATION #" + padId(id);
  document.getElementById("e-name").value = r.name;
  document.getElementById("e-contact").value = r.contact_number;
  document.getElementById("e-email").value = r.email;
  document.getElementById("e-station").value = r.station_id;
  document.getElementById("e-date").value = r.reservation_date;
  document.getElementById("e-time").value = r.start_time.substring(0, 5);
  document.getElementById("e-duration").value = r.duration;
  document.getElementById("e-players").value = r.number_of_players;
  document.getElementById("e-payment").value = r.payment_method;
  document.getElementById("e-status").value = r.status;
  editMessage.classList.add("hidden");

  editDialog.showModal();
}

function closeEdit() {
  editDialog.close();
  editingId = null;
}

document.getElementById("editClose").addEventListener("click", closeEdit);
document.getElementById("editCancel").addEventListener("click", closeEdit);

editForm.addEventListener("submit", function (event) {
  event.preventDefault();

  var data = {
    name: document.getElementById("e-name").value,
    contact_number: document.getElementById("e-contact").value,
    email: document.getElementById("e-email").value,
    station_id: document.getElementById("e-station").value,
    reservation_date: document.getElementById("e-date").value,
    start_time: document.getElementById("e-time").value,
    duration: document.getElementById("e-duration").value,
    number_of_players: document.getElementById("e-players").value,
    payment_method: document.getElementById("e-payment").value,
    status: document.getElementById("e-status").value
  };

  try {
    Store.update(editingId, data);
    closeEdit();
    loadReservations(); // refresh the table and the counts
  } catch (error) {
    editMessage.textContent = error.message || "Could not update the reservation.";
    editMessage.classList.remove("hidden");
  }
});

// ---------- DELETE ----------
function deleteReservation(id) {
  if (!confirm("Are you sure you want to delete this reservation?")) {
    return;
  }

  try {
    Store.remove(id);
    loadReservations(); // refresh
  } catch (error) {
    alert(error.message || "Could not delete the reservation.");
  }
}

loadStations();
loadReservations();
