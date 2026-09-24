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
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS password_reset_tokens;
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
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NULL UNIQUE,
    expires_at TIMESTAMP NULL,
    issued_at TIMESTAMP NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_reset_user (user_id),
    INDEX idx_password_reset_expiry (expires_at)
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
-- Required Reference Data
-- ============================================================================

-- Seed Categories
INSERT INTO categories (name, description) VALUES
('Network & Wi-Fi', 'Issues related to campus Wi-Fi, Ethernet connection, VPN access'),
('LMS & Student Portal', 'Moodle LMS, Student Registration System, Grade Portal issues'),
('Hardware & Lab Equipment', 'Desktop PCs, projectors, lab printers, monitors'),
('Software & Licensing', 'Software installation, MATLAB, SPSS, Office 365 license requests'),
('Account & Security', 'Password resets, 2FA, unauthorized access, email access');

-- ============================================================================
-- Migration Statements for Existing Environments
-- ============================================================================
-- Execute these statements if updating an existing deployment with legacy roles:
-- UPDATE users SET role = 'SYSTEM_ADMINISTRATOR' WHERE role = 'ADMIN';
-- UPDATE users SET role = 'MANAGER_EXECUTIVE' WHERE role = 'DEPARTMENT_MANAGER';
-- ALTER TABLE password_reset_tokens MODIFY token_hash CHAR(64) NULL;
-- ALTER TABLE password_reset_tokens MODIFY expires_at TIMESTAMP NULL;
-- ALTER TABLE password_reset_tokens ADD COLUMN issued_at TIMESTAMP NULL AFTER expires_at;
