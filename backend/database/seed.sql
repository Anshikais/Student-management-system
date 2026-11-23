-- Seed Data for Joineazy
-- Users: Admin and Students
INSERT INTO users (name, email, student_id, password_hash, role) VALUES
('Professor Alan Turing', 'admin@joineazy.edu', NULL, '$2a$10$tRN.21SFAXdkppG4m/cDHOSWe39phD63T1T1SpixHaUBU.XeLE6C.', 'admin'),
('Sarah Connor', 'leader@joineazy.edu', 'STU-1001', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student'),
('John Doe', 'john@joineazy.edu', 'STU-1002', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student'),
('Alice Smith', 'alice@joineazy.edu', 'STU-1003', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student'),
('Bob Dylan', 'bob@joineazy.edu', 'STU-1004', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student'),
('Charlie Brown', 'charlie@joineazy.edu', 'STU-1005', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student'),
('Emma Watson', 'emma@joineazy.edu', 'STU-1006', '$2a$10$EUyjeiF8M6ibQploUOZRhuMWpoXxykrcvltvckd.8GzWBA7gH3JhG', 'student');

-- Groups
INSERT INTO groups (name, group_code, leader_id) VALUES
('Alpha Innovators', 'ALPHA-2026', 2),
('Beta Developers', 'BETA-2026', 5);

-- Group Members
INSERT INTO group_members (group_id, user_id) VALUES
(1, 2),
(1, 3),
(1, 4),
(2, 5),
(2, 6);

-- Assignments
INSERT INTO assignments (title, description, due_date, onedrive_link, created_by) VALUES
('Milestone 1: Architecture & Requirements Specification', 'Submit comprehensive software requirements specification (SRS) and architecture diagram for the distributed dashboard system.', NOW() + INTERVAL '30 days', 'https://1drv.ms/u/s!AmxYzJoineazyAssignment1DocFolder', 1),
('Sprint 1: Core Database & REST API Implementation', 'Implement relational PostgreSQL schema, authentication endpoints, and core CRUD routes. Include Postman collection or automated test scripts in the shared OneDrive folder.', NOW() + INTERVAL '14 days', 'https://1drv.ms/u/s!AmxYzJoineazySprint1ApiFolder', 1),
('Advanced System Design Challenge (Honors Track)', 'Design a high-throughput caching and load balancing mechanism. Submit architecture whitepaper and benchmark results to the designated OneDrive folder.', NOW() + INTERVAL '7 days', 'https://1drv.ms/u/s!AmxYzJoineazyHonorsSystemDesign', 1),
('Ethics & Security in Software Engineering (Module 0)', 'Reflect on cybersecurity principles, OWASP Top 10 vulnerabilities, and ethical AI deployment. Upload 3-page summary essay.', NOW() - INTERVAL '7 days', 'https://1drv.ms/u/s!AmxYzJoineazyEthicsPaperFolder', 1);

-- Assignment Groups
-- Assignment 1 is allocated to ALL students (group_id = NULL)
-- Assignment 2 is allocated to Group 1 and Group 2
-- Assignment 3 is allocated only to Group 1
-- Assignment 4 is allocated to ALL students (group_id = NULL)
INSERT INTO assignment_groups (assignment_id, group_id) VALUES
(1, NULL),
(2, 1),
(2, 2),
(3, 1),
(4, NULL);

-- Submissions
-- Group 1 submitted Assignment 4 (confirmed by Sarah Connor)
-- Group 2 submitted Assignment 4 (confirmed by Bob Dylan)
-- Group 1 submitted Assignment 2 (confirmed by Sarah Connor)
INSERT INTO submissions (assignment_id, group_id, confirmed_by, confirmed_at) VALUES
(4, 1, 2, NOW() - INTERVAL '8 days'),
(4, 2, 5, NOW() - INTERVAL '8 days'),
(2, 1, 2, NOW() - INTERVAL '1 day');