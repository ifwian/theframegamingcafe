-- FRAME Gaming Cafe - database setup
-- Open this file in MySQL Workbench and click the lightning bolt (Execute).

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS frame_gaming_cafe;

-- 2. Use it
USE frame_gaming_cafe;

-- Start clean (reservations first, because it depends on the other two)
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;

-- 3. Customers: people who reserve
CREATE TABLE customers (
  customer_id    INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  contact_number VARCHAR(30)  NOT NULL,
  email          VARCHAR(100) NOT NULL
);

-- 4. Stations: the gaming machines / rooms
CREATE TABLE stations (
  station_id     INT AUTO_INCREMENT PRIMARY KEY,
  station_name   VARCHAR(20) NOT NULL,
  station_type   VARCHAR(50) NOT NULL,
  price_per_hour INT         NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'Available'
);

-- 5. Reservations: links a customer to a station
CREATE TABLE reservations (
  reservation_id    INT AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT         NOT NULL,
  station_id        INT         NOT NULL,
  reservation_date  DATE        NOT NULL,
  start_time        TIME        NOT NULL,
  duration          INT         NOT NULL,
  number_of_players INT         NOT NULL,
  payment_method    VARCHAR(30) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'Pending',
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (station_id)  REFERENCES stations(station_id)
);

-- 6. Users: admin and staff accounts (customers do not log in)
--    role is 'admin' or 'staff'. Passwords are stored as hashes, never as plain text.
--    The server creates the first admin and staff accounts when it starts (see .env.example).
CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME     NULL
);

-- 7. Audit log: who did what, and when
CREATE TABLE audit_logs (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  username   VARCHAR(50)  NOT NULL,
  action     VARCHAR(40)  NOT NULL,
  details    VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Sample stations
INSERT INTO stations (station_name, station_type, price_per_hour, status) VALUES
  ('PC-01',  'Gaming PC',     50,  'Available'),
  ('PC-02',  'Gaming PC',     50,  'Available'),
  ('PC-03',  'High-End PC',   70,  'Available'),
  ('PS5-01', 'PlayStation 5', 80,  'Available'),
  ('VIP-01', 'VIP Room',      150, 'Available');
