# UniAssist 360 – Engineering Implementation Report

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Report:** Implementation and end-to-end integration of partially implemented features (Tasks 1 through 7), security hardening, and complete verification across backend and frontend architectures.

---

## 1. Executive Summary

This report documents the completion of the seven core feature extensions identified in the UniAssist 360 project. All tasks focused on finishing existing partial implementations without introducing out-of-scope modules (e.g., Agent Activity Logs and Manager Analytics Comments/Insights remain intentionally unstarted for the subsequent milestone).

Key deliverables completed:
1. **Assignment History Timeline:** Connected the backend audit trail to [`TicketDetails.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/TicketDetails.jsx) with real-time updates upon ticket claim, assignment, and department routing.
2. **Notification Preferences:** Wired [`NotificationService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/NotificationService.java) to check individual user preferences for delivery channels (`inAppEnabled`, `emailEnabled`) and event types, backed by an interactive management card in [`ProfilePage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/ProfilePage.jsx).
3. **Email Subsystem Integration:** Connected [`EmailService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java) to notification dispatch and password reset flows with strictly non-blocking error handling.
4. **Self-Service Password Reset:** Delivered full self-service reset token generation, SHA-256 hash persistence, email dispatch with reset links, query parameter token extraction in [`PasswordResetPage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/PasswordResetPage.jsx), and automatic JWT token-version invalidation upon password reset.
5. **SLA Analytics Frontend:** Integrated the `GET /api/analytics/sla-compliance` engine into [`AnalyticsDashboard.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/AnalyticsDashboard.jsx), displaying executive KPI summary cards and a detailed per-priority compliance table with configured SLA thresholds.
6. **Ticket Date/Category Filtering:** Extended [`TicketList.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/TicketList.jsx) with category dropdowns, Date From/To inputs, and a "Clear All Filters" button communicating directly with backend filter parameters.
7. **Chatbot FAQ Grounding & Escalation:** Grounded [`GeminiAiService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/GeminiAiService.java) on campus knowledge base articles to prevent hallucination, adding `needsEscalation` signaling and prominent "Create Support Ticket" escalation in [`AiChatbotModal.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/AiChatbotModal.jsx).

---

## 2. Feature Breakdown (Completed & Partial)

| Feature / Subsystem | Prior State | Current State | Notes |
| :--- | :--- | :--- | :--- |
| **Assignment History** | Backend entities & repository existed; endpoint existed | **100% Complete** | Interactive timeline UI integrated into `TicketDetails.jsx`, real-time refresh on claim/assign/route. |
| **Notification Preferences** | DB entity & controller existed; service bypassed preferences | **100% Complete** | `NotificationService.java` enforces channel and event checks; `ProfilePage.jsx` provides UI toggles. |
| **Email Integration** | `EmailService.java` existed as stub | **100% Complete** | Wired to notification events and password reset; non-blocking delivery guarantees ticket operations succeed. |
| **Password Reset** | Admin-assisted fallback flow | **100% Complete** | Self-service random token generation, DB hash storage, email link delivery, query param auto-fill in UI. |
| **SLA Analytics** | Backend calculation engine in `AnalyticsService.java` | **100% Complete** | Frontend KPI cards and per-priority threshold breakdown rendered in `AnalyticsDashboard.jsx`. |
| **Ticket Filtering** | Backend controller accepted `categoryId`, `dateFrom`, `dateTo` | **100% Complete** | Added category select, date pickers, clear filters button, and all status pills in `TicketList.jsx`. |
| **Chatbot Grounding** | Chatbot attempted general Gemini responses | **100% Complete** | Strictly grounded on verified KB articles; unknown policies trigger escalation without hallucinating. |
| **Agent Activity Logs** | Not implemented | **Deferred** | Intentionally postponed to next milestone per prompt directive. |
| **Manager Analytics Comments** | Not implemented | **Deferred** | Intentionally postponed to next milestone per prompt directive. |

---

## 3. Task 1: Assignment History (Backend & Frontend)

### Implementation Details
* **Backend:**
  * [`AssignmentAction.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/AssignmentAction.java): Enumerates `CLAIMED`, `ASSIGNED`, `REASSIGNED`, `ROUTED`, `REROUTED`, `UNASSIGNED`.
  * [`TicketAssignmentHistory.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/TicketAssignmentHistory.java): Entity mapping previous and new assignees, previous and new departments, changedBy user, and timestamp. Includes `@OnDelete(action = OnDeleteAction.CASCADE)` for DB referential integrity.
  * [`TicketAssignmentHistoryRepository.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/repository/TicketAssignmentHistoryRepository.java): Provides `findByTicketIdOrderByChangedAtAsc(Long ticketId)` and `deleteByTicketId(Long ticketId)`.
  * [`TicketService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/TicketService.java): Hooks record `CLAIMED` on self-assignment and `ASSIGNED`/`REASSIGNED` on delegation.
  * [`TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java): Exposes `GET /api/tickets/{id}/assignment-history` governed by ticket read permissions.
