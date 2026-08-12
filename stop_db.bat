@echo off
echo Stopping PostgreSQL...
cd database\pgsql\bin
pg_ctl.exe -D "..\data" stop
pause