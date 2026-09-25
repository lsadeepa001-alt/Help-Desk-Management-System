# UniAssist 360 – Engineering Implementation Report: Self-Service Password Reset Runtime Integration Fix

**Project:** UniAssist 360 (University Help Desk Management System)  
**Academic Baseline:** SLIIT SE2030 (Group KU-09)  
**Scope of Report:** Detailed engineering documentation for the diagnosis, remediation, and end-to-end verification of the self-service password reset frontend runtime crash, canonical route divergence, and test suite synchronization.

---

## 1. Executive Summary

This report documents the resolution of runtime integration bugs identified in the Self-Service Password Reset subsystem of UniAssist 360.

During runtime verification, two critical integration discrepancies were uncovered:
1. **Frontend Blank Screen Crash:** Clicking "Forgot your password?" on the login page triggered an unhandled React runtime error (`ReferenceError: useEffect is not defined`), preventing users from accessing the password reset interface.
2. **Canonical Route Discrepancy:** The backend email dispatch service generated password reset links pointing to `/reset-password?token=...`, whereas the canonical frontend route registered in `App.jsx` and referenced by `LoginPage.jsx` is `/password-reset`.

Both issues have been remediated in the working copy without introducing regressions or modifying unrelated system modules. The complete backend test suite (68 tests), the focused regression test (`SelfServicePasswordResetTest`), the frontend production build, and lint checks all pass with zero errors. In accordance with operational constraints, no commits or pushes have been performed.

---

## 2. Issue Analysis & Root Cause Diagnosis

### Problem 1: `PasswordResetPage.jsx` React Hook Runtime Crash
* **Symptom:** When a user navigates to `/password-reset` (or clicks "Forgot your password?" on the login page), the application renders a completely blank white screen. The browser developer console reports:
  ```text
  Uncaught ReferenceError: useEffect is not defined
      at PasswordResetPage (PasswordResetPage.jsx:17:5)
  ```
* **Root Cause:** In [`FrontEnd/src/pages/PasswordResetPage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/PasswordResetPage.jsx), line 1 only imported `{ useState }` from `'react'`:
  ```javascript
  import React, { useState } from 'react';
  ```
  However, on line 17, the component invoked `useEffect` to extract the reset token from the URL query parameters:
  ```javascript
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);
  ```
  Because `useEffect` was never imported, the JavaScript engine threw a `ReferenceError` during the component's initial render cycle, unmounting the component tree.

### Problem 2: Canonical Route Divergence in Email Dispatch
* **Symptom:** When a user initiated a self-service password reset, the generated email body instructed the user to click:
  ```text
  http://localhost:5173/reset-password?token=<RAW_TOKEN>
  ```
  However, the application routing table configured in [`FrontEnd/src/App.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/App.jsx) only maps:
  ```jsx
  <Route
    path="/password-reset"
    element={
      <GuestOnlyRoute>
        <PasswordResetPage />
      </GuestOnlyRoute>
    }
  />
  ```
  Navigating to `/reset-password` would fail to match any route, redirecting the user to `/login` or displaying a 404 fallback without the reset form.
* **Root Cause:** In [`BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java), line 73 constructed the link using the hardcoded path `/reset-password`:
  ```java
  String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
  ```

### Problem 3: Regression Test Assertion Divergence
* **Symptom:** The backend test [`BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java) asserted the presence of the outdated route `/reset-password?token=`:
  ```java
  assertTrue(body.contains("http://localhost:5173/reset-password?token="), "Email body must contain reset URL with token");
  ```
  Aligning the backend link generation to `/password-reset` required synchronizing this assertion to maintain test suite integrity.

---

## 3. Implementation Details & Code Changes

### 3.1. Frontend Import Correction
In [`FrontEnd/src/pages/PasswordResetPage.jsx`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/FrontEnd/src/pages/PasswordResetPage.jsx):
* Updated line 1 to include `useEffect`:
```javascript
// Before
import React, { useState } from 'react';

// After
import React, { useEffect, useState } from 'react';
```
* **Preservation:** All URL query parameter extraction, state binding (`setToken`), user notifications, and multi-step reset forms remain intact.

