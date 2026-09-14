@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF)
@REM Maven Wrapper startup batch script for Windows
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_PSMODULEP_SAVE__=%PSModulePath%
@SET PSModulePath=
@FOR /F "usebackq tokens=1* delims==" %%A IN (`powershell -noprofile "& {$scriptDir='%~dp0teleType'; $, ='distributionUrl'; foreach($line in (Get-Content ($scriptDir+'\..\\.mvn\\wrapper\\maven-wrapper.properties'))) { if ($line -match '^distributionUrl=(.*)') { Write-Output ('__MVNW_CMD__='+$matches[1]); break } }}"`) DO @(
  IF /I "%%A"=="__MVNW_CMD__" SET __MVNW_CMD__=%%B
)
@SET PSModulePath=%__MVNW_PSMODULEP_SAVE__%
@SET __MVNW_PSMODULEP_SAVE__=
@SET MVNW_VERBOSE=
@IF NOT "%MVNW_VERBOSE%"=="" (
  @ECHO +----------------------------------------------------------+
  @ECHO ^|       Maven Wrapper - version 3.3.2                      ^|
  @ECHO +----------------------------------------------------------+
)

@REM Extension to allow automatically downloading the maven-wrapper.jar
@REM from a configured repository
@SET WRAPPER_JAR="%~dp0\.mvn\wrapper\maven-wrapper.jar"

@REM If the maven-wrapper.jar already exists, skip download
@IF EXIST %WRAPPER_JAR% GOTO runMaven

@REM Determine java command to use
@SET JAVA_EXE=java.exe
@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

@REM Find java.exe
@IF NOT "%JAVA_HOME%"=="" (
  @SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

@REM Fallback: download wrapper jar with PowerShell
@IF NOT EXIST %WRAPPER_JAR% (
  @FOR /F "usebackq tokens=1* delims==" %%A IN (`powershell -noprofile "& {$scriptDir='%~dp0teleType'; $, ='wrapperUrl'; foreach($line in (Get-Content ($scriptDir+'\..\\.mvn\\wrapper\\maven-wrapper.properties'))) { if ($line -match '^wrapperUrl=(.*)') { Write-Output ('__MVNW_CMD__='+$matches[1]); break } }}"`) DO @(
    IF /I "%%A"=="__MVNW_CMD__" (
      powershell -noprofile -Command "Invoke-WebRequest -Uri '%%B' -OutFile '%~dp0\.mvn\wrapper\maven-wrapper.jar'"
    )
  )
)

:runMaven
@REM Provide a "standardized" way to retrieve the CLI args that will work with both Windows and *nix
@SET MAVEN_CMD_LINE_ARGS=%*

@REM Find project base dir
@SET MAVEN_PROJECTBASEDIR=%~dp0
@IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%

@REM Check if maven-wrapper.jar exists, use it. Otherwise use mvn from PATH.
@IF EXIST %WRAPPER_JAR% (
  "%JAVA_EXE%" %MAVEN_OPTS% ^
    -classpath %WRAPPER_JAR% ^
    "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
    %WRAPPER_LAUNCHER% %MAVEN_CMD_LINE_ARGS%
) ELSE (
  @REM Fallback to using mvn from system PATH
  @WHERE mvn >NUL 2>&1
  @IF %ERRORLEVEL% EQU 0 (
    mvn %MAVEN_CMD_LINE_ARGS%
  ) ELSE (
    @ECHO [ERROR] Maven not found and maven-wrapper.jar could not be downloaded.
    @ECHO [ERROR] Please install Maven or ensure JAVA_HOME is set correctly.
    @EXIT /B 1
  )
)

@IF %ERRORLEVEL% NEQ 0 GOTO error
GOTO end

:error
@SET ERROR_CODE=%ERRORLEVEL%
@EXIT /B %ERROR_CODE%

:end
@EXIT /B 0
