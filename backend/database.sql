-- ============================================================
-- EduAttend — Complete Database Schema (Single File)
-- Run ONCE: mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS eduattend
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eduattend;

-- ─── 1. SUPER ADMIN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admin (
  id         INT          PRIMARY KEY AUTO_INCREMENT,
  login_id   VARCHAR(50)  UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150),
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── 2. INSTITUTES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutes (
  id             INT          PRIMARY KEY AUTO_INCREMENT,
  code           VARCHAR(20)  UNIQUE NOT NULL,
  name           VARCHAR(200) NOT NULL,
  city           VARCHAR(100),
  state          VARCHAR(100),
  email          VARCHAR(150),
  phone          VARCHAR(15),
  contact_person VARCHAR(150),
  plan           ENUM('Basic','Standard','Premium') DEFAULT 'Standard',
  status         ENUM('Active','Suspended','Expired')  DEFAULT 'Active',
  login_id       VARCHAR(50)  UNIQUE NOT NULL,
  password       VARCHAR(255) NOT NULL,
  join_date      DATE         NOT NULL,
  expiry_date    DATE         NOT NULL,
  students_count INT          DEFAULT 0,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 3. BATCHES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id           INT         PRIMARY KEY AUTO_INCREMENT,
  institute_id INT         NOT NULL,
  name         VARCHAR(150) NOT NULL,
  class        ENUM('8','9','10','11','12') NOT NULL,
  board        ENUM('CBSE','State') NOT NULL DEFAULT 'CBSE',
  stream       ENUM('NEET','JEE','Board','Both','') DEFAULT '',
  timing       VARCHAR(50),
  created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

-- ─── 4. STUDENTS ──────────────────────────────────────────────
-- student_login_id  : auto-generated at registration (e.g. STU-001-BFA)
-- student_password  : bcrypt of "123456" (default), must change on first login
-- is_active         : institute can disable student access
-- must_change_pass  : TRUE on creation, FALSE after student sets own password
CREATE TABLE IF NOT EXISTS students (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  institute_id      INT          NOT NULL,
  batch_id          INT,
  name              VARCHAR(150) NOT NULL,
  aadhar            VARCHAR(20),
  class             ENUM('8','9','10','11','12') NOT NULL,
  board             ENUM('CBSE','State') DEFAULT 'CBSE',
  stream            ENUM('NEET','JEE','Board','Both','') DEFAULT '',
  parent_name       VARCHAR(150) NOT NULL,
  parent_phone      VARCHAR(15)  NOT NULL,
  parent_email      VARCHAR(150),
  student_login_id  VARCHAR(30)  UNIQUE,
  student_password  VARCHAR(255),
  is_active         BOOLEAN      DEFAULT TRUE,
  must_change_pass  BOOLEAN      DEFAULT TRUE,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES batches(id)    ON DELETE SET NULL
);

CREATE INDEX idx_students_login ON students(student_login_id);

-- ─── 5. ATTENDANCE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id             INT  PRIMARY KEY AUTO_INCREMENT,
  institute_id   INT  NOT NULL,
  batch_id       INT  NOT NULL,
  student_id     INT  NOT NULL,
  date           DATE NOT NULL,
  status         ENUM('P','A','L') NOT NULL,
  submitted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resubmitted_at TIMESTAMP NULL,
  UNIQUE KEY unique_att (batch_id, student_id, date),
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES batches(id)    ON DELETE CASCADE,
  FOREIGN KEY (student_id)   REFERENCES students(id)   ON DELETE CASCADE
);

-- ─── 6. ATTENDANCE SUBMISSIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_submissions (
  id             INT     PRIMARY KEY AUTO_INCREMENT,
  institute_id   INT     NOT NULL,
  batch_id       INT     NOT NULL,
  date           DATE    NOT NULL,
  submitted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resubmitted_at TIMESTAMP NULL,
  is_resubmitted BOOLEAN   DEFAULT FALSE,
  UNIQUE KEY unique_sub (batch_id, date),
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES batches(id)    ON DELETE CASCADE
);

-- ─── 7. TESTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
  id           INT           PRIMARY KEY AUTO_INCREMENT,
  institute_id INT           NOT NULL,
  batch_id     INT           NULL,
  title        VARCHAR(200)  NOT NULL,
  subject      VARCHAR(100)  NOT NULL,
  test_date    DATE          NOT NULL,
  total_marks  DECIMAL(6,2)  NOT NULL DEFAULT 100,
  description  TEXT,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES batches(id)    ON DELETE SET NULL
);

