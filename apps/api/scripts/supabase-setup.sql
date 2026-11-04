-- =====================================================================
-- RoastCost on Supabase (TEST / DEMO ONLY — see docs/RUNBOOK.md, spec K12)
-- 1) SQL Editor → run apps/api/migrations/0001_init.sql (whole file)
-- 2) SQL Editor → paste THIS file, replace the password below IN THE EDITOR ONLY, run.
--    ⚠ Never commit the real password: this repository is public.
-- =====================================================================

-- The API connects as roastcost_app (RLS enforced). Give it a login.
alter role roastcost_app with login password 'BURAYA-EN-AZ-24-KARAKTER-RASTGELE-PAROLA';

-- RoastCost does NOT use Supabase's auto-generated REST API (PostgREST).
-- Close the schema to Supabase's anon/authenticated roles so nothing is reachable with the public anon key.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant  execute on all functions in schema public to roastcost_app;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Mark 0001 as applied so `pnpm db:migrate` (run as the postgres user) continues from 0002.
create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now());
insert into schema_migrations(name) values ('0001_init.sql') on conflict do nothing;

-- check: should list roastcost_app with rolcanlogin = true, rolbypassrls = false
select rolname, rolcanlogin, rolbypassrls, rolsuper from pg_roles where rolname = 'roastcost_app';
