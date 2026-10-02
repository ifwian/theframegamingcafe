// FRAME Gaming Cafe - main.js
// Used on the landing page (and the mobile menu on every page).

// ---------- Mobile menu ----------
var navToggle = document.getElementById("navToggle");
var navList = document.getElementById("navList");

if (navToggle && navList) {
  navToggle.addEventListener("click", function () {
    var isOpen = navList.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });

  // Close the menu after picking a link
  navList.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      navList.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// ---------- Stations + pricing (read from the local data store) ----------
var stationList = document.getElementById("stationList");
var pricingGrid = document.getElementById("pricingGrid");

// Turns 5 into "05"
function twoDigits(number) {
  if (number < 10) {
    return "0" + number;
  }
  return String(number);
}

function showStations(stations) {
  var html = "";
  for (var i = 0; i < stations.length; i++) {
    var s = stations[i];
    var statusClass = s.status === "Available" ? "is-available" : "";
    html +=
      '<a class="station-row" href="reservation.html?station=' + s.station_id + '">' +
        '<span class="mono muted">' + twoDigits(i + 1) + "</span>" +
        '<span class="station-name">' + s.station_name + "</span>" +
        '<span class="station-type">' + s.station_type + "</span>" +
        '<span class="mono station-price">₱' + s.price_per_hour + " / HR</span>" +
        '<span class="status-text ' + statusClass + '">' + s.status.toUpperCase() + "</span>" +
        '<span class="arrow" aria-hidden="true">→</span>' +
      "</a>";
  }
  stationList.innerHTML = html;
}

// One pricing block per station type (the first station of each type sets the price)
function showPricing(stations) {
  var seenTypes = [];
  var html = "";
  for (var i = 0; i < stations.length; i++) {
    var s = stations[i];
    if (seenTypes.includes(s.station_type)) {
      continue;
    }
    seenTypes.push(s.station_type);

    // "Gaming PC" is shown as "Regular PC" in the pricing list
    var priceName = s.station_type;
    if (priceName === "Gaming PC") {
      priceName = "Regular PC";
    }
    html +=
      '<div class="price-item">' +
        '<span class="mono muted">' + twoDigits(seenTypes.length) + "</span>" +
        '<p class="price-name">' + priceName.toUpperCase() + "</p>" +
        '<p class="price-value">₱' + s.price_per_hour + '<span class="mono muted"> / HOUR</span></p>' +
      "</div>";
  }
  pricingGrid.innerHTML = html;
}

function loadStations() {
  if (!stationList) {
    return; // not the landing page
  }
  try {
    var stations = Store.stations();
    showStations(stations);
    showPricing(stations);
    document.getElementById("stationCount").textContent = twoDigits(stations.length);
  } catch (error) {
    var note = '<p class="empty-note">Stations could not be loaded. Try refreshing the page.</p>';
    stationList.innerHTML = note;
    pricingGrid.innerHTML = note;
  }
}

loadStations();
