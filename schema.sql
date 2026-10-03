-- ============================================================================
-- UniAssist 360 - University Help Desk Management System
-- Pristine Reference Database Schema (DDL)
-- Target Database: helpdesk_db (MySQL 8.0+ / utf8mb4)
-- Matches all 13 JPA Entities in com.university.helpdesk.model
-- (Reference schema for documentation and deployment - do not execute on live data)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS helpdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE helpdesk_db;

-- ----------------------------------------------------------------------------
-- Drop existing tables in reverse dependency order
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS analytics_insights;
DROP TABLE IF EXISTS agent_activity_logs;
DROP TABLE IF EXISTS ticket_assignment_history;
DROP TABLE IF EXISTS user_notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS kb_articles;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;

-- ----------------------------------------------------------------------------
-- 1. Users Table (Entity: User)
-- Roles: STUDENT, LECTURER, SUPPORT_AGENT, TEAM_LEAD, KNOWLEDGE_MANAGER,
--        SYSTEM_ADMINISTRATOR, MANAGER_EXECUTIVE
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    department VARCHAR(100) DEFAULT NULL,
    phone_number VARCHAR(20) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Password Reset Tokens Table (Entity: PasswordResetToken)
-- ----------------------------------------------------------------------------
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
-- 3. Categories Table (Entity: Category)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categories_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Tickets Table (Entity: Ticket)
-- Statuses: OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED, CANCELLED, REJECTED
-- Priorities: LOW, MEDIUM, HIGH, URGENT, CRITICAL
-- Technical Departments: IT, Maintenance, Security
-- ----------------------------------------------------------------------------
CREATE TABLE tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT DEFAULT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_by BIGINT NOT NULL,
    assigned_to BIGINT DEFAULT NULL,
    location VARCHAR(100) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
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
    INDEX idx_tickets_assigned_to (assigned_to),
    INDEX idx_tickets_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Ticket Comments Table (Entity: TicketComment)
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Ticket Attachments Table (Entity: TicketAttachment)
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_attachments_ticket (ticket_id),
    INDEX idx_attachments_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Feedback / CSAT Table (Entity: Feedback)
-- ----------------------------------------------------------------------------
CREATE TABLE feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    submitted_by BIGINT NOT NULL,
    rating INT NOT NULL,
    comments TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_feedback_ticket (ticket_id),
    INDEX idx_feedback_submitted_by (submitted_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Knowledge Base Articles Table (Entity: KnowledgeBaseArticle)
-- Categories: IT, MAINTENANCE, SECURITY
-- ----------------------------------------------------------------------------
CREATE TABLE kb_articles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'IT',
    keywords VARCHAR(255) DEFAULT NULL,
    view_count INT NOT NULL DEFAULT 0,
    is_faq BOOLEAN NOT NULL DEFAULT FALSE,
    author_id BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_kb_articles_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_kb_articles_category (category),
    INDEX idx_kb_articles_faq (is_faq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Notifications Table (Entity: Notification)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_ticket_id BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. User Notification Preferences Table (Entity: UserNotificationPreferences)
-- ----------------------------------------------------------------------------
CREATE TABLE user_notification_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ticket_created_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ticket_assigned_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status_updated_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    new_comment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    csat_request_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_notif_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_pref_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Ticket Assignment History Table (Entity: TicketAssignmentHistory)
-- Actions: CLAIM, ASSIGN, REASSIGN, ROUTE
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_assignment_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    previous_agent_id BIGINT DEFAULT NULL,
    new_agent_id BIGINT DEFAULT NULL,
    previous_department VARCHAR(100) DEFAULT NULL,
    new_department VARCHAR(100) DEFAULT NULL,
    changed_by_id BIGINT DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tah_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_tah_prev_agent FOREIGN KEY (previous_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tah_new_agent FOREIGN KEY (new_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tah_changed_by FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tah_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Agent Activity Logs Table (Entity: AgentActivityLog)
-- Actions: CLAIM, ASSIGN, REASSIGN, STATUS_CHANGE, COMMENT, ROUTE, CANCEL, REOPEN
-- ----------------------------------------------------------------------------
CREATE TABLE agent_activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    actor_id BIGINT DEFAULT NULL,
    actor_name VARCHAR(150) DEFAULT NULL,
    actor_role VARCHAR(50) DEFAULT NULL,
    actor_department VARCHAR(100) DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    details VARCHAR(1000) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aal_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_aal_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_aal_ticket (ticket_id),
    INDEX idx_aal_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Analytics Insights Table (Entity: AnalyticsInsight)
-- ----------------------------------------------------------------------------
CREATE TABLE analytics_insights (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(150) DEFAULT NULL,
    author_role VARCHAR(50) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    title VARCHAR(200) DEFAULT NULL,
    content VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_author (author_id),
    INDEX idx_ai_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Required Reference / Seed Data
-- ============================================================================
INSERT INTO categories (name, department, description) VALUES
-- IT Department Categories
('Network & Wi-Fi', 'IT', 'Issues related to campus Wi-Fi, Ethernet connection, VPN access'),
('LMS & Student Portal', 'IT', 'LMS, registration, and grade portal issues'),
('Hardware & Lab Equipment', 'IT', 'Desktop PCs, projectors, lab printers, and monitors'),
('Software & Licensing', 'IT', 'Software installation and academic licensing requests'),
('Account & Security', 'IT', 'Password resets, multi-factor authentication, and account access'),
-- Maintenance Department Categories
('Air Conditioning & HVAC', 'Maintenance', 'Climate control, heating, cooling, and ventilation repairs'),
('Electrical & Lighting', 'Maintenance', 'Power outlets, classroom lighting, and electrical maintenance'),
('Plumbing & Water Facilities', 'Maintenance', 'Restroom fixtures, leaks, drainage, and water supply issues'),
('Classroom Furniture & Fixtures', 'Maintenance', 'Desks, chairs, whiteboards, and auditorium seating repairs'),
('Building Maintenance & Cleaning', 'Maintenance', 'Structural upkeep, door hardware, windows, and custodial requests'),
-- Security Department Categories
('Campus Access & Keycard', 'Security', 'Electronic access control, student/staff badges, and gate permissions'),
('Lost & Found Property', 'Security', 'Inquiries and reports regarding missing or recovered personal belongings'),
('Parking & Vehicle Pass', 'Security', 'Vehicle permits, parking zone inquiries, and traffic safety concerns'),
('Emergency & Incident Reporting', 'Security', 'Immediate safety incidents, urgent alerts, and hazard reports'),
('Surveillance & Safety Concern', 'Security', 'CCTV inquiries, physical safety hazards, and security escort requests');
