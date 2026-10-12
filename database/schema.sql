-- Import ONCE into a NEW empty MySQL/MariaDB database using phpMyAdmin.
-- No demo accounts, passwords, members, or payments are included.
SET NAMES utf8mb4;
CREATE TABLE app_lock (id INT PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO app_lock VALUES (1);
CREATE TABLE user_account (
 id CHAR(36) PRIMARY KEY, username VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
 password_hash VARCHAR(255) NOT NULL, role ENUM('ADMIN','STAFF') NOT NULL,
 status ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE', created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE session (
 token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at VARCHAR(30) NOT NULL, created_at VARCHAR(30) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES user_account(id), INDEX(expires_at), INDEX(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE request_limit (bucket CHAR(64) PRIMARY KEY, hits INT NOT NULL, expires_at BIGINT NOT NULL, INDEX(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE member (
 id CHAR(36) PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, qr_token CHAR(48) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL, birth_date DATE NOT NULL, email VARCHAR(254) NOT NULL DEFAULT '',
 phone VARCHAR(24) NOT NULL, address VARCHAR(300) NOT NULL, emergency_name VARCHAR(100) NOT NULL,
 emergency_phone VARCHAR(24) NOT NULL, blood_type VARCHAR(3) NOT NULL DEFAULT '',
 status ENUM('REGISTERED','ARCHIVED') NOT NULL DEFAULT 'REGISTERED',
 created_by CHAR(36) NOT NULL, created_at VARCHAR(30) NOT NULL, updated_at VARCHAR(30) NOT NULL,
 FOREIGN KEY(created_by) REFERENCES user_account(id), INDEX(name), INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE annual_membership (
 id CHAR(36) PRIMARY KEY, member_id CHAR(36) NOT NULL UNIQUE, start_date DATE NOT NULL, expires_on DATE NOT NULL,
 grace_end DATE NOT NULL, status ENUM('ACTIVE','CANCELLED') NOT NULL,
 FOREIGN KEY(member_id) REFERENCES member(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE monthly_access (
 id CHAR(36) PRIMARY KEY, member_id CHAR(36) NOT NULL UNIQUE, start_date DATE NOT NULL, expires_on DATE NOT NULL,
 status ENUM('ACTIVE','CANCELLED') NOT NULL, FOREIGN KEY(member_id) REFERENCES member(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE fee_setting (fee_type ENUM('ANNUAL','MONTHLY') PRIMARY KEY, amount INT UNSIGNED NOT NULL, CHECK(amount>0 AND amount<=100000000)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO fee_setting VALUES ('ANNUAL',100000),('MONTHLY',50000);
CREATE TABLE payment (
 id CHAR(36) PRIMARY KEY, member_id CHAR(36) NOT NULL, fee_type ENUM('ANNUAL','MONTHLY') NOT NULL,
 amount INT UNSIGNED NOT NULL, method ENUM('Cash','GCash','Other') NOT NULL, payment_date DATE NOT NULL,
 recorded_by CHAR(36) NOT NULL, created_at VARCHAR(30) NOT NULL, idempotency_key CHAR(36) NOT NULL UNIQUE,
 request_hash CHAR(64) NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL,
 FOREIGN KEY(member_id) REFERENCES member(id), FOREIGN KEY(recorded_by) REFERENCES user_account(id),
 INDEX(payment_date,fee_type), INDEX(member_id), CHECK(amount>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE check_in_log (
 id CHAR(36) PRIMARY KEY, member_id CHAR(36), scanner_id CHAR(36) NOT NULL, scanned_at VARCHAR(30) NOT NULL,
 result ENUM('APPROVED','DENIED') NOT NULL, reason VARCHAR(200), renewal ENUM('ANNUAL','MONTHLY'),
 FOREIGN KEY(member_id) REFERENCES member(id), FOREIGN KEY(scanner_id) REFERENCES user_account(id),
 INDEX(scanned_at), INDEX(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE activity_log (
 seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
 id CHAR(36) PRIMARY KEY, actor_id CHAR(36), actor_name VARCHAR(100) NOT NULL, actor_role VARCHAR(10),
 member_id CHAR(36), payment_id CHAR(36), annual_id CHAR(36), monthly_id CHAR(36),
 event_type VARCHAR(60) NOT NULL, description TEXT NOT NULL,
 outcome ENUM('Success','Completed','Pending','Failed','Info') NOT NULL, reason VARCHAR(500), created_at VARCHAR(30) NOT NULL,
 FOREIGN KEY(actor_id) REFERENCES user_account(id), FOREIGN KEY(member_id) REFERENCES member(id),
 FOREIGN KEY(payment_id) REFERENCES payment(id), FOREIGN KEY(annual_id) REFERENCES annual_membership(id),
 FOREIGN KEY(monthly_id) REFERENCES monthly_access(id), INDEX(created_at,event_type), INDEX(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE app_setting (setting_key VARCHAR(80) PRIMARY KEY, value MEDIUMTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE interaction_receipt (id CHAR(36) PRIMARY KEY, actor_id CHAR(36) NOT NULL, FOREIGN KEY(actor_id) REFERENCES user_account(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE member_photo (member_id CHAR(36) PRIMARY KEY, image MEDIUMTEXT NOT NULL, version CHAR(36) NOT NULL, FOREIGN KEY(member_id) REFERENCES member(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE account_photo (user_id CHAR(36) PRIMARY KEY, image MEDIUMTEXT NOT NULL, version CHAR(36) NOT NULL, FOREIGN KEY(user_id) REFERENCES user_account(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

