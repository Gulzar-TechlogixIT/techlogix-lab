# PostgreSQL Read/Write Routing

The three database-backed services (`oi-attendence`, `oi-core`, and `oi-track`) use two PostgreSQL pools:

- **Writes:** `techlogix-haproxy:5432` → PostgreSQL primary.
- **Reads:** `techlogix-haproxy:5433` → PostgreSQL streaming replica.

## Query consistency

- `GET /` uses the replica by default.
- `GET /?consistency=strong` uses the primary.
- Sending `X-Read-Consistency: strong` also routes a GET to the primary.
- `POST /` always writes to the primary.

Use strong consistency for reads that must immediately observe a preceding write. Replica reads are asynchronous and can briefly lag.

## Environment variables

Each database-backed service receives:

- `DB_WRITE_HOST=techlogix-haproxy`
- `DB_WRITE_PORT=5432`
- `DB_READ_HOST=techlogix-haproxy`
- `DB_READ_PORT=5433`
- `DB_NAME`, `DB_USER`, and `DB_PASSWORD`

`DB_POOL_MAX` optionally controls the maximum connections per pool (default: 10).

The existing `DB_HOST` and `DB_PORT` variables remain supported as legacy fallbacks by the application code.

## Health checks

`GET /health` verifies both endpoints and confirms that the write endpoint is a primary and the read endpoint is a standby. It returns HTTP 503 if either endpoint is unavailable or routed to the wrong PostgreSQL role.

## Rollout

From the relevant project directory:

```bash
docker compose config -q
docker compose up -d --build oi-attendence oi-core oi-track
docker compose ps
```

No database volume, schema, or existing database data is changed by this application update.
