@echo off
REM Script de respaldo local de PostgreSQL (botica_db)
echo Iniciando backup de base de datos botica_db...
docker exec -t botica_postgres pg_dump -U admin botica_db > backup_botica.sql
echo Backup finalizado: backup_botica.sql
