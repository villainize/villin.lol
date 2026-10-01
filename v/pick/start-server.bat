@echo off
cd /d "%~dp0"
echo Pick & Play is starting at http://127.0.0.1:4173/
python -m http.server 4173 --bind 127.0.0.1
pause
