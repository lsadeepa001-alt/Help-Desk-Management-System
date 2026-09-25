# UniAssist 360 – Engineering Implementation Report: Security Hardening, Email Reliability & Privileged Department Control

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Report:** Comprehensive engineering documentation covering real self-service password reset email delivery diagnosis and remediation, object-level authorization hardening (comments and feedback), production secret fallback removal, centralized CORS cleanup, Spring Security 401/403 JSON handling, privileged staff department validation and dropdown, and full suite test verification.

---

## 1. Scope

This implementation cycle addressed critical production readiness, access control, and specification alignment items across the UniAssist 360 platform:
1. **Real Password-Reset Email Delivery:** Runtime configuration diagnosis, non-blocking delivery refactoring, and safe token invalidation on failure.
2. **Ticket Comment Object-Level Authorization:** Remediation of IDOR/BOLA vulnerabilities on ticket comments, removal of `authorId` request-body fallbacks, and enforcement of strict proposal actor visibility.
3. **Feedback Object-Level Authorization:** Remediation of IDOR/BOLA vulnerabilities on ticket feedback and departmental performance summaries.
4. **Production Secret Hardening:** Elimination of hardcoded secret fallbacks (`JWT_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`) from main application properties while maintaining isolated test configuration.
5. **Centralized CORS Policy:** Total removal of wildcard `@CrossOrigin(origins = "*")` controller annotations in favor of central, configurable CORS in `SecurityConfig`.
6. **Consistent Spring Security 401/403 JSON:** Implementation of filter-chain `AuthenticationEntryPoint` and `AccessDeniedHandler` returning clean JSON payloads.
7. **Privileged Staff Department Controlled Dropdown:** Frontend dropdown replacement and backend validation enforcing proposal-aligned technical departments (`IT`, `Maintenance`, `Security`) for operational staff.

---

## 2. Password Reset Email Root Cause Analysis

### Runtime Configuration Diagnosis
An inspection of the effective runtime environment was executed to verify the status of externalized SMTP environment variables:

| Environment Variable | Status in Current Environment | Effective Behavior |
| :--- | :---: | :--- |
| `EMAIL_ENABLED` | **MISSING** | Defaults to `false` in `application.properties`; mail dispatch is skipped |
| `SMTP_HOST` | **MISSING** | Defaults to empty string `""`; Spring Boot does not auto-configure `JavaMailSender` |
| `SMTP_PORT` | **MISSING** | Defaults to `587` |
| `SMTP_USERNAME` | **MISSING** | Defaults to empty string `""` |
| `SMTP_PASSWORD` | **MISSING** | Defaults to empty string `""` |
| `SMTP_FROM` | **MISSING** | Defaults to `noreply@uniassist360.local` |
| `FRONTEND_URL` | **MISSING** | Defaults to canonical `http://localhost:5173` |

### Architectural Root Causes
1. **Silent Void Failure:** Prior to this task, `EmailService.sendEmail(...)` had a `void` return type and caught all exceptions internally without informing callers. Business services (including `PasswordResetService`) had no programmatic indication of whether the email was actually dispatched or silently skipped due to `app.email.enabled=false` or missing mail sender configuration.
2. **Orphaned Active Reset Credentials:** Because `PasswordResetService` assumed dispatch succeeded, an active `PasswordResetToken` record was persisted in the database with a 15-minute validity window. If email delivery failed or was disabled, this generated token remained valid in the database despite never reaching the user's inbox.
3. **Missing Network Timeouts:** Prior `application.properties` omitted explicit connection, read, and write timeouts for SMTP sockets, creating a risk that broken or hanging external SMTP servers could tie up backend thread pools.

---

## 3. Email Delivery Changes

