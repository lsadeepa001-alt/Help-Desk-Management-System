-- ============================================================================
-- University Help Desk System Database Schema
-- Database: helpdesk_db
-- Target Engine: MySQL 8.0+
-- Compatible with: Spring Boot (JPA / Hibernate) & React Frontend
-- ============================================================================

CREATE DATABASE IF NOT EXISTS helpdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE helpdesk_db;

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- Stores all university members (Students, Lecturers/Faculty, IT Support, Admins)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Stored as BCrypt hash in Spring Boot
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT', -- Supported: STUDENT, LECTURER, SUPPORT_AGENT, TEAM_LEAD, KNOWLEDGE_MANAGER, SYSTEM_ADMINISTRATOR, MANAGER_EXECUTIVE
    department VARCHAR(100) DEFAULT NULL, -- e.g., 'Faculty of Computing', 'Library', 'Registrar'
    phone_number VARCHAR(20) DEFAULT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Categories Table
-- Ticket classification categories for university IT services
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Tickets Table
-- Primary helpdesk tickets submitted by students/staff/faculty
-- ----------------------------------------------------------------------------
CREATE TABLE tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE, -- e.g., 'TICK-2026-0001'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT DEFAULT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_by BIGINT NOT NULL,
    assigned_to BIGINT DEFAULT NULL,
    location VARCHAR(100) DEFAULT NULL, -- e.g., 'Computer Lab 03', 'Main Library Floor 2'
    resolution_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tickets_number (ticket_number),
    INDEX idx_tickets_status (status),
    INDEX idx_tickets_priority (priority),
    INDEX idx_tickets_created_by (created_by),
    INDEX idx_tickets_assigned_to (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Ticket Comments / Updates Table
-- Allows communication between users and IT support on specific tickets
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Internal notes visible only to IT staff
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Ticket Attachments Table
-- Secure file storage metadata for screenshots, logs, documents, and reports
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_attachments_ticket (ticket_id),
    INDEX idx_attachments_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Seed Sample Data for Testing & Initial Setup (Strict Proposal Roles)
-- ============================================================================

-- Seed Categories
INSERT INTO categories (name, description) VALUES
('Network & Wi-Fi', 'Issues related to campus Wi-Fi, Ethernet connection, VPN access'),
('LMS & Student Portal', 'Moodle LMS, Student Registration System, Grade Portal issues'),
('Hardware & Lab Equipment', 'Desktop PCs, projectors, lab printers, monitors'),
('Software & Licensing', 'Software installation, MATLAB, SPSS, Office 365 license requests'),
('Account & Security', 'Password resets, 2FA, unauthorized access, email access');

-- Seed Users (All 7 concrete proposal roles seeded)
INSERT INTO users (username, password, email, full_name, role, department, phone_number) VALUES
('admin', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'admin@university.edu', 'System Administrator', 'SYSTEM_ADMINISTRATOR', 'IT Operations', '+1-555-0100'),
('agent', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'agent@university.edu', 'Support Agent', 'SUPPORT_AGENT', 'IT Help Desk', '+1-555-0101'),
('lead', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'lead@university.edu', 'Support Team Lead', 'TEAM_LEAD', 'IT Help Desk', '+1-555-0103'),
('km', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'km@university.edu', 'Knowledge Manager', 'KNOWLEDGE_MANAGER', 'Library & KB', '+1-555-0104'),
('manager', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'manager@university.edu', 'Executive Manager', 'MANAGER_EXECUTIVE', 'Management', '+1-555-0105'),
('prof_smith', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'smith@university.edu', 'Prof. Robert Smith', 'LECTURER', 'Faculty of Computing', '+1-555-0201'),
('std_kamal', '$2a$10$e8W/hB6u7gJt2aX9yD3Q.O4Zk/X7q1V3q6E.Z.Z9a0b1c2d3e4f5', 'kamal.p@student.university.edu', 'Kamal Perera', 'STUDENT', 'Software Engineering', '+1-555-0301');

-- Seed Sample Tickets
INSERT INTO tickets (ticket_number, title, description, category_id, priority, status, created_by, assigned_to, location) VALUES
('TICK-2026-0001', 'Unable to connect to Campus Wi-Fi in Main Library', 'My laptop cannot authenticate to Uni-Secure-WiFi on 2nd floor library.', 1, 'HIGH', 'IN_PROGRESS', 7, 2, 'Library 2nd Floor'),
('TICK-2026-0002', 'Lab 04 Projector Screen Flickering', 'The HDMI connection to the projector in Lab 04 keeps cutting out during lectures.', 3, 'MEDIUM', 'OPEN', 6, NULL, 'Building B - Lab 04'),
('TICK-2026-0003', 'MATLAB License Renewal Required', 'Please renew the student license for MATLAB 2025b for Machine Learning course.', 4, 'LOW', 'RESOLVED', 7, 2, 'Online Request');

-- Seed Ticket Comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal) VALUES
(1, 2, 'Hi Kamal, we are checking the access point logs for Library 2nd Floor.', FALSE),
(1, 7, 'Thank you! The issue is specifically happening between 10 AM and 12 PM.', FALSE),
(1, 2, 'Investigated AP-LIB-02; reconfigured DHCP scope limit.', TRUE);

-- ============================================================================
-- Migration Statements for Existing Environments
-- ============================================================================
-- Execute these statements if updating an existing deployment with legacy roles:
-- UPDATE users SET role = 'SYSTEM_ADMINISTRATOR' WHERE role = 'ADMIN';
-- UPDATE users SET role = 'MANAGER_EXECUTIVE' WHERE role = 'DEPARTMENT_MANAGER';