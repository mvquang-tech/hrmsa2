@echo off
echo Creating database hrm_db...
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS hrm_db;"
echo Database created successfully!
echo.
echo Importing schema...
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db < database\schema.sql
echo Schema imported successfully!
pause

