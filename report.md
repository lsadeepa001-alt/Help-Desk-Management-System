# UniAssist 360 – Engineering Change Report

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Report:** Changes implemented across the last two prompts covering missing features, security remediations, compile resolution, and SLA compliance engine.

---

## 1. Executive Summary

This report documents the architectural, security, and feature implementations completed during the last two execution prompts:
1. **Missing Features & Security Hardenings:** Added ticket assignment/ownership audit trails, user notification preferences, decoupled email delivery, IDOR remediation in notification and chatbot subsystems, and ticket list category/date filtering.
2. **Compile Error Resolution & SLA Compliance Engine:** Resolved the compile error where `AnalyticsController.java` called `analyticsService.getSlaCompliance()` which was missing in `AnalyticsService.java`. Implemented a configurable, robust SLA compliance engine supporting all five `Priority` levels, resolved referential constraint issues on ticket deletion, and verified complete system health across the backend and frontend.

---

## 2. Changes Implemented by Component

### A. Core Ticket Lifecycle & Assignment History Subsystem
* **New Enum:** [`AssignmentAction.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/AssignmentAction.java)
  * Defines event types: `ASSIGNED`, `REASSIGNED`, `CLAIMED`, `ROUTED`, `REROUTED`, `UNASSIGNED`.
* **New Entity:** [`TicketAssignmentHistory.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/TicketAssignmentHistory.java)
  * Stores immutable audit records: `ticket`, `action`, `previousAgent`, `newAgent`, `previousDepartment`, `newDepartment`, `changedBy`, and `changedAt`.
  * Configured with Hibernate `@OnDelete(action = OnDeleteAction.CASCADE)` to maintain database-level referential integrity on ticket deletion.
* **New Repository:** [`TicketAssignmentHistoryRepository.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/repository/TicketAssignmentHistoryRepository.java)
  * Provides `findByTicketIdOrderByChangedAtAsc(Long ticketId)` and `@Modifying @Query deleteByTicketId(@Param("ticketId") Long ticketId)`.
* **New DTO:** [`AssignmentHistoryDTO.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/dto/AssignmentHistoryDTO.java)
  * Safe view-only projection omitting sensitive internal entity fields while providing display-ready actor names and roles.
* **Lifecycle Recording in Services & Controllers:**
  * [`TicketService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/TicketService.java):
    * Updated `claimTicket()` to record `CLAIMED` history on self-assignment.
    * Updated `assignTicket()` to record `ASSIGNED`, `REASSIGNED`, or `UNASSIGNED` events.
  * [`TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java):
    * Enforced Team Lead department scoping on ticket rerouting (Team Leads can only reroute tickets in their own department; Admins can reroute any).
    * Guaranteed that if rerouting removes the assigned agent, tickets in `IN_PROGRESS` transition back to `OPEN` rather than becoming orphaned in-progress.
    * Added `GET /api/tickets/{id}/assignment-history` protected by ticket-view authorization rules.
  * [`TicketDeletionService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/TicketDeletionService.java):
    * Added `assignmentHistoryRepository.deleteByTicketId(ticketId)` to prevent foreign key constraint violations upon permanent ticket deletion.

---

### B. Notification Preferences & Email Decoupling
* **New Entity:** [`UserNotificationPreferences.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/model/UserNotificationPreferences.java)
  * Stores individual user notification channel toggles: `inAppEnabled`, `emailEnabled`, `ticketCreatedEnabled`, `ticketAssignedEnabled`, `statusUpdatedEnabled`, `newCommentEnabled`, and `csatRequestEnabled`.
* **New Repository:** [`UserNotificationPreferencesRepository.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/repository/UserNotificationPreferencesRepository.java)
  * Allows querying preferences by `userId`.
* **New Service:** [`EmailService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java)
  * Wraps Spring's `JavaMailSender` with optional autowiring (`@Autowired(required = false)`).
  * Controlled by environment variable `EMAIL_ENABLED` (default: `false`).
  * Catches and logs all delivery errors, ensuring email transport failure never rolls back transactional ticket lifecycle actions.
* **Controller IDOR Fix:** [`NotificationController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/NotificationController.java)
  * **Critical IDOR Remediation:** Removed untrusted `@RequestParam Long userId`. Current user is now resolved directly from the verified Spring Security `Authentication` principal.
  * Enforced object-level ownership checks for marking single notifications as read and deleting notifications.
  * Added `GET /api/notifications/preferences` and `PUT /api/notifications/preferences`.

---

### C. Security Hardening & Knowledge Base/Chatbot Protection
* **CORS & Global Configuration:**
  * [`SecurityConfig.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/security/SecurityConfig.java):
    * Replaced wildcard `allowedOriginPatterns("*")` with configurable `app.cors.allowed-origin` (overridable via `FRONTEND_ORIGIN`).
    * Configured public access for FAQ deflection chatbot (`/kb/chatbot/ask`) while securing ticket-status lookups (`/kb/chatbot/ticket-status/**`).
  * Removed `@CrossOrigin(origins = "*")` from controllers (`TicketController`, `KbController`, `AnalyticsController`).
* **Author Integrity & Ticket Status Privacy:** [`KbController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/KbController.java)
  * KB article author is now derived directly from the authenticated user token; client-supplied `authorId` values in request payloads are ignored.
  * Added object-level authorization to `GET /kb/chatbot/ticket-status/{ticketNumber}` ensuring students/lecturers can only check their own tickets, while support staff/leads can view tickets within their department and administrators can view all.

---

### D. Ticket Search & Filtering (Phase 5)
* **API Filtering Parameters:** [`TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java)
  * Extended `GET /api/tickets` and `GET /api/tickets/my-tickets` with optional query parameters:
    * `categoryId` (Long)
    * `dateFrom` (ISO date string)
    * `dateTo` (ISO date string)
  * Preserved strict role-based department and assignment visibility so query filters cannot bypass access boundaries.

