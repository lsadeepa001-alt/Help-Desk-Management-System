# 🎓 UniAssist 360 - University Help Desk Management System

A full-stack, enterprise-grade web-based help desk management system designed for the university community across **IT**, **Maintenance**, and **Security** operational departments. Built with **Spring Boot 3.2** (Java 17) and **React 19** (Vite + Tailwind CSS), compliant with the KU-09 SE2030 specification.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Spring Boot 3.2, Spring Security 6, Spring Data JPA / Hibernate, JWT (jjwt 0.12.5) |
| **Frontend** | React 19, Vite, Tailwind CSS 4, Axios, Lucide React |
| **Database** | MySQL 8.0+ (InnoDB, UTF-8 / utf8mb4) |
| **Email / SMTP** | Spring Mail (JavaMailSender) supporting Gmail, Outlook, SendGrid |
| **AI Assistant** | Google Gemini API (optional — automatically falls back to grounded local KB) |

---

## 👥 7 Authorized System Roles

| Role | Scope & Key Capabilities |
|---|---|
| **Student** (`STUDENT`) | Public registration; ticket submission with attachments; ticket tracking; confirmation & CSAT rating; Knowledge Base & AI Chatbot access. |
| **Lecturer** (`LECTURER`) | Public registration with faculty identity; ticket submission; resolution verification; CSAT rating; Knowledge Base & AI Chatbot access. |
| **Support Agent** (`SUPPORT_AGENT`) | Assigned to a technical department (**IT**, **Maintenance**, or **Security**); claims tickets; provides comments; resolves tickets with mandatory notes. |
| **Team Lead / Supervisor** (`TEAM_LEAD`) | Department operational supervisor; assigns & reassigns queue tickets to agents; manages department tickets and team analytics. |
| **Knowledge Manager** (`KNOWLEDGE_MANAGER`) | Authors, reviews, updates, and publishes Knowledge Base articles and FAQs across IT, Maintenance, and Security categories. |
| **System Administrator** (`SYSTEM_ADMINISTRATOR`) | User provisioning; administrative user updates; status toggling (active/suspended); system-wide audit oversight and configuration. Protected against administrative self-targeting. |
| **Manager / Executive** (`MANAGER_EXECUTIVE`) | High-level executive visibility across all departments; SLA metrics; trend analysis; AI insights; executive CSV report export. |

---

## 🏢 3 Operational Technical Departments & 15 Active Categories

The system features dynamic multi-department routing across three operational service units:

1. **IT Services (`IT`)**
   - Network & Wi-Fi
   - LMS & Student Portal
   - Hardware & Lab Equipment
   - Software & Licensing
   - Account & Security

2. **Campus Maintenance (`Maintenance`)**
   - Air Conditioning & HVAC
   - Electrical & Lighting
   - Plumbing & Water Facilities
   - Classroom Furniture & Fixtures
   - Building Maintenance & Cleaning

3. **Campus Security (`Security`)**
   - Campus Access & Keycard
   - Lost & Found Property
   - Parking & Vehicle Pass
   - Emergency & Incident Reporting
   - Surveillance & Safety Concern

---

## 🧩 6 Core Proposal Modules

1. **Module 1: User Authentication & Role-Based Access Control (RBAC)**
   - Stateless JWT authentication with token version invalidation on credential or role change.
   - Public self-registration for Students and Lecturers (no operational department assigned).
   - Self-service password reset via time-limited, single-use SHA-256 hashed tokens delivered securely via SMTP email.
   - Authoritative user self-profile updates (personal phone contact) and administrative user management with self-targeting protection.

2. **Module 2: Ticket Management Lifecycle**
   - Multi-category submission with dynamic department routing and optional room/location fields.
   - File attachment support (PDF, PNG, JPG, JPEG up to 10MB) with MIME validation.
   - Ticket assignment lifecycle: Self-claim by Support Agents; queue assign/reassign by Team Leads and System Administrators.
   - Mandatory resolution notes required for ticket resolution.
   - End-user resolution verification: Confirm resolution to close, or reopen with mandatory rationale.
   - Customer Satisfaction (CSAT) 1–5 star rating and feedback upon resolution.

3. **Module 3: Knowledge Base & FAQ Engine**
   - Searchable, categorized repository of solutions across IT, Maintenance, and Security.
   - Public and authenticated access with keyword filtering, view count incrementing, and FAQ tagging.
   - Knowledge Manager authoring and curation.

