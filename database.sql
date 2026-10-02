-- FRAME Gaming Cafe - database setup

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS frame_gaming_cafe;

-- 2. Use it
USE frame_gaming_cafe;

-- Start clean (reservations first, because it depends on the other two)
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS stations;

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

-- 6. Sample stations
INSERT INTO stations (station_name, station_type, price_per_hour, status) VALUES
  ('PC-01',  'Gaming PC',     50,  'Available'),
  ('PC-02',  'Gaming PC',     50,  'Available'),
  ('PC-03',  'High-End PC',   70,  'Available'),
  ('PS5-01', 'PlayStation 5', 80,  'Available'),
  ('VIP-01', 'VIP Room',      150, 'Available');
