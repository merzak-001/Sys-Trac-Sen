@echo off
title Sensus - SystemTracabilie Port 150
cd /d "%~dp0"
echo ======================================================================
echo  Sensus International - SystemTracabilie
echo  Plateforme de Tracabilite des Receptions Marchandises
echo  Port: 150
echo  Base de donnees: localhost\SQLEXPRESS (SystemTracabilie)
echo ======================================================================
echo.
echo Demarrage du serveur sur http://localhost:150 ...
"C:\Users\msai\AppData\Local\Python\bin\python.exe" server.py
pause

