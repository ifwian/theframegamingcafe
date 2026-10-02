-- FRAME Gaming Cafe - UPDATE SCRIPT
-- Use this if you already ran the OLD database.sql and want to keep your reservations.
-- It only ADDS the two new tables. Nothing is deleted.

USE frame_gaming_cafe;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  username   VARCHAR(50)  NOT NULL,
  action     VARCHAR(40)  NOT NULL,
  details    VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