-- ─── 8. TEST RESULTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_results (
  id           INT          PRIMARY KEY AUTO_INCREMENT,
  test_id      INT          NOT NULL,
  student_id   INT          NOT NULL,
  institute_id INT          NOT NULL,
  marks_scored DECIMAL(6,2) NOT NULL,
  grade        VARCHAR(5),
  remarks      VARCHAR(255),
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_result (test_id, student_id),
  FOREIGN KEY (test_id)      REFERENCES tests(id)      ON DELETE CASCADE,
  FOREIGN KEY (student_id)   REFERENCES students(id)   ON DELETE CASCADE,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

-- ─── 9. MESSAGE LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_logs (
  id               INT     PRIMARY KEY AUTO_INCREMENT,
  institute_id     INT     NOT NULL,
  type             ENUM('test','ptm','holiday','custom','absentee','credentials') NOT NULL,
  subject          VARCHAR(255) NOT NULL,
  message          TEXT    NOT NULL,
  batch_id         INT,
  recipients_count INT     DEFAULT 0,
  sent_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES batches(id)    ON DELETE SET NULL
);

-- ─── 10. MESSAGE DELIVERIES (Twilio metadata per recipient) ──
CREATE TABLE IF NOT EXISTS message_deliveries (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  message_log_id  INT NOT NULL,
  student_id      INT NULL,
  parent_phone    VARCHAR(20) NULL,
  primary_channel ENUM('whatsapp','sms') NOT NULL DEFAULT 'whatsapp',
  used_channel    ENUM('whatsapp','sms') NULL,
  twilio_sid      VARCHAR(64) NULL,
  status          ENUM('sent','failed') NOT NULL,
  error_message   VARCHAR(500) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_log_id) REFERENCES message_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE INDEX idx_message_deliveries_log ON message_deliveries(message_log_id);
CREATE INDEX idx_message_deliveries_sid ON message_deliveries(twilio_sid);

-- ─── 11. ACTIVITY LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id             INT          PRIMARY KEY AUTO_INCREMENT,
  action         VARCHAR(255) NOT NULL,
  institute_name VARCHAR(200),
  performed_by   VARCHAR(100) DEFAULT 'Super Admin',
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- Run after setup: node backend/scripts/seed-passwords.js
-- That script generates correct bcrypt hashes and updates DB
-- ============================================================

-- Super Admin (login_id=superadmin, password=Admin@2024)
INSERT IGNORE INTO super_admin (login_id, password, name, email) VALUES (
  'superadmin',
  '$2a$10$PLACEHOLDER_RUN_SEED_SCRIPT',
  'Super Admin',
  'superadmin@eduattend.in'
);

-- Sample Institute 1 (login_id=BFA2024001, password=Bfa@7842)
INSERT IGNORE INTO institutes
  (code, name, city, state, email, phone, contact_person, plan, status, login_id, password, join_date, expiry_date)
VALUES (
  'BFA2024001', 'Bright Future Academy', 'Pune', 'Maharashtra',
  'admin@bfa.edu', '9876543210', 'Dr. Ramesh Joshi',
  'Premium', 'Active', 'BFA2024001',
  '$2a$10$PLACEHOLDER_RUN_SEED_SCRIPT',
  '2024-01-15', '2026-01-15'
);

-- Sample Institute 2 (login_id=VMH2024002, password=Vmh@3361)
INSERT IGNORE INTO institutes
  (code, name, city, state, email, phone, contact_person, plan, status, login_id, password, join_date, expiry_date)
VALUES (
  'VMH2024002', 'Vidya Mandir High School', 'Mumbai', 'Maharashtra',
  'principal@vidyamandir.in', '9123456789', 'Mrs. Sunita Patil',
  'Basic', 'Active', 'VMH2024002',
  '$2a$10$PLACEHOLDER_RUN_SEED_SCRIPT',
  '2024-03-22', '2026-03-22'
);

-- ============================================================
-- IMPORTANT: After running this file, run:
--   node backend/scripts/seed-passwords.js
-- to set correct bcrypt passwords for all seed accounts.
-- ============================================================

SELECT 'EduAttend database setup complete! Now run: node backend/scripts/seed-passwords.js' AS Next_Step;
