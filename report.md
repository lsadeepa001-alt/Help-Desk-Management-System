# UniAssist 360 – Engineering Report: Proposal Alignment Cleanup

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Implementation:** Proposal Alignment Cleanup across Backend and Frontend architectures — Technical Department alignment, Knowledge Base category scoping, legacy `ACCEPTED` status deprecation, existing-user promotion UX/validation, ticket hard-delete policy isolation, terminology standardization, and full verification.

---

## 1. Executive Summary & Purpose

The goal of this cleanup phase was to rigorously audit, clean, and align the UniAssist 360 codebase against the approved **SE2030 Help Desk Management System specification**, resolving legacy inconsistencies, ambiguities, and out-of-scope remnants while strictly preserving all existing production-grade modules.

### Key Guarantees Preserved
- **Seven Core Roles:** `STUDENT`, `LECTURER`, `SUPPORT_AGENT`, `TEAM_LEAD`, `KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, and `SYSTEM_ADMINISTRATOR`.
- **Unified Role-Adaptive Frontend:** Single-page dashboard architecture (`Dashboard.jsx`), responsive navigation, per-tab session auth, and live metric widgets.
- **Full Operational Capabilities:** Assignment history, agent activity logs, manager analytics insights, CSAT rating workflows, SLA engine, Gemini chatbot escalation, object-level attachment authorization, and real-time notification dispatching.
- **Zero-Seed Clean Startup Compliance:** System boot maintains 0 unmanaged test data; schema auto-migration handles all entity relationships safely.
- **Local Working Tree Integrity:** No code was committed or pushed to remote repositories.

---

## 2. Technical Departments vs. Requester Academic Departments

### 2.1. Problem & Architectural Ambiguity
In previous iterations, the concept of a "Department" was conflated between two distinct university contexts:
1. **Requester Academic Department:** Academic affiliation of Students and Lecturers (e.g. `Computing`, `Engineering`, `Business`, `Science`).
2. **Technical Department:** Operational service units responsible for resolving tickets (`IT`, `Maintenance`, `Security`).

In some views (e.g. `AgentDashboard.jsx`), filters and cards fell back to `t.department || t.createdBy?.department`, mixing ticket routing sections with academic faculties.

### 2.2. Solution & Enforcement
- **Backend Authorization (`UserController.java`):**
  - Privileged creation (`POST /api/users`) and role promotion (`PUT /api/users/{id}/role`) strictly validate operational staff (`SUPPORT_AGENT`, `TEAM_LEAD`) against `TECHNICAL_DEPARTMENTS` (`IT`, `MAINTENANCE`, `SECURITY`).
  - Attempting to assign an academic or invalid department returns `400 Bad Request`.
  - Non-operational privileged roles (`KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR`) have their department automatically cleared (`null`).
- **Ticket Routing (`TicketService.java`, `TicketController.java`, `CreateTicket.jsx`):**
  - Tickets must be routed to one of `IT`, `Maintenance`, or `Security`.
  - The submitter's academic department is preserved as `ticket.createdBy.department` (`Requester Department`) and rendered distinctly from `ticket.department` (`Technical Department`).
- **Frontend Dashboard Alignment (`AgentDashboard.jsx`):**
  - Filters strictly operate on `t.department` against `['ALL', 'IT', 'Maintenance', 'Security']`.
  - Ticket row badges clearly delineate `🏢 Dept: {ticket.department}` and `🎓 Requester: {ticket.createdBy.department}`.

---

## 3. Knowledge Base Category Scope Alignment

### 3.1. Problem
The proposal explicitly specifies Help Desk categories centered around core campus service units: `IT`, `Maintenance`, and `Security`. However, the enum `KbCategory` retained legacy development categories: `IT_SERVICES`, `ACADEMIC_AFFAIRS`, and `LIBRARY`. Furthermore, creating an article defaulted to `IT_SERVICES`.

### 3.2. Solution & Backward Compatibility
- **Backend Model (`KbCategory.java`):**
  - Added primary canonical categories: `IT`, `MAINTENANCE`, `SECURITY`.
  - Retained `IT_SERVICES`, `ACADEMIC_AFFAIRS`, and `LIBRARY` marked with `@Deprecated` annotations so existing database records deserialize without errors.
- **Controller Validation (`KbController.java`):**
  - `getArticles`: Automatically maps legacy alias `IT_SERVICES` to `IT` when filtering.
  - `saveArticle`:
    - Automatically maps incoming `IT_SERVICES` to canonical `IT`.
    - Prohibits creation or update of articles under deprecated categories (`ACADEMIC_AFFAIRS`, `LIBRARY`), returning `400 Bad Request: Category <category> is deprecated. Allowed categories: IT, MAINTENANCE, SECURITY`.
    - Defaults new articles to `KbCategory.IT`.
- **Frontend Alignment (`KnowledgeBase.jsx`):**
  - `categoryBadges` styled for `IT`, `MAINTENANCE`, `SECURITY` (with fallback styling for legacy records).
  - Category filter pills reduced to: `ALL`, `IT`, `MAINTENANCE`, `SECURITY`.
  - Article publishing/editing modal restricted to: `IT`, `MAINTENANCE`, `SECURITY`.
  - Editor auto-normalizes legacy `IT_SERVICES` to `IT` when loading an existing article.

---

## 4. Legacy `ACCEPTED` Status Audit & Deprecation

### 4.1. Audit Findings
The proposal defines the concrete ticket lifecycle as:
$$\text{OPEN} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED} \quad (\text{or } \text{REOPENED} / \text{CANCELLED} / \text{REJECTED})$$
The `ACCEPTED` status was a legacy triage state from early development. `TicketService.java` already rejected operational transitions into `ACCEPTED` via `updateStatus`. However:
1. `TicketController.java` exposed `PUT /api/tickets/{id}/accept`.
2. `TicketList.jsx` rendered `ACCEPTED` in its status filter pills.

### 4.2. Implementation
- **Backend Model (`Status.java`):** Marked `ACCEPTED` as `@Deprecated`.
- **Endpoint Deprecation (`TicketController.java`):**
  `PUT /api/tickets/{id}/accept` now throws `ResponseStatusException(HttpStatus.BAD_REQUEST, "ACCEPTED status transition is deprecated. Tickets proceed directly from OPEN to IN_PROGRESS upon claim or assignment.")`.
- **Frontend Cleanup (`TicketList.jsx`):** Removed `ACCEPTED` from the interactive status filter bar while preserving `statusStyles.ACCEPTED` to render legacy tickets gracefully.

---

## 5. Existing-User Role Change UX & Validation

### 5.1. UX Flow Gap
Previously, if a System Administrator attempted to promote an existing `STUDENT` or `LECTURER` to `SUPPORT_AGENT` or `TEAM_LEAD` from the User Management panel, the frontend immediately rejected the action with an error toast if the user lacked a technical department, with no UI mechanism to assign one.

### 5.2. Modal Implementation (`App.jsx`)
- Introduced a dedicated **Assign Technical Department Modal** triggered when promoting any user to `SUPPORT_AGENT` or `TEAM_LEAD`.
- The modal displays:
  - User Full Name and Username.
  - Target Role (`Support Agent` or `Team Lead`).
  - Dropdown selecting from approved technical departments: `IT`, `Maintenance`, `Security`.
- Submitting the modal invokes `PUT /api/users/{id}/role` with `{ role: newRole, department: selectedDept }`.
- Backend validation ensures that promotions to operational roles fail with `400 Bad Request` if a valid technical department is not supplied or already present on the user record.
- Demoting or changing role to `KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, or `SYSTEM_ADMINISTRATOR` automatically clears the department attribute.

