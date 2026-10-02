// FRAME Gaming Cafe - data.js
// Reference data for the browser-only version of the app.
//
// This file replaces the MySQL "stations" table from the old backend.
// Stations never change at runtime, so they live here as plain constants
// and are copied into LocalStorage on first run.

var FRAME_DATA = {
  // Copy these straight from database.sql if you ever need the MySQL version.
  stations: [
    { station_id: 1, station_name: "PC-01", station_type: "Gaming PC", price_per_hour: 50, status: "Available" },
    { station_id: 2, station_name: "PC-02", station_type: "Gaming PC", price_per_hour: 50, status: "Available" },
    { station_id: 3, station_name: "PC-03", station_type: "High-End PC", price_per_hour: 70, status: "Available" },
    { station_id: 4, station_name: "PS5-01", station_type: "PlayStation 5", price_per_hour: 80, status: "Available" },
    { station_id: 5, station_name: "VIP-01", station_type: "VIP Room", price_per_hour: 150, status: "Available" }
  ],

  // Set to false if you want a blank admin page on first load.
  // (You can always create records by hand through reservation.html.)
  seedDemoReservations: true,

  // The first ID the app will hand out. Demo rows below sit below this number.
  nextReservationId: 4,

  // Three sample bookings so the deployed demo is not an empty table.
  // Field names match the old joined SQL SELECT, so the pages read them as-is.
  demoReservations: [
    {
      reservation_id: 1,
      customer_id: 1,
      station_id: 3,
      reservation_date: "2026-10-05",
      start_time: "14:00:00",
      duration: 2,
      number_of_players: 4,
      payment_method: "GCash",
      status: "Confirmed",
      name: "Aria Mendoza",
      contact_number: "0917 555 0142",
      email: "aria.mendoza@example.com"
    },
    {
      reservation_id: 2,
      customer_id: 2,
      station_id: 4,
      reservation_date: "2026-10-06",
      start_time: "18:00:00",
      duration: 3,
      number_of_players: 2,
      payment_method: "Cash",
      status: "Pending",
      name: "Jonas Rivera",
      contact_number: "0918 555 0177",
      email: "jonas.rivera@example.com"
    },
    {
      reservation_id: 3,
      customer_id: 3,
      station_id: 5,
      reservation_date: "2026-10-07",
      start_time: "20:00:00",
      duration: 2,
      number_of_players: 6,
      payment_method: "Maya",
      status: "Pending",
      name: "Kat dela Cruz",
      contact_number: "0920 555 0193",
      email: "kat.delacruz@example.com"
    }
  ]
};
