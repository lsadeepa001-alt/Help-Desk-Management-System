# UniAssist360 — SMTP Delivery & Legacy ACCEPTED Removal Report

**Date:** September 28, 2026
**Repository Branch:** `master`
**Execution Context:** Local Development & Continuous Verification

---

## 1. Scope

This task addressed exclusively two core engineering objectives aligned with the approved SE2030 UniAssist360 project proposal:

1. **SMTP / Email Delivery Configuration Reliability:** Establishing a secure, robust runtime configuration mechanism for local development using Spring Boot Config Data (`.env` loading) and safe diagnostic logging, without hardcoded credentials, token exposure, or TLS degradation.
2. **Complete Removal of Obsolete `ACCEPTED` Ticket Status:** Purging all remnants of the deprecated `ACCEPTED` status across models, controllers, services, analytics, tests, and frontend components following database verification confirming zero existing tickets in this state.

No unrelated modules were altered. No UI redesign was performed. The public homepage was not touched. No commits or pushes were made to git.

---

## 2. Proposal Requirements

The approved SE2030 Project Proposal establishes the following authoritative requirements:

* **Central Notification & Messaging Management:** The system must generate event-driven notifications for key ticket events (ticket submission, department assignment, and status updates). It must support both in-app notification alerts and SMTP email delivery.
* **Notification Preferences:** Users must retain granular control over their notification channels (in-app vs. email) and event triggers via user-configurable notification delivery preferences.
* **Self-Service Password Reset:** Password recovery is a mandatory self-service function allowing active users to request a time-limited reset link sent via SMTP email without administrator intervention.
* **Ticket Lifecycle Engine:** The core proposal ticket lifecycle consists of creation (`OPEN`) → routing/assignment (`IN_PROGRESS`) → status tracking → resolution (`RESOLVED`) → closure (`CLOSED`), along with supporting states (`REOPENED`, `CANCELLED`, `REJECTED`). The legacy status `ACCEPTED` was an unneeded intermediate triage state not specified in the proposal lifecycle.

---

## 3. SMTP Root Cause Analysis

Investigation revealed why SMTP delivery previously failed or appeared inoperative in local development environments:

### A. Application Logic vs. Configuration
* **Application Logic:** The application logic in `EmailService.java`, `NotificationService.java`, and `PasswordResetService.java` was already sound. `EmailService` properly integrated with Spring's `JavaMailSender`, and `PasswordResetService` correctly triggered reset email generation.
* **Runtime Configuration:** In standard local environments, SMTP properties (`spring.mail.host`, `spring.mail.username`, `spring.mail.password`) were not set, and `app.email.enabled` defaulted to `false`. Crucially, local developers had no standardized, automated mechanism to load these properties from a `.env` file without setting OS-level environment variables manually.
* **Sender Address Fallback:** `app.email.from` defaulted to `noreply@uniassist360.local`. Most modern SMTP relays (e.g., Gmail, SendGrid, Mailgun) reject outbound messages when the envelope sender or `From:` address does not match the authenticated account username.

### B. Decoupling User Preference from Administrative Delivery
* For **Ticket Lifecycle Notifications**, emails require **both** global SMTP enablement (`EMAIL_ENABLED=true`) AND the user's explicit preference (`emailEnabled=true` in `UserNotificationPreferences`). Because user preference defaults to `false`, users without updated profiles did not receive lifecycle emails even if SMTP was configured.
* For **Password Reset**, email delivery is an essential self-service security recovery mechanism and must **never** depend on notification preferences.

---

## 4. SMTP Changes

The following files and components were updated to provide reliable email delivery:

1. **`BackEnd/src/main/resources/application.properties`:**
   * Added Spring Boot Config Data optional import:
     ```properties
     spring.config.import=optional:file:./.env[.properties],optional:file:../.env[.properties],optional:file:./BackEnd/.env[.properties]
     ```
     This allows Spring Boot to automatically discover and read `.env` files located in the repository root, parent folder, or `BackEnd` directory across command-line, wrapper script, and IDE execution.
   * Updated dynamic fallback for sender address:
     ```properties
     app.email.from=${SMTP_FROM:${SMTP_USERNAME:noreply@uniassist360.local}}
     ```
   * Added configurable transport properties for authentication, STARTTLS, SSL, and timeouts:
     ```properties
     spring.mail.properties.mail.smtp.auth=${SMTP_AUTH:true}
     spring.mail.properties.mail.smtp.starttls.enable=${SMTP_STARTTLS:true}
     spring.mail.properties.mail.smtp.starttls.required=${SMTP_STARTTLS_REQUIRED:true}
     spring.mail.properties.mail.smtp.ssl.enable=${SMTP_SSL:false}
     spring.mail.properties.mail.smtp.connectiontimeout=${SMTP_TIMEOUT:5000}
     spring.mail.properties.mail.smtp.timeout=${SMTP_TIMEOUT:5000}
     spring.mail.properties.mail.smtp.writetimeout=${SMTP_TIMEOUT:5000}
     ```

