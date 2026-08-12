@echo off
echo Starting PostgreSQL...
cd database\pgsql\bin
pg_ctl.exe -D "..\data" -l logfile.txt start
pause