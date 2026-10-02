// FRAME Gaming Cafe - reservation.js
// Flow: form -> validate -> fetch(POST /reservations) -> Express -> MySQL

var form = document.getElementById("reservationForm");
var stationSelect = document.getElementById("station_id");
var dateInput = document.getElementById("reservation_date");
var durationSelect = document.getElementById("duration");
var estimate = document.getElementById("estimate");
var formMessage = document.getElementById("formMessage");
var submitBtn = document.getElementById("submitBtn");
var confirmation = document.getElementById("confirmation");

var stations = []; // filled from MySQL

var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// ---------- Helpers ----------

// "2026-10-05" -> "OCT 05, 2026"
function formatDate(isoDate) {
  var parts = isoDate.split("-");
  return MONTHS[Number(parts[1]) - 1] + " " + parts[2] + ", " + parts[0];
}

// Turns 24 into "024"
function padId(id) {
  var text = String(id);
  while (text.length < 3) {
    text = "0" + text;
  }
  return text;
}

function findStation(id) {
  for (var i = 0; i < stations.length; i++) {
    if (String(stations[i].station_id) === String(id)) {
      return stations[i];
    }
  }
  return null;
}

// ---------- Load stations from MySQL ----------
async function loadStations() {
  try {
    var response = await fetch("/stations");
    stations = await response.json();
    if (!response.ok) {
      throw new Error("Server error");
    }

    var html = '<option value="">Select a station</option>';
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      if (s.status !== "Available") {
        continue;
      }
      html += '<option value="' + s.station_id + '">' + s.station_name + " — " +
              s.station_type + " (₱" + s.price_per_hour + "/hr)</option>";
    }
    stationSelect.innerHTML = html;

    // If the user clicked a station on the landing page, pick it
    var chosen = new URLSearchParams(window.location.search).get("station");
    if (chosen) {
      stationSelect.value = chosen;
    }
    updateEstimate();
  } catch (error) {
    stationSelect.innerHTML = '<option value="">Stations unavailable</option>';
    showMessage("Could not load stations. Make sure the server and MySQL are running.");
  }
}

// Earliest selectable date is today
function setMinDate() {
  var today = new Date();
  var month = String(today.getMonth() + 1).padStart(2, "0");
  var day = String(today.getDate()).padStart(2, "0");
  dateInput.min = today.getFullYear() + "-" + month + "-" + day;
}

// ---------- Estimate ----------
function updateEstimate() {
  var station = findStation(stationSelect.value);
  var hours = Number(durationSelect.value);
  if (station && hours > 0) {
    estimate.textContent = "ESTIMATED TOTAL: ₱" + (station.price_per_hour * hours);
  } else {
    estimate.textContent = "ESTIMATED TOTAL: —";
  }
}

// ---------- Messages and errors ----------
function showMessage(text) {
  formMessage.textContent = text;
  formMessage.classList.remove("hidden");
}

function hideMessage() {
  formMessage.classList.add("hidden");
}

// Show (or clear) the error under one field.
// "name" is the field id suffix, e.g. "name" -> #field-name and #error-name
function setError(name, message) {
  var field = document.getElementById("field-" + name);
  var errorText = document.getElementById("error-" + name);
  errorText.textContent = message;
  if (message === "") {
    field.classList.remove("has-error");
  } else {
    field.classList.add("has-error");
  }
}

// ---------- Validation ----------
// Returns true when every field is OK.
function validateForm() {
  var ok = true;
  var firstBad = null;

  function check(name, inputId, message) {
    setError(name, message);
    if (message !== "") {
      ok = false;
      if (firstBad === null) {
        firstBad = document.getElementById(inputId);
      }
    }
  }

  var name = document.getElementById("name").value.trim();
  var contact = document.getElementById("contact_number").value.trim();
  var email = document.getElementById("email").value.trim();
  var players = Number(document.getElementById("number_of_players").value);

  check("name", "name", name === "" ? "Enter your full name." : "");
  check("contact", "contact_number", contact === "" ? "Enter your contact number." : "");

  var emailMessage = "";
  if (email === "") {
    emailMessage = "Enter your email.";
  } else if (!email.includes("@") || !email.includes(".") || email.indexOf("@") < 1) {
    emailMessage = "Enter a valid email, like name@example.com.";
  }
  check("email", "email", emailMessage);

  check("station", "station_id", stationSelect.value === "" ? "Select a gaming station." : "");
  check("date", "reservation_date", dateInput.value === "" ? "Select a date." : "");
  check("time", "start_time", document.getElementById("start_time").value === "" ? "Select a start time." : "");
  check("duration", "duration", durationSelect.value === "" ? "Select how many hours." : "");
  check("players", "number_of_players", players >= 1 ? "" : "Players must be at least 1.");
  check("payment", "payment_method", document.getElementById("payment_method").value === "" ? "Select a payment method." : "");

  if (firstBad !== null) {
    firstBad.focus();
  }
  return ok;
}

// ---------- Submit (CREATE) ----------
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideMessage();

  if (!validateForm()) {
    return;
  }

  var data = {
    name: document.getElementById("name").value,
    contact_number: document.getElementById("contact_number").value,
    email: document.getElementById("email").value,
    station_id: stationSelect.value,
    reservation_date: dateInput.value,
    start_time: document.getElementById("start_time").value,
    duration: durationSelect.value,
    number_of_players: document.getElementById("number_of_players").value,
    payment_method: document.getElementById("payment_method").value
  };

  submitBtn.disabled = true;

  try {
    var response = await fetch("/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    var result = await response.json();

    if (!response.ok) {
      // For example the double-booking message (409)
      showMessage(result.error);
      submitBtn.disabled = false;
      return;
    }

    showConfirmation(result);
  } catch (error) {
    showMessage("Could not reach the server. Make sure it is running.");
  }

  submitBtn.disabled = false;
});

// ---------- Confirmation ----------
function showConfirmation(reservation) {
  document.getElementById("c-id").textContent = "#" + padId(reservation.reservation_id);
  document.getElementById("c-station").textContent = reservation.station_name;
  document.getElementById("c-date").textContent = formatDate(reservation.reservation_date);
  document.getElementById("c-time").textContent = reservation.start_time.substring(0, 5);
  document.getElementById("c-duration").textContent =
    reservation.duration + (reservation.duration === 1 ? " HOUR" : " HOURS");
  document.getElementById("c-total").textContent = "₱" + (reservation.price_per_hour * reservation.duration);

  form.classList.add("hidden");
  confirmation.classList.remove("hidden");
  confirmation.scrollIntoView();
}

document.getElementById("newReservationBtn").addEventListener("click", function () {
  form.reset();
  updateEstimate();
  confirmation.classList.add("hidden");
  form.classList.remove("hidden");
  window.scrollTo(0, 0);
});

// ---------- Live updates ----------
stationSelect.addEventListener("change", updateEstimate);
durationSelect.addEventListener("change", updateEstimate);

// Clear an error as soon as the user fixes the field
form.addEventListener("input", function (event) {
  var fieldBox = event.target.closest(".field");
  if (fieldBox && fieldBox.classList.contains("has-error")) {
    fieldBox.classList.remove("has-error");
    fieldBox.querySelector(".error-text").textContent = "";
  }
});

setMinDate();
loadStations();