### 3.1. `EmailService` Refactoring
* **Return Type:** Changed `void sendEmail(...)` to `boolean sendEmail(String to, String subject, String body)`.
* **Delivery Status Logic:**
  * If `app.email.enabled` is `false`: logs `INFO` message (`"Email delivery disabled (app.email.enabled=false). Skipping email to={}"`) and returns `false`.
  * If `mailSender == null`: logs `WARN` message (`"Email enabled but JavaMailSender is not configured. Set spring.mail.host. Skipping email to={}"`) and returns `false`.
  * If recipient `to` is blank: logs `WARN` and returns `false`.
  * If `mailSender.send(...)` succeeds: logs `INFO` and returns `true`.
  * If an exception occurs: catches the exception, logs diagnostic error details without exposing credentials or tokens, and returns `false`.

### 3.2. Password Reset Delivery & Token Invalidation
* In `PasswordResetService.requestReset(...)`, the return value of `emailService.sendEmail(...)` is captured.
* If delivery succeeds (`sent == true`), the token remains active for the user to consume via the link in their email.
* If delivery fails or is disabled (`sent == false`):
  * The service logs a warning: `log.warn("Password reset email delivery failed or was disabled for user id={}. Invalidating generated token.", user.getId());`
  * The newly generated token is immediately invalidated:
    ```java
    token.setUsedAt(now);
    token.setExpiresAt(now);
    tokenRepository.save(token);
    ```
  * The token cannot be used to reset passwords, preventing dangling credentials in the database.
* **Public Information Leak Prevention:** The public API response remains completely identical (`"If this email is registered, password reset instructions will be sent."` / `"If an active account exists for that email, a password reset request has been created."`). Public callers cannot infer whether the account exists or whether SMTP dispatch succeeded.

### 3.3. SMTP Configuration & Socket Timeouts
Added socket timeouts to `BackEnd/src/main/resources/application.properties`:
```properties
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000
```
To enable real email delivery, the following environment variables must be supplied:
```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net # or smtp.gmail.com, mail.university.edu, etc.
SMTP_PORT=587
SMTP_USERNAME=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=support@uniassist360.edu
FRONTEND_URL=http://localhost:5173
```

---

## 4. Security Vulnerabilities Fixed

### 4.1. Ticket Comment IDOR / BOLA Hardening
* **Vulnerability:** `POST /api/tickets/{id}/comments` and `GET /api/tickets/{id}/comments` relied strictly on coarse `@PreAuthorize` role checks. An authenticated student could submit a comment or read comments on any ticket by ID. Furthermore, `addComment` contained a dangerous fallback that accepted `authorId` from the JSON request body.
* **Remediation in [`TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java):**
  * Removed all request body `authorId` fallbacks. The comment author is strictly set to `getCurrentUser(auth)`.
  * Added `validateCommentAccess(ticket, currentUser, auth)`:
    * `STUDENT` & `LECTURER`: Can only read and post comments on tickets they created (`isCreator(ticket, currentUser)`). Internal staff notes are excluded from responses.
    * `SUPPORT_AGENT`: Can only read and post comments on tickets assigned to them in their department (`ticket.assignedTo.id == currentUser.id && ticket.department == currentUser.department`). Any attempt on unassigned tickets or tickets in another department returns `403 Forbidden`.
    * `TEAM_LEAD`: Can only read and post comments on tickets in their department (`ticket.department == currentUser.department`). Tickets from other departments return `403 Forbidden`.
    * `SYSTEM_ADMINISTRATOR`: System-wide oversight allowed.

### 4.2. Feedback IDOR / BOLA Hardening
* **Vulnerability:**
  * `GET /api/feedback/ticket/{ticketId}` had no object-level checks; any authenticated user could query feedback for any ticket.
  * `GET /api/feedback/agent/{agentId}/summary` allowed a Team Lead to inspect performance summaries of agents across other departments.
* **Remediation in [`FeedbackController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/FeedbackController.java):**
  * In `getFeedbackForTicket`:
    * `STUDENT` & `LECTURER`: Can only view feedback for tickets they created (`ticket.createdBy.id == currentUser.id`).
    * `SUPPORT_AGENT`: Can only view feedback for tickets assigned to them in their department.
    * `TEAM_LEAD`: Can only view feedback for tickets within their department.
    * `MANAGER_EXECUTIVE` & `SYSTEM_ADMINISTRATOR`: Authorized for system reporting and governance.
    * All unauthorized cross-user/cross-department requests return `403 Forbidden`.
  * In `getAgentSummary`:
    * `SUPPORT_AGENT`: Restricted strictly to their own summary (`currentUser.id == agentId`).
    * `TEAM_LEAD`: Restricted strictly to Support Agents belonging to their department (`agent.department.equalsIgnoreCase(currentUser.department)`). Cross-department requests return `403 Forbidden`.
    * `MANAGER_EXECUTIVE` & `SYSTEM_ADMINISTRATOR`: System-wide reporting access.

