@echo off
:loop
echo Starting iVisit-helper...
java -jar helper-0.0.1-SNAPSHOT.jar
echo Helper exited with code %ERRORLEVEL%. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop
