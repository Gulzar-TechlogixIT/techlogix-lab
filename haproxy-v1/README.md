# HAProxy PostgreSQL role-aware health checks

This patch adds a PostgreSQL role-check service to the existing `haproxy-v1` stack.

## How it works

The role-check service queries each PostgreSQL node using:

```sql
SELECT pg_is_in_recovery();
```

It exposes four internal TCP check ports:

| Port | Node | Reports `up` only when |
|---|---|---|
| 9101 | `oi-db` | Primary |
| 9102 | `oi-db` | Standby |
| 9103 | `oi-db-replica` | Primary |
| 9104 | `oi-db-replica` | Standby |

The role-check container is assigned `192.168.0.17` on `tech-db-net`. The address was selected because it was absent from the attached-container list supplied during setup. Confirm it remains unused immediately before deployment.

HAProxy's PostgreSQL server entries use `check-addr` and `check-port` to check the role agent while sending actual client traffic to the PostgreSQL node. The TCP check expects the literal response `up`. A role mismatch, a failed database query, or an unavailable role-check service therefore fails the check and removes that node from the relevant backend.

Write endpoint `5432` selects whichever node reports PRIMARY. Read endpoint `5433` selects whichever node reports STANDBY. This supports a later controlled manual promotion without changing application connection strings.

## Files

Copy `compose.yml`, `config/haproxy.cfg`, and the `role-check/` directory into the existing `haproxy-v1/` folder. Keep the current `techlogix-db` stack and volumes unchanged.

## Pre-deployment checks

Confirm `192.168.0.17` is still unused:

```bash
docker network inspect tech-db-net   --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{println}}{{end}}'
```

Validate Compose:

```bash
env -u DB_PASSWORD docker compose --env-file ../techlogix-db/.env config -q
```

Validate HAProxy configuration syntax:

```bash
docker compose run --rm --no-deps haproxy haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
```

Note: the one-off HAProxy validation container must be able to access the mounted config. It may emit DNS warnings for application and database names if it is not attached to the production networks; those warnings are not configuration syntax failures.

## Deploy

```bash
env -u DB_PASSWORD docker compose --env-file ../techlogix-db/.env up -d --build
```

## Verify

```bash
docker compose ps
docker compose logs --tail=50 role-check haproxy
```

Role agent should report listeners on 9101, 9102, 9103, and 9104.

Check HAProxy runtime server state:

```bash
docker exec techlogix-haproxy sh -c 'echo "show stat"'
```

For detailed backend status, configure a protected HAProxy stats socket in a later observability step; do not expose an unauthenticated stats endpoint publicly.

Finally, repeat the existing database endpoint tests:
- `5432` must return `pg_is_in_recovery() = false`.
- `5433` must return `pg_is_in_recovery() = true`.

## Safety

This change does not promote databases, modify PostgreSQL data, or recreate database volumes.

During a future manual promotion, first fence/stop the old primary to prevent split-brain. The role checker only routes according to current PostgreSQL roles; it is not an automatic failover controller.
