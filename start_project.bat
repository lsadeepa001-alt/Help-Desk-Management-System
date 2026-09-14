@ECHO OFF
REM ============================================================================
REM  University Help Desk — 1-Click Startup Script (Windows)
REM  Launches both Spring Boot Backend and React Frontend
REM ============================================================================
TITLE University Help Desk Launcher
COLOR 0A

ECHO ============================================================
ECHO    University Help Desk — Project Startup
ECHO ============================================================
ECHO.

REM ── Check Java ──
WHERE java >NUL 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    ECHO [ERROR] Java is not installed or not in PATH.
    ECHO         Please install Java 17 or later from https://adoptium.net
    PAUSE
    EXIT /B 1
)
FOR /F "tokens=3" %%A IN ('java -version 2^>^&1 ^| FIND "version"') DO SET JAVA_VER=%%~A
ECHO [OK] Java found: %JAVA_VER%

REM ── Check Node.js ──
WHERE node >NUL 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    ECHO [ERROR] Node.js is not installed or not in PATH.
    ECHO         Please install Node.js 18+ from https://nodejs.org
    PAUSE
    EXIT /B 1
)
FOR /F "tokens=1" %%A IN ('node -v') DO SET NODE_VER=%%A
ECHO [OK] Node.js found: %NODE_VER%

REM ── Check MySQL ──
WHERE mysql >NUL 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] MySQL client found in PATH
) ELSE (
    ECHO [WARN] MySQL client not found in PATH. Ensure MySQL Server is running on port 3306.
)

ECHO.
ECHO ============================================================
ECHO    Starting Backend (Spring Boot on port 8080)...
ECHO ============================================================

REM ── Launch Backend in a new terminal ──
START "HelpDesk Backend" CMD /K "cd /d %~dp0BackEnd && IF EXIST mvnw.cmd (mvnw.cmd spring-boot:run) ELSE (mvn spring-boot:run)"

ECHO [OK] Backend terminal launched.
ECHO.

REM ── Install npm packages if needed ──
IF NOT EXIST "%~dp0FrontEnd\node_modules\" (
    ECHO [INFO] node_modules not found. Running npm install...
    START "npm install" /WAIT CMD /C "cd /d %~dp0FrontEnd && npm install"
    ECHO [OK] npm install completed.
)

ECHO ============================================================
ECHO    Starting Frontend (React on port 5173)...
ECHO ============================================================

REM ── Launch Frontend in a new terminal ──
START "HelpDesk Frontend" CMD /K "cd /d %~dp0FrontEnd && npm run dev"

ECHO [OK] Frontend terminal launched.
ECHO.
ECHO ============================================================
ECHO    Both servers are starting up!
ECHO    Backend:  http://localhost:8080/api
ECHO    Frontend: http://localhost:5173
ECHO ============================================================
ECHO.
ECHO You can close this window. The servers run in their own terminals.
PAUSE
