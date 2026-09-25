# UniAssist 360 – Engineering Implementation Report: Agent Activity Logs & Manager Analytics Insights

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Implementation:** End-to-end implementation of the final two specification features: Operational Agent Activity Logs and Manager Analytics Strategic Insights/Comments, complete with backend audit tracking, authoritative object-level authorization, CSV export enrichment, unified frontend dashboard extensions, zero-seed clean startup compliance, and full test suite verification.

---

## 1. Executive Summary & Scope

This implementation cycle successfully delivers the two remaining SE2030 proposal capabilities that were previously absent from the UniAssist 360 platform:

1. **Feature 1 — Agent Activity Logs:** An auditable, persistent, immutable operational activity trail capturing operational staff actions across the entire ticket lifecycle (self-claims, assignments, reassignments, routing, rerouting, status transitions, resolutions, reopenings, public comments, and internal notes). Includes executive analytics endpoints for filtered query and aggregated activity summaries.
2. **Feature 2 — Manager Analytics Comments / Strategic Insights:** A dedicated management commentary subsystem allowing executive managers (`MANAGER_EXECUTIVE`) and administrators (`SYSTEM_ADMINISTRATOR`) to record, update, review, and delete strategic observations and operational action items directly within the Analytics & Report Center.

### Preserved Architectural Constraints
- **Seven-Role RBAC:** Strict preservation of `STUDENT`, `LECTURER`, `SUPPORT_AGENT`, `TEAM_LEAD`, `KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, and `SYSTEM_ADMINISTRATOR`.
- **Unified Frontend Architecture:** All new management capabilities are integrated directly into `FrontEnd/src/components/AnalyticsDashboard.jsx`. No redundant dashboards were created.
- **Zero-Seed Clean Database Startup:** Clean database initialization creates exactly 0 activity logs and 0 insight records. Schema generation occurs automatically via `spring.jpa.hibernate.ddl-auto=update`.
- **Authoritative Backend Security:** All authorization rules are enforced authoritatively via Spring Security method security annotations (`@PreAuthorize`) and JPA-level principal verification.
- **No Git Commits/Pushes:** All code changes remain in the local working directory.

---

## 2. Feature 1: Agent Activity Logs

### 2.1. Auditable Action Taxonomy
The `AgentActivityAction` enum formalizes every auditable staff interaction:

| Action Enum | Lifecycle Trigger | Details Captured |
| :--- | :--- | :--- |
| `TICKET_CLAIMED` | Support Agent claims an unassigned ticket | Claiming agent name and department |
| `TICKET_ASSIGNED` | Team Lead or Admin assigns an unassigned ticket | Target agent name and department |
| `TICKET_REASSIGNED` | Team Lead or Admin reassigns ticket to a different agent | Previous agent name and new agent name |
| `TICKET_ROUTED` | Staff or Admin sets initial ticket department | Routed technical department |
| `TICKET_REROUTED` | Team Lead or Admin changes ticket department | Source and destination departments |
| `STATUS_CHANGED` | Operational status transition (e.g. `IN_PROGRESS`) | Previous and subsequent statuses |
| `TICKET_RESOLVED` | Assigned Support Agent completes ticket resolution | Mandatory resolution notes snapshot |
| `TICKET_REOPENED` | Ticket Creator or Admin reopens resolved/closed ticket | Reopen rationale |
| `PUBLIC_COMMENT_ADDED` | Staff user posts public ticket comment | Comment author and ticket link |
| `INTERNAL_NOTE_ADDED` | Staff user adds internal note | Note author and ticket link |

### 2.2. Backend Data Model & Repository
* **Entity (`AgentActivityLog.java`):**
  * `id`: Auto-incrementing primary key (`GenerationType.IDENTITY`).
  * `ticket`: Lazy `Ticket` association with `@OnDelete(action = OnDeleteAction.CASCADE)`.
  * `actor`: Lazy `User` association capturing the operational principal.
  * `actorName`, `actorRole`, `actorDepartment`: Denormalized snapshot attributes ensuring immutable audit integrity even if user attributes change.
  * `action`: Enumerated `AgentActivityAction` (`@Enumerated(EnumType.STRING)`).
  * `details`: Text description (max 1000 characters).
  * `createdAt`: Immutable timestamp with `@PrePersist` defaults.
* **DTO (`AgentActivityLogDTO.java`):** Clean projection exposing ticket number, title, actor metadata, action enum, details, and ISO-8601 timestamp without lazy loading overhead.
* **Repository (`AgentActivityLogRepository.java`):** Spring Data JPA repository supporting reverse-chronological retrieval, actor filtering, ticket filtering, and `deleteByTicketId(Long ticketId)`.

### 2.3. Service Integration Points
The audit logging is wired directly into the core service layer:
* **`TicketService.java`:**
  * `claimTicket`: Records `TICKET_CLAIMED` on successful self-assignment.
  * `assignTicket`: Records `TICKET_ASSIGNED` on initial agent allocation or `TICKET_REASSIGNED` when changing assigned staff.
  * `updateStatus`: Records `TICKET_RESOLVED` (capturing mandatory notes) or `STATUS_CHANGED`.
  * `reopenTicket`: Records `TICKET_REOPENED` (capturing creator's reason).
* **`TicketController.java`:**
  * `routeTicket`: Records `TICKET_ROUTED` or `TICKET_REROUTED` upon technical department modifications.
  * `addComment`: Records `INTERNAL_NOTE_ADDED` when `isInternal == true` or `PUBLIC_COMMENT_ADDED` when public.
* **`TicketDeletionService.java`:** Added `agentActivityLogRepository.deleteByTicketId(ticketId)` to ensure cascading purge on permanent ticket deletion.

### 2.4. Analytics Activity Endpoints
Guarded by `@PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")`:
* `GET /api/analytics/activity-logs`:
  * Supports optional query parameters: `agentId` (Long), `department` (String), `action` (String), `dateFrom` (ISO date), `dateTo` (ISO date).
  * Returns `List<AgentActivityLogDTO>` sorted in reverse chronological order.