* **Frontend:**
  * [`TicketDetails.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/TicketDetails.jsx):
    * Added `assignmentHistory` state and `fetchAssignmentHistory` callback.
    * Triggered on initial load via `Promise.all` and after `handleClaimTicket`, `handleReassignTicket`, and `handleRouteTicket`.
    * Rendered a responsive vertical timeline card below attachments, color-coded by event type with actor and timestamp details.

---

## 4. Task 2 & 3: Notification Preferences & Non-blocking Email Delivery

### Implementation Details
* **Preferences Storage:**
  * [`UserNotificationPreferences.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/UserNotificationPreferences.java): Stores `inAppEnabled`, `emailEnabled`, `ticketCreatedEnabled`, `ticketAssignedEnabled`, `statusUpdatedEnabled`, `newCommentEnabled`, and `csatRequestEnabled`.
  * [`NotificationService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/NotificationService.java):
    * Injected `UserNotificationPreferencesRepository` and `EmailService`.
    * Every notification trigger checks recipient preferences before saving to DB or sending email.
* **Email Delivery Architecture:**
  * [`EmailService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java):
    * Centralized mail service using Spring's `JavaMailSender`.
    * Controlled by `app.email.enabled` (default `false`).
    * All email operations are wrapped in try-catch logging so SMTP timeouts or delivery failures never roll back ticket transactions.
* **Frontend UI:**
  * [`ProfilePage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/ProfilePage.jsx):
    * Added "Notification Delivery Preferences" card below profile form.
    * Allows toggling delivery channels (In-App, Email) and individual event subscriptions.
    * Communicates with `GET /api/notifications/preferences` and `PUT /api/notifications/preferences`.

---

## 5. Task 4: Self-Service Password Reset

### Implementation Details
* **Backend Security:**
  * [`PasswordResetService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java):
    * Injected `EmailService` and added `app.password-reset.self-service` toggle (defaults to `true` in production; set to `false` in test environment to preserve backward-compatible admin fallback test assertions).
    * When self-service is requested: generates 32-byte cryptographically secure random token, stores SHA-256 hash in database (`tokenHash`), and dispatches reset email containing `${frontendUrl}/reset-password?token=${rawToken}`.
    * Raw token is never persisted in database, never returned in API response, and never logged.
    * Unknown email requests return the exact same generic success message (`"If this email is registered, you will receive password reset instructions."`), preventing account enumeration.
    * Upon confirming reset with valid unexpired token, the user's password is encrypted, `tokenVersion` is incremented (invalidating all active JWT sessions), and the token is marked as used.
* **Frontend UI:**
  * [`PasswordResetPage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/PasswordResetPage.jsx):
    * Automatically extracts `token` from URL query parameter (`searchParams.get('token')`).
    * Displays explanatory banner when token is auto-filled from email verification link.
    * Replaced administrator contact text with automated email dispatch notification.

---

## 6. Task 5: SLA Analytics Frontend Integration

### Implementation Details
* **Backend SLA Engine:**
  * [`AnalyticsService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/AnalyticsService.java):
    * Implemented `getSlaCompliance()` measuring creation-to-resolution elapsed time (for resolved/closed tickets) and ticket age against configured threshold (for active tickets).
    * Configurable via `app.sla.threshold.*` properties for all five priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`, `CRITICAL`).
    * Excludes terminal non-resolution statuses (`CANCELLED`, `REJECTED`).
    * Handles zero-ticket edge cases safely without division by zero.
* **Frontend Dashboard:**
  * [`AnalyticsDashboard.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/AnalyticsDashboard.jsx):
    * Fetches `GET /api/analytics/sla-compliance` for `MANAGER_EXECUTIVE` and `SYSTEM_ADMINISTRATOR`.
    * Renders Executive SLA Overview KPI cards: Total Measured, Within SLA Target, and SLA Breached.
    * Renders a Per-Priority SLA Breakdown Table displaying configured threshold hours, measured ticket counts, SLA met/breached counts, and compliance percentages with visual progress meters.

---

## 7. Task 6: Ticket Date/Category Filter UI

### Implementation Details
* **Backend Endpoint:**
  * Added `GET /api/tickets/categories` in [`TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java) and permitted it in [`SecurityConfig.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/security/SecurityConfig.java).
  * Existing `GET /api/tickets` and `GET /api/tickets/my-tickets` filter logic accepts `categoryId`, `dateFrom`, and `dateTo`.