---

## 6. Ticket Hard-Delete Policy & UI Isolation

### 6.1. Safety & Governance Principle
Permanent deletion (`DELETE /api/tickets/{id}/permanent`) cascades through and irreversibly destroys the ticket, all file attachments, CSAT reviews, assignment logs, activity audit trails, comments, and notifications. This must never be confused with daily operational lifecycle actions (e.g. In Progress, Resolve, Close).

### 6.2. UI Isolation (`TicketDetails.jsx`)
- Removed the permanent delete button entirely from the staff lifecycle actions row.
- Relocated permanent deletion into a dedicated **Emergency Administrative Maintenance** card at the bottom of the ticket view, strictly rendered for `SYSTEM_ADMINISTRATOR`.
- Framed in high-visibility warning styling (`bg-rose-950/20 border-rose-500/30`) with clear cautionary text:
  > *"Permanently purge this ticket, assignment logs, internal notes, attachments, and ratings. This operation is strictly irreversible."*
- Requires browser confirmation before issuing the permanent purge request.

---

## 7. Terminology Standardization

Audited and standardized platform UI and backend terminology across all views:

| Old / Inconsistent Term | Standardized Proposal Term | Location(s) Updated |
| :--- | :--- | :--- |
| `Technical Section` | `Technical Department` | `TicketDetails.jsx` metadata & routing dropdown |
| `IT Services` / `Campus Security` (with emojis in options) | `IT` / `Maintenance` / `Security` | `CreateTicket.jsx`, `KnowledgeBase.jsx`, `App.jsx` |
| Conflated `Department` | `Technical Department` vs `Requester Department` | `CreateTicket.jsx`, `AgentDashboard.jsx`, `TicketDetails.jsx` |
| Ambiguous role select | Explicit role labels with operational department modal | `App.jsx` User Management table |