### 3.2. Backend Canonical Reset Link Format
In [`BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java):
* Updated line 73 to generate `/password-reset?token=`:
```java
// Before
String resetLink = frontendUrl + "/reset-password?token=" + rawToken;

// After
String resetLink = frontendUrl + "/password-reset?token=" + rawToken;
```

### 3.3. Test Assertion Alignment
In [`BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java`](file:///d:/SLIIT-Y2-S1/Web-Base-Help-Desk/BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java):
* Updated line 101 to validate the canonical URL:
```java
// Before
assertTrue(body.contains("http://localhost:5173/reset-password?token="), "Email body must contain reset URL with token");

// After
assertTrue(body.contains("http://localhost:5173/password-reset?token="), "Email body must contain reset URL with token");
```

---

## 4. Security & Architectural Invariants Preserved

Throughout this remediation, all core security mechanisms of UniAssist 360 were strictly preserved:

1. **Cryptographic Token Safety:**
   * Raw tokens are generated using `SecureRandom` with 32 random bytes encoded in URL-safe Base64.
   * Only the SHA-256 digest (`tokenHash`) is persisted to the database.
   * The raw token is never logged, never saved in database tables, and never exposed in REST API response payloads.
2. **Account Enumeration Protection:**
   * Regardless of whether an email exists in the system or is unknown/disabled, the API returns the exact same generic message: `"If this email is registered, you will receive password reset instructions."`
3. **Session Invalidation on Password Change:**
   * Successfully confirming a reset updates the password (BCrypt hashed) and increments the user's `tokenVersion`.
   * All previously issued JWT tokens for that user are immediately rejected by `JwtAuthenticationFilter`.
4. **Token Expiration & Single-Use:**
   * Tokens expire after 15 minutes.
   * Consumed tokens are flagged with `used = true` and rejected on subsequent attempts.
5. **Per-Tab Authentication Isolation:**
   * Maintained per-tab `sessionStorage` token isolation across the entire frontend application.

---

## 5. Verification Results

### 5.1. Focused Regression Test
Command:
```powershell
mvn test -Dtest=SelfServicePasswordResetTest
```
Result: **BUILD SUCCESS**
* `testSelfServicePasswordResetFlowWithEmail()`: **PASS**
* `testUnknownEmailDoesNotLeakUserExistence()`: **PASS**
* Tests run: 2, Failures: 0, Errors: 0, Skipped: 0

### 5.2. Full Backend Test Suite
Command:
```powershell
mvn test
```
Result: **BUILD SUCCESS**
* Total test execution time: 01:09 min
* **Tests run: 68, Failures: 0, Errors: 0, Skipped: 0**
* Full test breakdown:
  * `ChatbotGroundingTest`: 3/3 PASS
  * `SelfServicePasswordResetTest`: 2/2 PASS
  * `AnalyticsSlaTest`: 6/6 PASS
  * `SupportAgentResolutionSecurityTest`: 6/6 PASS
  * `TicketCancellationSecurityTest`: 8/8 PASS
  * `TicketWorkflowSecurityTest`: 8/8 PASS
  * `RoleAccessAndAttachmentSecurityTest`: 25/25 PASS
  * `Module1SecurityTest`: 9/9 PASS
  * `CleanStartupDataTest`: 1/1 PASS

### 5.3. Frontend Production Build
Command:
```cmd
cmd /c npm run build
```
Result: **PASS**
* Vite v8.2.1 built client environment for production in 1.16s.
* 96 modules transformed, 0 syntax/bundling errors.
* Output assets:
  * `dist/index.html` (0.45 kB)
  * `dist/assets/index-BSEKyE0T.css` (87.92 kB)
  * `dist/assets/index-7BADEPP2.js` (499.07 kB)

### 5.4. Frontend Linter
Command:
```cmd
cmd /c npm run lint
```
Result: **PASS**
* Oxlint finished on 24 files with 92 rules in 154ms.
* **0 errors** (15 benign warnings from existing legacy code, zero in `PasswordResetPage.jsx`).

### 5.5. Git Hygiene Check
Command:
```powershell
git diff --check
```
Result: **PASS**
* Clean output: 0 trailing whitespaces, 0 merge conflict markers.

---

## 6. Verification Matrix Summary

| Verification Check | Target / Scope | Command Executed | Result |
| :--- | :--- | :--- | :---: |
| **Focused Test** | Self-Service Reset & Email Dispatch | `mvn test -Dtest=SelfServicePasswordResetTest` | **PASS** (2/2) |
| **Full Backend Suite** | All 9 Security & Lifecycle Suites | `mvn test` | **PASS** (68/68) |
| **Frontend Production Build** | Vite Client Bundle | `cmd /c npm run build` | **PASS** (0 errors) |
| **Frontend Static Analysis** | Oxlint Linter | `cmd /c npm run lint` | **PASS** (0 errors) |
| **Git Working Tree Hygiene** | Whitespace & Conflict Markers | `git diff --check` | **PASS** (Clean) |

---

## 7. Status & Repository State

* **Branch:** `master`
* **Commit / Push Status:** Strictly preserved without commits or pushes.
* **Working Tree State:** Only 4 files modified:
  1. `FrontEnd/src/pages/PasswordResetPage.jsx` (added `useEffect` import)
  2. `BackEnd/src/main/java/com/university/helpdesk/service/PasswordResetService.java` (route canonicalization)
  3. `BackEnd/src/test/java/com/university/helpdesk/SelfServicePasswordResetTest.java` (test assertion update)
  4. `report.md` (this engineering report)
