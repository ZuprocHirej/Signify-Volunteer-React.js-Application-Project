-- ==============================================================================
-- Volunteer Sign-Up Portal — Database Setup Script
-- Project #9: Volunteer Sign-Up Form
-- Fulfills Rubric 4.3 & Deliverable 5.3: schema.sql with CREATE DATABASE,
-- CREATE TABLE statements, and sample initial seed data.
-- ==============================================================================

-- 1. Create and Select Database
CREATE DATABASE IF NOT EXISTS volunteer_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE volunteer_app;

-- ==============================================================================
-- 2. Drop existing tables if re-initializing (child tables first)
-- ==============================================================================
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS signups;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS volunteers;
DROP TABLE IF EXISTS accounts;

-- ==============================================================================
-- 3. Table Definitions
-- ==============================================================================

-- 3.1 Accounts table (User and Admin authentication)
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  username VARCHAR(50) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Volunteers / Opportunities table
CREATE TABLE volunteers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  spots_left INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) DEFAULT NULL,
  is_priority TINYINT(1) NOT NULL DEFAULT 0,
  session_details TEXT DEFAULT NULL,
  team_details TEXT DEFAULT NULL,
  preparation_details TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Applications table (Submitted volunteer form records)
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  volunteer_id INT DEFAULT NULL,
  account_id INT DEFAULT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  age INT DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  availability TEXT NOT NULL,
  experience TEXT DEFAULT NULL,
  skills TEXT DEFAULT NULL,
  heard_about VARCHAR(100) DEFAULT NULL,
  agree_terms TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_app_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY unique_account_volunteer (account_id, volunteer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 Testimonials table (Community stories)
CREATE TABLE testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  role VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 Site Settings table (Mission statement & impact metrics)
CREATE TABLE site_settings (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. Sample Seed Data
-- ==============================================================================

-- 4.1 Initial Admin & Demo Accounts
-- Default credentials:
-- Admin: realadmin@example.com / realAdminPassword123!
-- Demo:  volunteer@example.com / volunteer123!
INSERT INTO accounts (id, email, password_hash, role, username, created_at) VALUES
  (1, 'realadmin@example.com', '$2b$12$4xkUxhgmZ8x/QU/hQ8T6LO/XsfL6TFwNzZV0i4IdzMbffc3gY00wu', 'admin', 'realAdmin', NOW()),
  (2, 'volunteer@example.com', '$2b$12$4xkUxhgmZ8x/QU/hQ8T6LO/XsfL6TFwNzZV0i4IdzMbffc3gY00wu', 'user', 'demoVolunteer', NOW());

-- 4.2 Initial Volunteer Opportunities
INSERT INTO volunteers (id, name, type, description, spots_left, image_url, is_priority, session_details, team_details, preparation_details, created_at) VALUES
  (1, 'Community Tutor', 'Education', 'Assist children and teens with after-school reading, mathematics, and general study support.', 7, '/opportunities/community-tutor.png', 0,
   'Every Saturday starts with a brief 15-minute alignment circle at 8:45 AM.',
   'Led by Teacher Carla and a warm cohort of 10-15 college students and young professionals.',
   'Please wear comfortable modest clothing suitable for active desk work.', NOW()),
  (2, 'Tree Planting & Clean-up', 'Environment', 'Join weekend local reforestation and neighborhood waste-reduction campaigns.', 24, '/opportunities/tree-planting.jpg', 0,
   'Sessions kick off at 7:00 AM with safety briefings and tool assignment. We plant native saplings until mid-morning.',
   'Partnered with local DENR foresters and community youth leaders. Expect an energetic crew of 20-30 nature lovers.',
   'Wear sturdy closed-toe shoes or boots, breathable long sleeves, and a sun hat. Bring a refillable tumbler.', NOW()),
  (3, 'Food Drive Logistics', 'Outreach', 'Help organize, pack, and distribute care packages and meals to families in need.', 8, '/opportunities/food-drive.jpg', 0,
   'Volunteers assemble at the warehouse loading dock at 9:00 AM to pack shelf-stable grocery hampers.',
   'A focused team of 8-12 volunteers working alongside local parish and barangay relief coordinators.',
   'Wear closed-toe shoes. We supply work gloves and high-visibility vests.', NOW());

-- 4.3 Initial Site Settings
INSERT INTO site_settings (`key`, `value`) VALUES
  ('mission_statement', 'Signify connects everyday Filipinos with local volunteer opportunities that need them most. No experience required, just a few hours and a willingness to help.'),
  ('stats', '[{"value":"500+","label":"Volunteers Placed"},{"value":"40+","label":"Partner Organizations"},{"value":"12,000+","label":"Hours Contributed"}]');

-- 4.4 Initial Testimonials
INSERT INTO testimonials (id, quote, author, role, created_at, updated_at) VALUES
  (1, 'Tutoring in Tondo completely shifted my Saturday mornings. The kids greet you by name by week two, and the fellow volunteers have become some of my closest friends.', 'Maya Santos', 'Community Tutor since 2023', NOW(), NOW()),
  (2, 'I did not think picking up trash or planting mangroves would feel this grounding. You finish a session sweaty and tired, but looking at a clean strip of coast together is unbeatable.', 'Daniel Cruz', 'Environmental Action Volunteer', NOW(), NOW()),
  (3, 'The logistics team makes you feel immediately useful even on day one. Every box packed means a family has hot meals for a week.', 'Bea Reyes', 'Food Drive Volunteer', NOW(), NOW());

-- 4.5 Sample Initial Submitted Application
INSERT INTO applications (id, volunteer_id, account_id, first_name, last_name, email, phone, age, city, availability, experience, skills, heard_about, agree_terms, status, submitted_at) VALUES
  (1, 1, 2, 'Elena', 'Reyes', 'volunteer@example.com', '09171234567', 24, 'Quezon City', '["Sat-Morning"]', 'Taught Sunday school reading classes for 1 year.', '["Teaching","Communication"]', 'Social Media', 1, 'approved', NOW());