2. **`BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java`:**
   * Implemented `getEffectiveFromAddress()` to resolve sender priority: `SMTP_FROM` → `SMTP_USERNAME` → `noreply@uniassist360.local`.
   * Added startup diagnostic logging via `@PostConstruct public void logDiagnostics()` that safely reports configuration status (`ENABLED`, `DISABLED`, or `INCOMPLETE`) without leaking credentials or passwords.
   * Ensured `SimpleMailMessage.setFrom(...)` uses `getEffectiveFromAddress()`.

3. **`BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java`:**
   * Updated `testSelfServicePasswordResetFlow` to assert that `sentMessage.getFrom()` is populated and matches configured sender behavior.
   * Added `testEffectiveFromAddressResolution()` validating sender precedence.

4. **Launchers & Project Documentation (`start_project.bat`, `start_project.sh`, `README.md`):**
   * Added automated `.env` file detection in startup scripts.
   * Added comprehensive SMTP setup guide to `README.md`.

---

## 5. Secure Configuration Architecture

| Component | Policy & Implementation |
|---|---|
| **`.env.example`** | Tracked in Git. Contains placeholder configuration keys with detailed comments and zero secrets. |
| **`.env`** | Strictly ignored by `.gitignore` (`.env` and `*.env.local`). Never tracked or committed. |
| **Precedence** | OS environment variables override `.env` properties, which override default `application.properties`. |
| **Credential Safety** | Passwords (`SMTP_PASSWORD`), tokens, and JWT keys are never logged by `logDiagnostics()` or API endpoints. |
| **Sender Address** | Automatically aligns with `SMTP_FROM` or `SMTP_USERNAME` to prevent relay rejections (e.g. 550 5.7.1). |
| **TLS Integrity** | Standard TLS/STARTTLS verification is enforced (`trust="*"` is prohibited). |

---

## 6. Password Reset Security Verification

The self-service password reset mechanism maintains strict zero-knowledge security:

```
[User submits email] ──> POST /api/auth/password-reset/request
                              │
                              ├── 1. Generate 32 cryptographically secure random bytes
                              ├── 2. Encode to URL-safe Base64 (Raw Token)
                              ├── 3. Compute SHA-256 hex digest (Token Hash)
                              ├── 4. Invalidate prior active tokens for user
                              ├── 5. Save PasswordResetToken(user, tokenHash, expiresAt=now+15min)
                              ├── 6. Send email with URL: FRONTEND_URL/password-reset?token=<Raw Token>
                              │      └── If SMTP fails: Invalidate newly created token immediately
                              └── 7. Return generic response {"message": "..."} (Enumeration-safe)

[User clicks email link] ──> FrontEnd /password-reset?token=<Raw Token>
                              │
                              └── User submits new password ──> POST /api/auth/password-reset/confirm
                                                                     │
                                                                     ├── 1. Hash incoming raw token with SHA-256
                                                                     ├── 2. Locate active, non-expired matching token
                                                                     ├── 3. Mark token as used (usedAt = now)
                                                                     ├── 4. Update user password (BCrypt hashed)
                                                                     ├── 5. Increment user.tokenVersion
                                                                     │      └── Automatically invalidates all active JWT sessions
                                                                     └── 6. Return 200 OK
```

---

## 7. Ticket Notification Email Verification

Ticket lifecycle notification delivery strictly honors user preferences and system settings:

* **Global SMTP Switch (`app.email.enabled`):** When `false`, all outbound emails are skipped and logged at `INFO` level. In-app notifications remain unaffected.
* **Per-User Email Preference (`UserNotificationPreferences.isEmailEnabled()`):** Defaults to `false`. System event emails (ticket creation, assignment, status change, comments, CSAT requests) are dispatched only if the user has opted in via their Profile settings.
* **In-App Notification Decoupling:** In-app notifications are generated independently according to `isTicketCreatedEnabled()`, `isTicketAssignedEnabled()`, etc. Email delivery failures do not roll back ticket transactions or prevent in-app notification creation.