* `GET /api/analytics/activity-summary`:
  * Supports optional query parameters: `department`, `dateFrom`, `dateTo`.
  * Returns aggregated metrics: `totalActivities`, `byAction` (map of action counts), `byDepartment` (map of department counts), and `recentActivities`.

---

## 3. Feature 2: Manager Analytics Comments / Insights

### 3.1. Purpose & Design Principles
Provides high-level management with persistent commentary capabilities on system analytics, SLA breaches, and operational bottlenecks directly alongside live metrics:
1. **Strict Author Identity:** The author is derived exclusively from the authenticated Spring Security principal (`getCurrentUser(auth)`). Any `authorId` supplied in the JSON request body is strictly ignored to eliminate identity spoofing.
2. **Horizontal Privilege Enforcement (IDOR Protection):** A manager (`MANAGER_EXECUTIVE`) can edit and delete only their own insights. Attempting to update or delete another manager's insight results in `403 Forbidden`.
3. **Administrative Oversight:** The `SYSTEM_ADMINISTRATOR` has platform-wide oversight and can update or delete any insight for governance purposes.
4. **Input Validation:** Content is validated as non-blank and capped at 4,000 characters. Blank content returns `400 Bad Request`.

### 3.2. Data Model & DTO
* **Entity (`AnalyticsInsight.java`):**
  * `id`: Primary key (`GenerationType.IDENTITY`).
  * `author`: `@ManyToOne(fetch = FetchType.LAZY, optional = false)` pointing to `User`.
  * `authorName`, `authorRole`, `department`: Snapshot attributes.
  * `title`: Optional headline (max 200 characters).
  * `content`: Required body text (max 4,000 characters).
  * `createdAt` & `updatedAt`: Timestamps with `@PrePersist` and `@PreUpdate` hooks.
* **DTO (`AnalyticsInsightDTO.java`):** Exposes `id`, `authorId`, `authorName`, `authorRole`, `department`, `title`, `content`, `createdAt`, `updatedAt`, and `edited` boolean flag.

### 3.3. CRUD Endpoints (`/api/analytics/insights`)
Guarded by `@PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")`:

