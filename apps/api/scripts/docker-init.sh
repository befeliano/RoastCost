#!/bin/sh
# Runs once on first container start (empty volume).
set -e
psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -v migrator_password="$ROASTCOST_MIGRATOR_PASSWORD" \
  -v app_password="$ROASTCOST_APP_PASSWORD" \
  -v dbname=roastcost \
  -f /roastcost/bootstrap.sql