4. **Module 4: AI-Powered Chatbot & Support Assistant**
   - Natural language support assistant powered by Google Gemini API.
   - Grounded in local Knowledge Base articles with seamless local heuristic fallback when Gemini API is unconfigured or unavailable.

5. **Module 5: Communication & Notification Hub**
   - Real-time in-app notification center with read/unread tracking.
   - Notification events across ticket creation, assignment, status update, resolution, and comments.
   - Granular user delivery preferences (in-app toggles and optional SMTP email alerts).

6. **Module 6: Reporting & Analytics Dashboard**
   - Real-time KPI summaries: Total tickets, open, in-progress, resolved, closed, and SLA compliance rate.
   - Department breakdown, priority distribution, and agent performance metrics.
   - AI-driven qualitative performance insight generation and CSV data export for management reporting.

---

## ⚙️ Prerequisites

Before running the project, verify that your environment has:

1. **Java 17** or later — [Download Adoptium OpenJDK](https://adoptium.net)
2. **Node.js 18+** and npm — [Download Node.js](https://nodejs.org)
3. **MySQL 8.0+** server running on `localhost:3306` — [Download MySQL](https://dev.mysql.com/downloads/)

> **Note:** Maven Wrapper (`mvnw` / `mvnw.cmd`) is included in `BackEnd/`. A global Maven installation is not required.

---

## 🚀 Quick Start (1-Click)

### Windows
```cmd
start_project.bat
```
Double-click `start_project.bat` or run it from Command Prompt / PowerShell. It will:
- Verify Java and Node.js prerequisites
- Install npm packages if `node_modules` is not present
- Launch the Spring Boot Backend on port `8080`
- Launch the Vite React Frontend on port `5173`

### macOS / Linux
```bash
chmod +x start_project.sh
./start_project.sh
```

---

## 🔧 Manual Setup

### 1. Database
Ensure MySQL is running on `localhost:3306`. The schema and default tables are initialized automatically via Hibernate and `DataSeeder.java`.

To configure database credentials, set environment variables or edit your local `.env`:
```bash
# Windows (PowerShell)
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your_password"

# macOS / Linux
export DB_USERNAME="root"
export DB_PASSWORD="your_password"
```

### 2. Backend
```bash
cd BackEnd
./mvnw spring-boot:run        # macOS / Linux
mvnw.cmd spring-boot:run      # Windows
```
The Backend API will be available at: **`http://localhost:8080/api`**

### 3. Frontend
```bash
cd FrontEnd
npm install                   # First time only
npm run dev
```
The Frontend UI will be available at: **`http://localhost:5173`**

---

## 🔑 Initial Bootstrap Administrator & Provisioning Model

To ensure security compliance, the system operates on a clean bootstrap model via `DataSeeder.java`:

- **Master Category Seeding:** Automatically creates and aligns all 15 operational categories partitioned across IT, Maintenance, and Security.
- **Bootstrap Administrator:** If no `SYSTEM_ADMINISTRATOR` exists, `DataSeeder` provisions the initial administrator account:
  - **Username:** `admin` (or configured via `${app.bootstrap-admin.username}`)
  - **Email:** `admin@localhost` (or configured via `${app.bootstrap-admin.email}`)
  - **Password:** Configured via `app.bootstrap-admin.password` in `application.properties` (meets strict 8+ character complexity rules)
- **Role Provisioning:** Operational staff (`SUPPORT_AGENT`, `TEAM_LEAD`, `KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`) and test accounts are provisioned securely via the Administrative Portal (`/users`) by the System Administrator.
- **Self-Service Registration:** University Students and Lecturers register themselves directly via the public self-registration page.



## 🏛️ Architectural Patterns & Design Mapping

UniAssist 360 is built according to professional enterprise software engineering design patterns:

1. **Layered (N-Tier) Architecture:**
   - **Presentation Layer:** React 19 Single Page Application (SPA) with role-tailored dashboards and secure Axios interceptors.
   - **API Controller Layer:** Spring Boot `@RestController` classes handling HTTP requests, request deserialization, and HTTP response codes.
   - **Service Layer:** Transactional business logic, status state-machine transitions, SLA computations, and cross-cutting security checks.
   - **Persistence / Data Access Layer:** Spring Data JPA repositories interfacing with MySQL via Hibernate ORM.
   - **Database Layer:** Normalized relational MySQL schema enforcing relational constraints, foreign keys, cascades, and indexes.

2. **Repository Pattern:**
   - All database access is encapsulated within Spring Data JPA repositories (`TicketRepository`, `UserRepository`, `CategoryRepository`, `TicketCommentRepository`, etc.), decoupling business logic from underlying query mechanisms.

3. **Data Transfer Object (DTO) Pattern:**
   - Explicit DTOs (`TicketRequest`, `UserRegistrationDto`, `AssignmentHistoryDTO`, `FeedbackDTO`, `ChangePasswordDto`) decouple REST endpoints from persistence entities. This protects internal database fields (e.g. `tokenVersion`, `passwordHash`) against mass assignment vulnerabilities.

4. **Service Layer Pattern:**
   - Specialized service classes (`TicketService`, `UserService`, `AnalyticsService`, `AttachmentService`, `NotificationService`, `GeminiAiService`) isolate complex workflows, audit trails, and validation rules from web controllers.

5. **Strategy & Dynamic Fallback Pattern:**
   - The virtual assistant subsystem (`GeminiAiService`) executes a dynamic resolution strategy: querying the external Google Gemini Generative AI model when configured with an active API key, and falling back gracefully to the local keyword Knowledge Base search engine when offline.

6. **Observer / Event Notification Pattern:**
   - `NotificationService` acts as an event dispatcher triggered across ticket lifecycle events (ticket created, assigned/reassigned, status changed, resolution requested, feedback submitted), asynchronously creating in-app alerts and dispatching transactional emails when SMTP is enabled.

---

## 📧 SMTP & Email Delivery Configuration (Optional)

The application supports SMTP email delivery for self-service password reset requests and ticket lifecycle notifications.

### Setup Instructions

1. Copy the template:
   ```bash
   cp .env.example .env
   ```
2. Configure credentials in `.env`:
   ```properties
   EMAIL_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-account@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=your-account@gmail.com
   FRONTEND_URL=http://localhost:5173
   ```
   > ⚠️ **Security Rules:**
   > - Never commit `.env` or plain-text credentials to Git.
   > - For Gmail, Outlook, or other 2FA providers, generate and use an **App Password**.
3. Restart the Backend. Backend logs will output:
   `[INFO] Email delivery: ENABLED`

---

## 🤖 Google Gemini AI Chatbot (Optional)

To enable external LLM responses for the AI support assistant:
```bash
# Windows (PowerShell)
$env:GEMINI_API_KEY = "your_gemini_api_key"

# macOS / Linux
export GEMINI_API_KEY="your_gemini_api_key"
```
If no key is configured, the assistant automatically uses the local Knowledge Base search engine without errors.

---

## 📁 Project Directory Structure

```
Web-Base-Help-Desk/
├── BackEnd/                         # Spring Boot Application
│   ├── src/main/java/com/university/helpdesk/
│   │   ├── config/                  # AppConfig, DataSeeder, WebConfig
│   │   ├── controller/              # REST Controllers (Auth, Ticket, KB, Users, etc.)
│   │   ├── dto/                     # Request/Response DTOs
│   │   ├── model/                   # 13 JPA Entities
│   │   ├── repository/              # Spring Data JPA Repositories
│   │   ├── security/                # JWT Filter, Token Provider, UserDetails
│   │   └── service/                 # Business Logic Services
│   ├── src/main/resources/          # application.properties
│   ├── src/test/java/               # Comprehensive Automated Test Suite
│   └── pom.xml                      # Maven Build File
├── FrontEnd/                        # React 19 + Vite Application
│   ├── src/
│   │   ├── components/              # Ticket, KB, Agent, Admin, Chatbot UI
│   │   ├── context/                 # AuthContext, NotificationContext, ToastContext
│   │   └── App.jsx                  # Main Navigation, Routing & Shell
│   ├── package.json
│   └── vite.config.js
├── schema.sql                       # Reference DDL Schema (13 Entities, 15 Categories)
├── start_project.bat                # Windows 1-Click Launcher
├── start_project.sh                 # macOS / Linux 1-Click Launcher
├── .env.example                     # Environment Template
├── .gitignore                       # Git Ignore Rules
└── README.md                        # Documentation
```

---

## 🧪 Running Tests

### Backend Unit & Integration Tests
```bash
cd BackEnd
./mvnw test                          # macOS / Linux
mvnw.cmd test                        # Windows
```

### Frontend Build & Lint Verification
```bash
cd FrontEnd
npm run lint                         # ESLint check
npm run build                        # Vite production build
```