---

## 8. Proposal Alignment Regression Test Suite

Created a dedicated test suite: [`ProposalAlignmentSecurityTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/ProposalAlignmentSecurityTest.java) covering all proposal alignment rules:

| Test Method | Verification Target | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| `operationalStaffCreationValidatesDepartment()` | Creating operational staff with academic/invalid dept vs technical dept | 400 Bad Request on "Computing", 201 Created on "IT" | **PASS** |
| `userPromotionRequiresTechnicalDepartment()` | Promoting student without dept, promoting with technical dept, demoting to KM, non-admin role change | 400 on missing dept, 200 on valid dept, dept cleared on KM, 403 on non-admin | **PASS** |
| `legacyAcceptedStatusReturnsBadRequest()` | Calling `PUT /api/tickets/{id}/accept` | 400 Bad Request with deprecation notice | **PASS** |
| `kbCategoryScopeValidation()` | Creating KB articles with `IT`, `IT_SERVICES`, `ACADEMIC_AFFAIRS`, `LIBRARY` | 201 on IT & IT_SERVICES (mapped), 400 on ACADEMIC_AFFAIRS and LIBRARY | **PASS** |
| `permanentTicketDeletionAuthorization()` | Non-admin vs Admin calling `DELETE /api/tickets/{id}/permanent` | 403 Forbidden for Support Agent, 204 No Content for Admin (ticket purged) | **PASS** |

---

## 9. Full System Verification Results

### 9.1. Backend Test Suite (`mvn test`)
- **Total Test Classes Executed:** 13
- **Total Tests Run:** 101
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Result:** `BUILD SUCCESS` (Execution time: ~1 min 5 s)

### 9.2. Frontend Production Build (`npm run build`)
- **Bundler:** Vite v8.2.1
- **Modules Transformed:** 96 modules
- **Output:**
  - `dist/index.html` (0.45 kB)
  - `dist/assets/index-CHXkHt4v.css` (90.48 kB)
  - `dist/assets/index-DuQtQjWL.js` (516.97 kB)
- **Result:** Success, 0 build errors.

### 9.3. Frontend Linter (`npm run lint`)
- **Linter:** `oxlint`
- **Files Scanned:** 24 files across 92 rules
- **Errors:** 0
- **Result:** Clean exit code 0.

### 9.4. Git Diff & Working Tree Check
- **`git diff --check`:** Clean exit code 0 (no whitespace errors or merge markers).
- **Branch:** `master` (all changes kept locally in working tree; no commits or pushes).

---

## 10. Summary of Changed Files

```
BackEnd/
├── src/main/java/com/university/helpdesk/
│   ├── controller/
│   │   ├── KbController.java               (Category mapping to IT, rejection of out-of-scope categories)
│   │   ├── TicketController.java           (Deprecation of acceptTicket endpoint with 400 Bad Request)
│   │   └── UserController.java             (Strict validation of technical dept on role promotion, clear dept for KM/Admin)
│   └── model/
│       ├── KbCategory.java                 (Added IT, marked legacy categories @Deprecated)
│       ├── KnowledgeBaseArticle.java       (Default category updated to IT)
│       └── Status.java                     (Marked ACCEPTED @Deprecated)
└── src/test/java/com/university/helpdesk/
    └── ProposalAlignmentSecurityTest.java   (5 new comprehensive automated regression tests)

FrontEnd/
├── src/
│   ├── App.jsx                             (Role change modal for selecting technical dept, updated handlers)
│   └── components/
│       ├── AgentDashboard.jsx              (Technical dept filtering, clean metadata display)
│       ├── CreateTicket.jsx                (Technical Department label & clean options, requester badge)
│       ├── KnowledgeBase.jsx               (Category pills, badges, and modal aligned to IT/Maintenance/Security)
│       ├── TicketDetails.jsx               (Standardized labels, permanent delete isolated to Admin Maintenance)
│       └── TicketList.jsx                  (Removed ACCEPTED from status filter pills)
```