| HTTP Method | Endpoint | Description | Access Rules |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/analytics/insights` | Retrieve all insights in reverse chronological order | `MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR` |
| `POST` | `/api/analytics/insights` | Create new strategic insight | `MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR` (author bound to caller) |
| `PUT` | `/api/analytics/insights/{id}` | Update existing insight | Author or `SYSTEM_ADMINISTRATOR` |
| `DELETE` | `/api/analytics/insights/{id}` | Delete existing insight | Author or `SYSTEM_ADMINISTRATOR` |

---

## 4. Enriched CSV Reporting

In `AnalyticsService.generateCsvReport()`, the CSV generator was expanded. In addition to individual ticket rows, the exported file now appends two distinct audit and management sections:

```csv
--- OPERATIONAL AGENT ACTIVITY LOGS ---
Timestamp,Actor,Role,Department,Action,Ticket Number,Details
"2026-09-26 03:20","Jane Doe","SUPPORT_AGENT","IT","TICKET_CLAIMED","TICK-001234","Ticket claimed by agent Jane Doe"
...

--- MANAGEMENT ANALYTICS INSIGHTS ---
Timestamp,Author,Role,Department,Title,Content,Last Updated
"2026-09-26 03:22","Alex Director","MANAGER_EXECUTIVE","Operations","Q3 SLA Analysis","Observed 18% improvement in IT ticket closure times.","2026-09-26 03:25"
...
```

This enriches the CSV without disrupting legacy automated parsers that read the initial ticket rows.

---

## 5. Unified Frontend Dashboard Integration

All capabilities were integrated into `FrontEnd/src/components/AnalyticsDashboard.jsx`:

1. **Role-Adaptive Fetching:**
   - Non-executive staff (e.g. `TEAM_LEAD`) only fetch summary metrics and agent leaderboard.
   - Privileged management (`MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR`) concurrently fetch:
     - Live metrics & agent performance
     - SLA compliance matrix
     - Operational staff activity summary & logs
     - Management strategic insights feed
2. **Operational Staff Activity Stream UI:**
   - Header with total logged events counter.
   - Comprehensive filter bar:
     - Full-text search (actor name, ticket number, ticket title, details)
     - Action type dropdown selector
     - Technical department dropdown selector (`IT`, `Maintenance`, `Security`)
     - Quick "Clear Filters" action
   - Responsive activity table with color-coded semantic badges:
     - `TICKET_RESOLVED` (emerald), `TICKET_ASSIGNED` (indigo), `TICKET_REASSIGNED` (cyan), `TICKET_CLAIMED` (purple), `TICKET_ROUTED`/`TICKET_REROUTED` (blue/sky), `INTERNAL_NOTE_ADDED` (amber), `PUBLIC_COMMENT_ADDED` (teal), `TICKET_REOPENED` (rose).
     - Ticket reference links with truncated title popovers.
3. **Management Strategic Insights UI:**
   - "+ Publish Strategic Insight" button opening a clean modal dialog.
   - Card grid layout featuring author avatar, name, role badge, department, formatted timestamp, and `● Edited` pill.
   - Edit and Delete controls rendered conditionally:
     `const canModify = user?.id === item.authorId || user?.role === 'SYSTEM_ADMINISTRATOR';`
   - Interactive Modal Form:
     - Optional Title input
     - Real-time character counter (`${insightForm.content.length} / 4000`)
     - Validation ensuring non-empty submission
     - Loading spinner during async save

---

## 6. Zero-Seed Clean Database Startup

To ensure compliance with academic evaluation and specification standards:
- Verified that `DataSeeder.java` contains **no demo or mock seeding** for `agent_activity_logs` or `analytics_insights`.
- Verified via `CleanStartupDataTest.java` that on fresh startup, the database contains zero operational tickets, zero comments, zero activity logs, and zero insights.

---

## 7. Verification Results

### 7.1. Automated Test Suites
Two dedicated test classes were authored and integrated into the suite:

1. **`AgentActivityLogTest.java` (3 test suites):**
   - `operationalActionsGenerateActivityLogs`: Validates that self-claiming, reassigning, rerouting, internal notes, public comments, resolution, and reopening all generate corresponding `AgentActivityLog` entries.
   - `activityEndpointsEnforceRoleAuthorization`: Validates that `MANAGER_EXECUTIVE` and `SYSTEM_ADMINISTRATOR` receive `200 OK`, while `SUPPORT_AGENT` and `STUDENT` receive `403 Forbidden`.
   - `activityLogFilteringWorks`: Validates exact filtering by action type and department.
2. **`AnalyticsInsightSecurityTest.java` (6 test suites):**
   - `managerCanCreateAndRetrieveInsights`: Validates creation, retrieval, and author spoof-resistance.
   - `managerCanUpdateOwnInsight`: Validates edit workflow and `edited: true` flag.
   - `crossManagerIdorProtection`: Validates that Manager B receives `403 Forbidden` when attempting to edit or delete Manager A's insight.
   - `adminCanUpdateAndDeleteAnyInsight`: Validates administrative oversight for updates and deletions.
   - `nonPrivilegedRolesForbidden`: Validates that `SUPPORT_AGENT` and `STUDENT` receive `403 Forbidden` on all insight endpoints.
   - `blankContentReturnsBadRequest`: Validates `@NotBlank` rejection with `400 Bad Request`.

### 7.2. Full Test Suite Execution
* **Maven Test Suite:**
  ```text
  [INFO] Results:
  [INFO] Tests run: 96, Failures: 0, Errors: 0, Skipped: 0
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  ```
  All 12 test classes (84 existing + 12 new) passed with 100% success.

* **Frontend Build & Lint:**
  - `npm run build`: Vite build completed in 5.54s with zero errors.
  - `npm run lint`: oxlint completed with 0 errors.
  - `git diff --check`: Clean, zero whitespace issues.

---

## 8. Summary of Created and Modified Files

| File Path | Status | Purpose |
| :--- | :---: | :--- |
| `BackEnd/.../model/AgentActivityAction.java` | **NEW** | Enum of 10 auditable operational actions |
| `BackEnd/.../model/AgentActivityLog.java` | **NEW** | JPA entity for immutable activity log audit trail |
| `BackEnd/.../dto/AgentActivityLogDTO.java` | **NEW** | DTO projection for activity log entries |
| `BackEnd/.../repository/AgentActivityLogRepository.java` | **NEW** | Spring Data repository for activity logs |
| `BackEnd/.../service/AgentActivityLogService.java` | **NEW** | Service managing activity logging and aggregations |
| `BackEnd/.../model/AnalyticsInsight.java` | **NEW** | JPA entity for management strategic insights |
| `BackEnd/.../dto/AnalyticsInsightDTO.java` | **NEW** | DTO projection for management insights |
| `BackEnd/.../repository/AnalyticsInsightRepository.java` | **NEW** | Spring Data repository for insights |
| `BackEnd/.../service/AnalyticsInsightService.java` | **NEW** | Service for insight CRUD, IDOR check, and validation |
| `BackEnd/.../test/AgentActivityLogTest.java` | **NEW** | Automated test suite for activity logs and access control |
| `BackEnd/.../test/AnalyticsInsightSecurityTest.java` | **NEW** | Automated test suite for insight CRUD, IDOR, and oversight |
| `BackEnd/.../controller/AnalyticsController.java` | **MODIFIED** | Added activity log, summary, and insight CRUD endpoints |
| `BackEnd/.../controller/TicketController.java` | **MODIFIED** | Injected activity logging for routing and comments |
| `BackEnd/.../service/TicketService.java` | **MODIFIED** | Injected activity logging for claim, assign, status, reopen |
| `BackEnd/.../service/TicketDeletionService.java` | **MODIFIED** | Cascades activity log deletion on hard ticket purge |
| `BackEnd/.../service/AnalyticsService.java` | **MODIFIED** | Enriched CSV export with activity logs and insights |
| `FrontEnd/.../components/AnalyticsDashboard.jsx` | **MODIFIED** | Added activity stream table, filters, insight feed & modal |
| `report.md` | **UPDATED** | Authoritative engineering documentation for this phase |