### 4.3. Unsafe Production Secret Fallback Removal
* **Vulnerability:** Main `application.properties` contained hardcoded fallback strings for `app.jwtSecret` and `app.bootstrap-admin.password`. If environment variables were omitted in production, the application would boot with well-known default secrets.
* **Remediation:**
  * In `BackEnd/src/main/resources/application.properties`:
    ```properties
    app.jwtSecret=${JWT_SECRET}
    app.bootstrap-admin.password=${BOOTSTRAP_ADMIN_PASSWORD}
    ```
    Starting the application in production now strictly requires explicit environment variables.
  * In `BackEnd/src/test/resources/application.properties`: Isolated safe test defaults are maintained so automated tests run reliably without polluting developer environments.

### 4.4. Complete Centralization of CORS Policy
* **Vulnerability:** Individual controllers (`FeedbackController`, `UserController`, `AuthController`, `AttachmentController`) contained redundant `@CrossOrigin(origins = "*")` wildcard annotations, conflicting with the central CORS policy.
* **Remediation:** Removed all `@CrossOrigin` annotations from all controllers. All requests and preflight `OPTIONS` requests now route exclusively through `corsConfigurationSource()` in `SecurityConfig.java`, which enforces `${FRONTEND_ORIGIN:http://localhost:5173}` and credentials support.

