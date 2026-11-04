#!/bin/sh
# Daily encrypted backup (spec §17). Cron:  15 3 * * *  /opt/roastcost/deploy/backup.sh
# Keeps 7 daily + 4 weekly copies. Copy BACKUP_DIR to a second location in Türkiye (rsync/rclone).
set -eu
cd "$(dirname "$0")"
. ./.env.prod
: "${BACKUP_PASSPHRASE:?}" "${BACKUP_DIR:?}"
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
stamp=$(date +%Y-%m-%d)
file="$BACKUP_DIR/daily/roastcost-$stamp.dump.gpg"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_dump -U postgres -d roastcost -Fc --no-owner \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" -o "$file"
[ "$(date +%u)" = "7" ] && cp "$file" "$BACKUP_DIR/weekly/"
ls -1t "$BACKUP_DIR"/daily/*.gpg | tail -n +8 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/weekly/*.gpg | tail -n +5 | xargs -r rm -f
echo "backup ok: $file ($(du -h "$file" | cut -f1))"
