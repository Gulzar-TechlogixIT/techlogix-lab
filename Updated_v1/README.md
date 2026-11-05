# Techlogix Services Lab

Starter project containing a client UI, gateway, three backend APIs, and one PostgreSQL database.

- `oi-client`: UI served at `http://localhost` (host port 80)
- `oi-gateway`: private gateway
- `oi-attendence`: Attendance API (spelling as requested)
- `oi-core`: Core API
- `oi-track`: Track API
- `oi-db`: one PostgreSQL database; not published to the host

Each service uses its own schema (`attendance`, `core`, `track`) in the shared `techlogix_lab` database.

## Run

```bash
cp .env.example .env
# Optionally change DB_PASSWORD in .env
docker compose up --build -d
docker compose ps
```

Open `http://localhost`.

Gateway API paths:

- `GET/POST /api/attendance`
- `GET/POST /api/core`
- `GET/POST /api/track`
- `GET /health`

Example:

```bash
curl http://localhost/api/attendance
curl -X POST http://localhost/api/attendance -H 'Content-Type: application/json' -d '{"name":"Sample attendance"}'
```

Only the UI publishes a host port. Other services and Postgres are reachable on the Compose network via their service names. The database volume persists data. To remove all lab data, use `docker compose down -v` (destructive).

This is a local learning scaffold. Change the default password and add auth, validation, migrations, TLS, and production controls before production deployment.