### 4.5. Consistent Spring Security 401/403 JSON Handling
* **Vulnerability:** Unauthenticated requests or invalid JWTs rejected at the filter-chain level returned container error pages or unstructured bodies.
* **Remediation in [`SecurityConfig.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/security/SecurityConfig.java):**
  * Added `AuthenticationEntryPoint` returning HTTP 401 with `Content-Type: application/json`:
    ```json
    {
      "message": "Full authentication is required to access this resource"
    }
    ```
  * Added `AccessDeniedHandler` returning HTTP 403 with `Content-Type: application/json`:
    ```json
    {
      "message": "Access denied: You do not have permission to access this resource"
    }
    ```

---

## 5. Privileged Staff Department Dropdown & Validation

### 5.1. Proposal-Supported Technical Departments
Technical support operations are strictly limited to the three proposal departments:
* `IT`
* `Maintenance`
* `Security`

Arbitrary values (e.g., `"Computing"`, `"IT Services"`, `"General"`, `"Facilities"`) are rejected for operational staff.

### 5.2. Role-Based Department Rules
* **Operational Roles (`SUPPORT_AGENT`, `TEAM_LEAD`):**
  * Department is **mandatory**.
  * Input is validated and normalized to canonical casing: `"IT" -> "IT"`, `"MAINTENANCE" -> "Maintenance"`, `"SECURITY" -> "Security"`.
  * Missing or unrecognized department returns **HTTP 400 Bad Request** (`"Department is required for operational staff (SUPPORT_AGENT, TEAM_LEAD). Allowed values: IT, Maintenance, Security"`).
* **Non-Operational Roles (`KNOWLEDGE_MANAGER`, `MANAGER_EXECUTIVE`, `SYSTEM_ADMINISTRATOR`):**
  * Department is not operationally required.
  * Backend automatically stores `null` to avoid erroneous technical queue routing.
  * In the UI modal, the department dropdown is disabled and automatically cleared when selecting these roles.
* **Academic Requesters (`STUDENT`, `LECTURER`):**
  * Requesters retain academic department semantics during self-registration and profile management; technical department constraints do not alter user registration.

### 5.3. Role Transition Safety
In `UserController.updateUserRole` and `FrontEnd/src/App.jsx`:
* Promoting an existing user to `SUPPORT_AGENT` or `TEAM_LEAD` verifies that the target user already possesses a valid technical department or supplies one in the request body. If the department is missing or invalid, the transition is rejected with HTTP 400 and a UI toast notification.

---

## 6. Files Changed

| Component | File Path | Nature of Change |
| :--- | :--- | :--- |
| **Backend Config** | [`BackEnd/src/main/resources/application.properties`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/resources/application.properties) | Removed secret fallbacks; added SMTP timeouts |
| **Backend Service** | [`BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java) | Changed `sendEmail` to return boolean; added non-secret logging |
| **Backend Service** | [`BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java) | Added immediate token invalidation on email dispatch failure |
| **Backend Security** | [`BackEnd/src/main/java/com/university/helpdesk/security/SecurityConfig.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/security/SecurityConfig.java) | Added 401 AuthenticationEntryPoint and 403 AccessDeniedHandler |
| **Backend Controller** | [`BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java) | Implemented object-level comment authorization; removed `authorId` fallback |
| **Backend Controller** | [`BackEnd/src/main/java/com/university/helpdesk/controller/FeedbackController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/FeedbackController.java) | Removed `@CrossOrigin`; added object-level checks for ticket feedback & agent summary |
| **Backend Controller** | [`BackEnd/src/main/java/com/university/helpdesk/controller/UserController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/UserController.java) | Removed `@CrossOrigin`; added technical department validation on create and role update |
| **Backend Controller** | [`BackEnd/src/main/java/com/university/helpdesk/controller/AuthController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/AuthController.java) | Removed redundant `@CrossOrigin` annotation |
| **Backend Controller** | [`BackEnd/src/main/java/com/university/helpdesk/controller/AttachmentController.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/controller/AttachmentController.java) | Removed redundant `@CrossOrigin` annotation |
| **Frontend UI** | [`FrontEnd/src/App.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/App.jsx) | Controlled department dropdown (`IT`, `Maintenance`, `Security`); role change safety guard |
| **Backend Tests** | [`BackEnd/src/test/java/com/university/helpdesk/SecurityHardeningAndDepartmentTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SecurityHardeningAndDepartmentTest.java) | New comprehensive security suite covering 401/403 JSON, comments, feedback, department rules |
| **Backend Tests** | [`BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java) | Added tests for email disabled, SMTP exceptions, and token invalidation |
| **Backend Tests** | [`BackEnd/src/test/java/com/university/helpdesk/Module1SecurityTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/Module1SecurityTest.java) | Aligned staff creation test fixture to use valid technical department `IT` |
| **Backend Tests** | [`BackEnd/src/test/java/com/university/helpdesk/TicketCancellationSecurityTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/TicketCancellationSecurityTest.java) | Aligned unauthenticated request test assertion to expect 401 Unauthorized |

---

## 7. API / Authorization Changes

