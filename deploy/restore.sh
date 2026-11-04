#!/bin/sh
# Restore drill (spec §17: practise regularly). Restores INTO A NEW DATABASE "roastcost_restore" by default.
#   ./restore.sh /var/backups/roastcost/daily/roastcost-2026-11-04.dump.gpg [target_db]
set -eu
cd "$(dirname "$0")"
. ./.env.prod
src=${1:?backup file}
target=${2:-roastcost_restore}
dc="docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db"
$dc psql -U postgres -c "drop database if exists $target" -c "create database $target owner roastcost_migrator"
gpg --batch --decrypt --passphrase "$BACKUP_PASSPHRASE" "$src" | $dc pg_restore -U postgres -d "$target" --no-owner --role=roastcost_migrator
$dc psql -U postgres -d "$target" -c "select (select count(*) from users) users, (select count(*) from cafes) cafes, (select count(*) from orders) orders"
echo "restore into $target ok — compare the counts with production, then drop it: drop database $target;"