---

## 8. Complete Removal of Obsolete `ACCEPTED` Status

### Database Verification
Manual verification in MySQL Workbench confirmed zero rows with status `ACCEPTED`:
```sql
SELECT * FROM tickets WHERE status = 'ACCEPTED';
-- Result: 0 rows returned
```

### Removals Executed
1. **Enum (`Status.java`):** Removed `ACCEPTED` entirely from the enum definition.
2. **Controller (`TicketController.java`):** Removed the `PUT /api/tickets/{id}/accept` endpoint. The `PUT /api/tickets/{id}/reject` endpoint and `reviewTicket` business logic were preserved.
3. **Service (`TicketService.java`):**
   * Removed `ticket.getStatus() != Status.ACCEPTED` validation in `assignTicket`.
   * Removed `Status.ACCEPTED` from assignment auto-transition logic.
   * Removed `newStatus == Status.ACCEPTED` restriction in `updateStatus`.
   * Removed `case ACCEPTED -> newStatus == Status.IN_PROGRESS;` from the transition state switch.
4. **Analytics (`AnalyticsService.java`):** Removed `acceptedTickets` stream filter and summary map entry.
5. **Frontend Components:**
   * Removed `ACCEPTED: 'bg-cyan-500'` from `AnalyticsDashboard.jsx`.
   * Removed `ACCEPTED: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'` from `TicketList.jsx`.
6. **Tests:** Updated `ProposalAlignmentSecurityTest.java` to verify that `PUT /api/tickets/{id}/accept` returns `404 Not Found` (endpoint unmapped).

### Remaining Clean Proposal Lifecycle
The operational status transitions now strictly mirror the SE2030 proposal:
$$\text{OPEN} \xrightarrow{\text{Assignment / Claim}} \text{IN\_PROGRESS} \xrightarrow{\text{Resolution + Notes}} \text{RESOLVED} \xrightarrow{\text{Closure}} \text{CLOSED}$$
$$\text{RESOLVED / CLOSED} \xrightarrow{\text{Reopen}} \text{REOPENED} \xrightarrow{\text{Re-work}} \text{IN\_PROGRESS / RESOLVED}$$
$$\text{OPEN} \xrightarrow{\text{Cancel (Student)}} \text{CANCELLED} \quad\Big|\quad \text{OPEN} \xrightarrow{\text{Reject (Staff)}} \text{REJECTED}$$

---

## 9. Database Impact & Schema Analysis

* **Column Definition:** In MySQL `helpdesk_db`, `tickets.status` is mapped via Hibernate JPA `@Enumerated(EnumType.STRING)` as `VARCHAR(30)`.
* **DDL Impact:** Because the column type is `VARCHAR(30)` rather than a MySQL native enum, no `ALTER TABLE` statement or DDL migration was needed to remove `ACCEPTED`. Valid string values persisted in `tickets.status` continue to be validated against the Java `Status` enum.
* **Reference DDL (Informational Only):** If a deployment ever uses a native MySQL `ENUM`, the following safe migration statement removes `ACCEPTED` without affecting existing records:
  ```sql
  -- Informational only (NOT executed — tickets.status is VARCHAR(30)):
  -- ALTER TABLE tickets MODIFY COLUMN status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED', 'REJECTED') NOT NULL;
  ```

---

## 10. Files Changed

### Backend Core & Services
* `BackEnd/src/main/java/com/university/helpdesk/model/Status.java` — Removed `ACCEPTED` enum constant.
* `BackEnd/src/main/java/com/university/helpdesk/controller/TicketController.java` — Removed `PUT /api/tickets/{id}/accept` endpoint.
* `BackEnd/src/main/java/com/university/helpdesk/service/TicketService.java` — Removed `ACCEPTED` transition and assignment checks.
* `BackEnd/src/main/java/com/university/helpdesk/service/AnalyticsService.java` — Removed `acceptedTickets` counting and summary entry.
* `BackEnd/src/main/java/com/university/helpdesk/service/EmailService.java` — Added `@PostConstruct` safe diagnostics, `getEffectiveFromAddress()`, and host/port/username injection.

### Configuration & Scripts
* `BackEnd/src/main/resources/application.properties` — Added `spring.config.import` for `.env` loading, refined SMTP properties and sender address fallback.
* `.env.example` — Added sanitized local configuration template with zero credentials.
* `start_project.bat` — Added `.env` configuration detection and developer alert.
* `start_project.sh` — Added `.env` configuration detection and developer alert.