---

### E. Analytics Standardization & SLA Compliance Engine (Phase 4 & Prompt 2)
* **CSAT Metric Standardization:** [`AnalyticsService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/AnalyticsService.java)
  * Standardized CSAT metrics to match academic and industry requirements:
    * `avgCsatRating`: Arithmetic average of ratings (1.0 to 5.0 scale).
    * `satisfactionRatePercentage`: Percentage of responses with rating ≥ 4.
* **Configurable SLA Thresholds:**
  * Added configuration properties in [`application.properties`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/resources/application.properties) with environment overrides:
    * `app.sla.threshold.low=${SLA_THRESHOLD_LOW:72}` (72h)
    * `app.sla.threshold.medium=${SLA_THRESHOLD_MEDIUM:48}` (48h)
    * `app.sla.threshold.high=${SLA_THRESHOLD_HIGH:24}` (24h)
    * `app.sla.threshold.urgent=${SLA_THRESHOLD_URGENT:8}` (8h)
    * `app.sla.threshold.critical=${SLA_THRESHOLD_CRITICAL:4}` (4h)
* **SLA Engine Implementation:** [`AnalyticsService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/AnalyticsService.java)
  * Implemented `public Map<String, Object> getSlaCompliance()`:
    * **Terminal Status Exclusion:** Excludes `Status.CANCELLED` and `Status.REJECTED` from SLA measurements.
    * **Resolved/Closed Tickets:** Calculates elapsed duration from `createdAt` to `resolvedAt` against the priority threshold.
    * **Active Unresolved Tickets:** Calculates elapsed age from `createdAt` to current time (`LocalDateTime.now()`) against the priority threshold.
    * **Zero-Ticket & Safe Math:** Prevents divide-by-zero errors when measured count or priority count is zero, defaulting compliance to `0.0`.
    * **Payload Structure:**
      * `totalMeasuredTickets`
      * `slaMetCount`
      * `slaBreachedCount`
      * `compliancePercentage`
      * `perPriority` (nested map for `LOW`, `MEDIUM`, `HIGH`, `URGENT`, `CRITICAL` containing `thresholdHours`, `total`, `met`, `breached`, `compliancePercentage`)
* **Endpoint Exposure:** [`AnalyticsController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/AnalyticsController.java)
  * Exposed `GET /api/analytics/sla-compliance` restricted to `MANAGER_EXECUTIVE` and `SYSTEM_ADMINISTRATOR`.

---

## 3. Test Suites & Verification

### A. New Regression Suite: `AnalyticsSlaTest.java`
Created [`AnalyticsSlaTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/AnalyticsSlaTest.java) with 6 automated test scenarios:
1. `zeroTicketsHandledSafely` — Verifies zero-ticket scenario produces clean 0.0 metrics without mathematical errors.
2. `terminalStatesExcluded` — Confirms CANCELLED and REJECTED tickets do not alter SLA measurements.
3. `resolvedAndClosedTicketsMeasurement` — Validates creation-to-resolution duration against SLA thresholds.
4. `activeUnresolvedTicketsMeasurement` — Validates active ticket age against thresholds (detects active breaches).
5. `supportsAllPrioritiesAndConfigurableThresholds` — Tests all 5 priorities and custom threshold overrides.
6. `endpointAuthorization` — Confirms 200 OK for `MANAGER_EXECUTIVE` and `SYSTEM_ADMINISTRATOR`, and 403 Forbidden for `STUDENT`.

### B. Verification Run Results

| Check / Test Target | Command | Result | Details |
| :--- | :--- | :---: | :--- |
| **Backend Compilation** | `mvn test-compile` | **PASS** | 62 main classes, 7 test classes compiled cleanly |
| **SLA Focused Tests** | `mvn test -Dtest=AnalyticsSlaTest` | **PASS** | 6 tests passed, 0 failures, 0 errors |
| **Full Backend Suite** | `mvn test` | **PASS** | 63 tests passed across all test classes, 0 failures, 0 errors |
| **Frontend Build** | `npm run build` | **PASS** | Production client bundle built in 1.42s |
| **Frontend Lint** | `npm run lint` | **PASS** | 0 lint errors (17 non-blocking warnings) |
| **Git Diff Check** | `git diff --check` | **PASS** | 0 whitespace or merge conflict markers |

### C. Test Suite Breakdown (Full Suite: 63 Tests)
* `com.university.helpdesk.AnalyticsSlaTest`: **6/6 passed**
* `com.university.helpdesk.CleanStartupDataTest`: **1/1 passed**
* `com.university.helpdesk.Module1SecurityTest`: **9/9 passed**
* `com.university.helpdesk.RoleAccessAndAttachmentSecurityTest`: **25/25 passed**
* `com.university.helpdesk.SupportAgentResolutionSecurityTest`: **6/6 passed**
* `com.university.helpdesk.TicketCancellationSecurityTest`: **8/8 passed**
* `com.university.helpdesk.TicketWorkflowSecurityTest`: **8/8 passed**

---

## 4. Current Repository State

* All changes reside in the local working directory.
* No commits or pushes have been made in accordance with the project directives.
* The backend is fully compiling, all test suites pass with zero errors, and the system is aligned with the SE2030 proposal specification.
