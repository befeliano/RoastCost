-- Run ONCE as a PostgreSQL superuser (docker init, CI, or a new server).
-- psql -v migrator_password=... -v app_password=... -v dbname=roastcost -f bootstrap.sql
--
-- roastcost_migrator: owns the schema, runs migrations.
-- roastcost_app:      used by the API. NOT superuser, NO BYPASSRLS → Row Level Security always applies.
select format('create role roastcost_migrator login password %L', :'migrator_password')
where not exists (select 1 from pg_roles where rolname = 'roastcost_migrator') \gexec
select format('create role roastcost_app login password %L nosuperuser nobypassrls nocreatedb nocreaterole', :'app_password')
where not exists (select 1 from pg_roles where rolname = 'roastcost_app') \gexec
alter role roastcost_app nobypassrls nosuperuser;
alter role roastcost_migrator nobypassrls nosuperuser;
select format('create database %I owner roastcost_migrator', :'dbname')
where not exists (select 1 from pg_database where datname = :'dbname') \gexec
\connect :dbname
alter schema public owner to roastcost_migrator;
revoke create on schema public from public;
grant usage on schema public to roastcost_app;
create extension if not exists citext;
create extension if not exists pgcrypto;
