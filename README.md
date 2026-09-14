# 🎓 University Help Desk System

A full-stack web application for managing university IT support tickets, built with **Spring Boot** (Java 17) and **React** (Vite + Tailwind CSS).

## 📦 Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | Spring Boot 3.2, Spring Security, JPA/Hibernate, JWT   |
| Frontend | React 19, Vite 8, Tailwind CSS 4, Axios                |
| Database | MySQL 8+                                                |
| AI       | Google Gemini API (optional — falls back to local KB)   |

## ⚙️ Prerequisites

Before running this project, ensure you have:

1. **Java 17** or later — [Download](https://adoptium.net)
2. **Node.js 18+** and npm — [Download](https://nodejs.org)
3. **MySQL 8+** server running on `localhost:3306` — [Download](https://dev.mysql.com/downloads/)

> **Note:** You do NOT need Maven installed globally. The project includes a Maven Wrapper (`mvnw`).

## 🚀 Quick Start (1-Click)

### Windows
```
start_project.bat
```
Double-click the file or run it from Command Prompt. It will:
- ✅ Check for Java & Node.js
- ✅ Auto-install npm packages if missing
- ✅ Launch Backend (port 8080) and Frontend (port 5173) in separate windows

### macOS / Linux
```bash
chmod +x start_project.sh
./start_project.sh
```

## 🔧 Manual Setup

### 1. Database
Make sure MySQL is running. The database `helpdesk_db` is **auto-created** on first startup.

If your MySQL root password is not empty, set it as an environment variable:
```bash
# Windows (PowerShell)
$env:DB_PASSWORD = "your_password"

# macOS / Linux
export DB_PASSWORD="your_password"
```

### 2. Backend
```bash
cd BackEnd
./mvnw spring-boot:run        # macOS/Linux
mvnw.cmd spring-boot:run      # Windows
```
Backend starts at: **http://localhost:8080/api**

### 3. Frontend
```bash
cd FrontEnd
npm install       # first time only
npm run dev
```
Frontend starts at: **http://localhost:5173**

## 🔑 Default Login Credentials

| Role          | Username  | Password    |
|---------------|-----------|-------------|
| Admin         | admin     | admin123    |
| Support Agent | agent     | agent123    |
| Student       | student   | student123  |

> These accounts are auto-created on first startup when the database is empty.

## 🤖 Gemini AI Chatbot (Optional)

The AI chatbot uses Google Gemini API. To enable it, set your API key:
```bash
# Windows (PowerShell)
$env:GEMINI_API_KEY = "your_gemini_api_key"

# macOS / Linux
export GEMINI_API_KEY="your_gemini_api_key"
```
If no key is set, the chatbot gracefully falls back to the local Knowledge Base engine.

## 📁 Project Structure

```
Web-Base-Help-Desk/
├── BackEnd/                    # Spring Boot API
│   ├── .mvn/wrapper/           # Maven Wrapper config
│   ├── mvnw / mvnw.cmd         # Maven Wrapper scripts
│   ├── pom.xml                 # Maven dependencies
│   └── src/main/
│       ├── java/com/university/helpdesk/
│       │   ├── config/         # DataSeeder, app config
│       │   ├── controller/     # REST API controllers
│       │   ├── dto/            # Data Transfer Objects
│       │   ├── model/          # JPA entities
│       │   ├── repository/     # Spring Data repositories
│       │   ├── security/       # JWT, auth filters
│       │   └── service/        # Business logic
│       └── resources/
│           └── application.properties
├── FrontEnd/                   # React + Vite UI
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── context/            # React contexts
│   │   └── App.jsx             # Root component
│   ├── package.json
│   └── vite.config.js
├── start_project.bat           # Windows 1-click launcher
├── start_project.sh            # macOS/Linux 1-click launcher
├── .gitignore
└── README.md                   # ← You are here
```

## 🧩 Modules

1. **User & Access Control** — JWT auth, role-based access (Student, Lecturer, Agent, Admin)
2. **Ticket Lifecycle Engine** — Create, assign, track, resolve tickets with comments
3. **Customer Satisfaction (CSAT)** — 1-5 star ratings and feedback for resolved tickets
4. **Knowledge Base & AI Chatbot** — Searchable FAQ portal + Gemini-powered assistant
5. **Notification Hub** — Real-time alerts for ticket events with bell icon & toast popups
6. **Analytics Dashboard** — KPI cards, charts, agent leaderboard, CSV export
