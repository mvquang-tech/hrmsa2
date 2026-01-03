#!/bin/bash
echo "Creating database hrm_db..."
mysql -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS hrm_db;"
echo "Database created successfully!"
echo ""
echo "Importing schema..."
mysql -u root -p123456 hrm_db < database/schema.sql
echo "Schema imported successfully!"