| Endpoint | Method | Previous Authorization | Final Hardened Authorization Rule |
| :--- | :---: | :--- | :--- |
| `/api/tickets/{id}/comments` | `GET` | Role-level only (Staff or End-User) | **Student/Lecturer:** Own ticket only (internal notes stripped). **Support Agent:** Assigned ticket in same dept only. **Team Lead:** Same dept only. **Admin:** System-wide. |
| `/api/tickets/{id}/comments` | `POST` | Role-level; allowed body `authorId` | **Student/Lecturer:** Own ticket only. **Support Agent:** Assigned ticket in same dept only. **Team Lead:** Same dept only. **Author:** Strictly authenticated principal. |
| `/api/feedback/ticket/{ticketId}` | `GET` | Role-level only (any authenticated staff/user) | **Student/Lecturer:** Own ticket only. **Support Agent:** Assigned ticket in same dept only. **Team Lead:** Same dept only. **Manager/Admin:** System oversight. |
| `/api/feedback/agent/{agentId}/summary` | `GET` | Agent own check; Lead unrestricted | **Support Agent:** Own summary only (`agentId == authUser.id`). **Team Lead:** Support Agents in own department only. **Manager/Admin:** System oversight. |
| `/api/users` | `POST` | Admin only; accepted any department string | **Admin only:** Department required for `SUPPORT_AGENT` & `TEAM_LEAD` and must be `IT`, `Maintenance`, or `Security`. Cleared to `null` for other roles. |
| `/api/users/{id}/role` | `PUT` | Admin only; arbitrary role change | **Admin only:** Changing to `SUPPORT_AGENT` or `TEAM_LEAD` requires user to have a valid technical department; otherwise rejected with 400. |
| `/api/*` (unauthenticated) | ANY | Returned container 403 or HTML | Filter-chain returns **401 Unauthorized JSON** `{"message": "Full authentication is required to access this resource"}`. |
| `/api/*` (unauthorized role) | ANY | Returned 403 HTML or container format | Returns **403 Forbidden JSON** `{"message": "Access denied: You do not have permission to access this resource"}`. |

---

## 8. Tests Added and Updated

