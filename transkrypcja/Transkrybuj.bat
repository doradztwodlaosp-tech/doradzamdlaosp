@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"
if exist "Transkrypcja.py" (python "Transkrypcja.py" %*) else (python "transkrybuj.py" %*)
echo.
pause