* **Frontend Controls:**
  * [`TicketList.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/TicketList.jsx):
    * Added Category dropdown (populated from `/categories`), Date From picker, Date To picker, and search bar.
    * Included all valid proposal statuses in the filter pills: `OPEN`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`, `REJECTED`.
    * Added "Clear All Filters" button which resets all filter criteria.

---

## 8. Task 7: Chatbot FAQ Grounding & Escalation

### Implementation Details
* **Grounding Engine:**
  * [`GeminiAiService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/GeminiAiService.java):
    * Prioritizes exact and token-based knowledge base matching.
    * If no relevant article is found and the query is not a greeting, the chatbot avoids hallucinating university policy or procedures.
    * Returns response payload with `needsEscalation: true`, `resolved: false`, `canDeflect: true`, and `matchedArticleId: null`.
    * When matching KB articles exist, returns `needsEscalation: false`, `resolved: true`, and the matched article ID/title.
* **Escalation Interface:**
  * [`AiChatbotModal.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/components/AiChatbotModal.jsx):
    * Inspects `needsEscalation` flag from backend reply.
    * Displays prominent "Formal Support Ticket Required" banner with a direct "Create Support Ticket" button pre-populating title and description from the chat context.

---

## 9. Security & Access Control Posture

1. **IDOR Remediation:**
   * All user notification operations derive user identity directly from Spring Security's authenticated principal (`Authentication.getName()`), preventing cross-user notification reading or deletion.
2. **CORS Hardening:**
   * Configurable allowed origins via `app.cors.allowed-origin` / `FRONTEND_ORIGIN` replacing wildcard definitions.
3. **Reset Token Privacy:**
   * Raw reset tokens are sent exclusively via email to the verified address; only SHA-256 digests are stored in the database.
4. **Session Invalidation:**
   * Password reset increments `user.tokenVersion`, causing all previously issued JWT tokens to be rejected on subsequent requests.
5. **Staff Scoping Integrity:**
   * Ticket assignment history, status changes, and resolution workflows continue to enforce strict department-level isolation for Support Agents and Team Leads.

---

## 10. Test Verification Results (Full Suite Breakdown)

### Backend Test Results (Maven 3 / JUnit 5)
Execution command: `mvn test`  
Result: **68 tests run, 0 failures, 0 errors, 0 skipped** (BUILD SUCCESS in ~52s)

| Test Suite Class | Tests Run | Result | Key Scenarios Verified |
| :--- | :---: | :---: | :--- |
| [`ChatbotGroundingTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/ChatbotGroundingTest.java) | 3 | **PASS** | KB match resolution, unknown policy escalation, greeting deflection |
| [`SelfServicePasswordResetTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java) | 2 | **PASS** | Full self-service reset flow with email link, token hash verification, tokenVersion bump, account enumeration protection |
| [`AnalyticsSlaTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/AnalyticsSlaTest.java) | 6 | **PASS** | SLA engine calculations, configurable thresholds, terminal state exclusions, zero-division safety, role authorization |
| [`SupportAgentResolutionSecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SupportAgentResolutionSecurityTest.java) | 6 | **PASS** | Resolution authorization, mandatory resolution notes, cross-department protection |
| [`TicketCancellationSecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/TicketCancellationSecurityTest.java) | 8 | **PASS** | Creator soft-cancellation, admin rejection, access boundaries |
| [`TicketWorkflowSecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/TicketWorkflowSecurityTest.java) | 8 | **PASS** | Ticket lifecycle state transitions (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED) |
| [`RoleAccessAndAttachmentSecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/RoleAccessAndAttachmentSecurityTest.java) | 25 | **PASS** | 7-role access matrices, object-level attachment download & deletion permissions |
| [`Module1SecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/Module1SecurityTest.java) | 9 | **PASS** | Admin-assisted fallback reset, user registration constraints, password policies |
| [`CleanStartupDataTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/CleanStartupDataTest.java) | 1 | **PASS** | Clean database initialization without pre-seeded test fixtures |

### Frontend Build & Lint Results
* **Linting (`cmd /c npm run lint`):** **0 errors** (all source files pass oxlint checks).
* **Production Build (`cmd /c npm run build`):** **PASS** (Vite v8.2.1 production bundle built in 1.05s, 0 errors).
* **Git Hygiene (`git diff --check`):** **PASS** (Clean exit, 0 trailing whitespaces or conflict markers).

---

## 11. Proposal Specification Alignment & Remaining Module Boundaries

### Alignment with SE2030 Proposal Baseline (Group KU-09)
* **Unified Role-Adaptive Architecture:** Maintained the single `Dashboard.jsx` presenting tailored capabilities across all 7 roles (`STUDENT`, `LECTURER`, `SUPPORT_AGENT`, `TEAM_LEAD`, `KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR`).
* **Direct Requester Dispatch:** Students and lecturers submit tickets tagged with target department (`IT`, `MAINTENANCE`, `SECURITY`) entering the queue directly in `OPEN` status.
* **Team Lead Coordination & Agent Resolution:** Team Leads assign/reassign tickets; Support Agents claim and resolve with mandatory notes.
* **Auditable Operations:** Full assignment history and SLA tracking provide visibility for university operations.

### Remaining Module Boundaries (Reserved for Next Phase)
In strict accordance with project directives, the following modules were **not** started in this iteration and remain deferred:
1. **Agent Activity Logs:** Detailed audit trail of granular support agent actions beyond ticket assignments (e.g., viewing records, draft notes).
2. **Manager Analytics Comments / Insights:** Collaborative comment thread and executive notation on dashboard analytics reports.

---
*Report generated and verified against the local UniAssist 360 workspace.*