### Frontend
* `FrontEnd/src/components/AnalyticsDashboard.jsx` — Removed `ACCEPTED` from `statusColors`.
* `FrontEnd/src/components/TicketList.jsx` — Removed `ACCEPTED` from `statusColors`.

### Documentation
* `README.md` — Added detailed SMTP & Email Delivery setup guide.
* `report.md` — Authoritative record of implementation and verification.

### Tests
* `BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java` — Added `getFrom()` sender assertions and `testEffectiveFromAddressResolution()`.
* `BackEnd/src/test/java/com/university/helpdesk/ProposalAlignmentSecurityTest.java` — Updated `legacyAcceptedEndpointIsRemoved()` to assert `404 Not Found`.

---

## 11. Automated Verification Results

### Backend Maven Build & Test Suite
```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.university.helpdesk.AssignmentHistorySecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.ChatbotGroundingTest ... [PASS]
[INFO] Running com.university.helpdesk.CSATSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.DepartmentScopingSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.HelpdeskApplicationTests ... [PASS]
[INFO] Running com.university.helpdesk.KnowledgeBaseSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.ProposalAlignmentSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.SelfServicePasswordResetTest ... [PASS]
[INFO] Running com.university.helpdesk.SupportAgentResolutionSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.TicketCancellationSecurityTest ... [PASS]
[INFO] Running com.university.helpdesk.TicketWorkflowSecurityTest ... [PASS]
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 102, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

### Frontend Build
```
> frontend@0.0.0 build
> vite build

vite v8.2.1 building client environment for production...
✓ 96 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index--PHRfliE.css   90.43 kB │ gzip:  12.67 kB
dist/assets/index-k1fillU3.js   516.88 kB │ gzip: 138.40 kB
✓ built in 973ms
```

### Frontend Linting
```
> frontend@0.0.0 lint
> oxlint

Found 15 warnings and 0 errors.
Finished in 97ms on 24 files with 92 rules using 8 threads.
```

### Git Diff Check
```
git diff --check
Result: 0 whitespace errors or conflict markers.
```

---

## 12. Manual Real SMTP Smoke-Test Procedure

To test real email delivery with an actual external SMTP provider (such as Gmail, Brevo, or Mailtrap):

### Step 1: Local Configuration
1. In the repository root, copy the template:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with actual provider credentials:
   ```properties
   EMAIL_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-real-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM=your-real-email@gmail.com
   FRONTEND_URL=http://localhost:5173
   ```
3. Start or restart the backend:
   ```bash
   cd BackEnd
   ./mvnw spring-boot:run
   ```
4. Verify backend startup log displays:
   ```
   [INFO] Email delivery: ENABLED
   [INFO] SMTP host: configured
   [INFO] SMTP port: 587
   [INFO] SMTP username: configured
   [INFO] SMTP from address: configured
   ```

### Step 2: Password Reset Test
1. In MySQL or via UI, ensure a user account exists with a real, accessible email address (e.g. `your-real-email@gmail.com`) and status `ACTIVE`.
2. Open the browser at `http://localhost:5173/login`.
3. Click **"Forgot your password?"** to open `/password-reset`.
4. Enter the email address and submit the form.
5. Verify the backend console logs: `[INFO] ... Email sent to=your-real-email@gmail.com subject=UniAssist 360 - Password Reset Request`.
6. Open your email inbox, find the message, and click the link: `http://localhost:5173/password-reset?token=...`.
7. Fill in the new password and click **Reset Password**.
8. Confirm the password update succeeds, then log in using the new password.

### Step 3: Ticket Lifecycle Email Notification Test
1. Log in to `http://localhost:5173` as a student or staff member.
2. Navigate to **Profile** → **Notification Delivery Preferences**.
3. Toggle **Email Notifications** to **ON** and click **Save Preferences**.
4. Create a new support ticket or assign an existing ticket.
5. Verify an in-app notification appears in the notification drawer AND an email is received at the user's email address.
6. Toggle **Email Notifications** to **OFF** in Profile and trigger another ticket update.
7. Verify an in-app notification is created, but no email is dispatched.

---

## 13. Remaining Issues

None. All objectives have been completed:
* SMTP runtime configuration via `.env` is operational, secure, and non-destructive.
* Diagnostic logging is safe and secret-free.
* `ACCEPTED` ticket status has been completely eradicated with zero orphaned references.
* Full regression test suite passed with 102/102 green tests.
