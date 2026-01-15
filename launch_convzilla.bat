@echo off
TITLE Convzilla Launcher
COLOR 0A

echo.
echo  =========================================
echo       Convzilla - Tame Your Data
echo  =========================================
echo.

:: Check for Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] Python not found in PATH. Checking default install locations...
    if exist "C:\Program Files\Python311\python.exe" (
        SET PYTHON_CMD="C:\Program Files\Python311\python.exe"
        echo [OK] Found Python at C:\Program Files\Python311\python.exe
    ) else (
        echo [ERROR] Python is not installed or not in PATH. Please install Python 3.11+.
        PAUSE
        EXIT /B
    )
) ELSE (
    SET PYTHON_CMD=python
    echo [OK] Python found in PATH.
)

:: Install Dependencies
echo.
echo [*] Checking dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] Error installing dependencies. Running without silent mode to see error:
    %PYTHON_CMD% -m pip install -r requirements.txt
    echo.
    echo Please fix the errors above.
    PAUSE
    EXIT /B
)
echo [OK] Dependencies ready.

:: launch
echo.
echo [*] Launching Convzilla...
echo [*] Go to http://127.0.0.1:5000 in your browser.
start http://127.0.0.1:5000
%PYTHON_CMD% app.py

PAUSE
