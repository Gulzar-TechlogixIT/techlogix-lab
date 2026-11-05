#!/bin/sh
set -eu

export PGPASSWORD="$REPLICATION_PASSWORD"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  until pg_isready -h oi-db -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    sleep 2
  done

  pg_basebackup \
    -h oi-db \
    -U replicator \
    -D "$PGDATA" \
    -Fp \
    -Xs \
    -P \
    -R
fi

exec docker-entrypoint.sh postgres -c hot_standby=on