| Test Class | Total Tests | Behaviors Tested |
| :--- | :---: | :--- |
| [`SecurityHardeningAndDepartmentTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SecurityHardeningAndDepartmentTest.java) | **17** | • 401 JSON for missing auth<br>• 401 JSON for malformed JWT<br>• 403 JSON for role mismatch<br>• Student comment access on own ticket & denial on other tickets<br>• Support agent comment authorization (assigned vs unassigned vs cross-dept)<br>• Team lead comment authorization (same dept vs cross-dept)<br>• Admin comment oversight<br>• Feedback authorization per ticket for student, agent, lead, manager, admin<br>• Agent summary authorization (agent own, lead departmental, cross-dept denial)<br>• Privileged staff creation with valid/invalid/missing technical departments<br>• Role update validation for operational staff |
| [`SelfServicePasswordResetTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java) | **4** | • Full self-service flow with email link and raw token extraction<br>• Unknown email account enumeration protection<br>• Email delivery disabled leaves no active reset token in database<br>• SMTP sender exception leaves no active reset token in database |
| [`Module1SecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/Module1SecurityTest.java) | **9** | • Privileged staff account creation with valid department `IT`<br>• Authentication, password complexity, fallback resets, registration boundaries |
| [`TicketCancellationSecurityTest`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/TicketCancellationSecurityTest.java) | **8** | • Unauthenticated ticket deletion returns 401 JSON<br>• Creator cancellation and admin rejection rules |
| Other Existing Suites (`AnalyticsSlaTest`, `ChatbotGroundingTest`, `CleanStartupDataTest`, `RoleAccessAndAttachmentSecurityTest`, `SupportAgentResolutionSecurityTest`, `TicketWorkflowSecurityTest`) | **49** | All existing SLA calculations, attachment security, chatbot grounding, and workflow state transitions preserved |

**Total Backend Test Count:** **87 passing tests (0 failures, 0 errors, 0 skipped)**

---

## 9. Verification Results

```powershell
# 1. Full Backend Test Suite
mvn test
# Result: Tests run: 87, Failures: 0, Errors: 0, Skipped: 0 | BUILD SUCCESS (1m 10s)

# 2. Frontend Production Build
cmd /c npm run build
# Result: vite v8.2.1 building client environment for production...
# ✓ built in 1.36s (dist/assets/index-CuyAW16P.js 499.92 kB, 0 errors)

# 3. Frontend Static Analysis
cmd /c npm run lint
# Result: oxlint finished in 117ms on 24 files with 92 rules | 0 errors

# 4. Working Tree Hygiene
git diff --check
# Result: Clean exit (0 whitespace errors, 0 conflict markers)
```

---

## 10. Manual Testing Instructions

### 10.1. Real SMTP Reset Email Delivery
1. Set SMTP environment variables in your terminal before launching the backend:
   ```bash
   export EMAIL_ENABLED=true
   export SMTP_HOST=smtp.gmail.com # or university SMTP server
   export SMTP_PORT=587
   export SMTP_USERNAME=your-email@gmail.com
   export SMTP_PASSWORD="your-app-password"
   export SMTP_FROM=your-email@gmail.com
   export FRONTEND_URL=http://localhost:5173
   ```
2. Start backend (`mvn spring-boot:run`) and frontend (`npm run dev`).
3. Open browser at `http://localhost:5173/login` and click **"Forgot your password?"**.
4. Enter an active registered user's email address and click **"Send Reset Link"**.
5. Check your inbox: verify the email arrived with subject `"UniAssist 360 - Password Reset Request"`.
6. Click the link in the email: verify it opens `http://localhost:5173/password-reset?token=...` with the token auto-populated in the form.
7. Enter a new password meeting policy rules and submit: verify successful reset, followed by successful sign-in with the new password.

### 10.2. Privileged Staff Creation with Department Dropdown
1. Sign in as `SYSTEM_ADMINISTRATOR` (`admin`).
2. Navigate to **Users & Roles** (`/users`).
3. Click **"➕ Create Staff Member"**.
4. Select Role: `SUPPORT_AGENT` or `TEAM_LEAD`:
   * Observe that the **Department** dropdown becomes active and marked with an asterisk `*`.
   * Inspect dropdown options: verify only `Select Department`, `IT`, `Maintenance`, `Security` are present.
   * Attempting to submit without selecting a department is blocked by browser validation.
   * Select `IT`, complete other fields, and submit: verify account is created with department `IT`.
5. Open the modal again and select Role: `KNOWLEDGE_MANAGER` or `MANAGER_EXECUTIVE`:
   * Observe that the **Department** dropdown is disabled and automatically cleared.
   * Submit: verify account is created with `department: null`.

### 10.3. Comments & Feedback Cross-User Denial (IDOR Verification)
1. Sign in as Student A and create Ticket #1.
2. Note the ticket ID (e.g., `1`).
3. In a separate tab/session, sign in as Student B.
4. Using browser devtools or curl:
   ```bash
   curl -X POST http://localhost:8080/api/tickets/1/comments \
     -H "Authorization: Bearer <Student_B_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"content": "Unauthorized comment"}'
   ```
5. Verify response: **HTTP 403 Forbidden** with JSON message `{"message": "Access denied: You can only access comments on your own tickets"}`.
6. Attempt to query feedback for Ticket #1 as Student B:
   ```bash
   curl -X GET http://localhost:8080/api/feedback/ticket/1 \
     -H "Authorization: Bearer <Student_B_JWT>"
   ```
7. Verify response: **HTTP 403 Forbidden** with JSON message `{"message": "Access denied: You can only view feedback for your own tickets"}`.

---

## 11. Remaining Proposal Gaps (Reserved for Next Milestones)

In strict adherence to instructions, out-of-scope modules were not implemented in this phase and remain scheduled for subsequent milestones:
1. **Agent Activity Logs:** Granular activity telemetry tracking individual agent actions (record views, draft notes, queue browsing) beyond ticket assignment history.
2. **Manager Analytics Comments / Insights:** Departmental analytics collaboration thread allowing executive leaders and managers to attach notes and strategic commentary to dashboard reports.

---

## 12. Known Assumptions & Limitations

1. **Local IntelliJ / IDE Execution:** Because production fallback secrets (`JWT_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`) were removed from `src/main/resources/application.properties`, running `HelpdeskApplication` directly in an IDE requires setting VM options (`-DJWT_SECRET=... -DBOOTSTRAP_ADMIN_PASSWORD=...`) or environment variables in the run configuration. The automated test configuration (`src/test/resources/application.properties`) includes dedicated test values and runs without manual setup.
2. **Email Server Availability:** When `EMAIL_ENABLED=false` or when an external SMTP server is unreachable, self-service password reset safely invalidates the generated token and returns the standard generic message without exposing internal delivery state.
3. **Repository Cleanliness:** No commits or pushes have been performed. All changes remain unstaged in the local working directory.
