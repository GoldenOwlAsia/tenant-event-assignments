# Async event flow (demo)

Small NestJS service that matches `requirement.txt`: HTTP creates an event, saves it in Postgres, enqueues work on **BullMQ** (Redis), and a **worker** processes jobs with retries and failure logs.

| Requirement | What this repo does |
|---------------|---------------------|
| POST to receive an event | `POST /api/event` (global prefix `/api`) |
| Store `tenantId`, `payload`, status | MikroORM entities; status moves `pending` → `processing` → `completed` or `failed` |
| Queue | BullMQ + Redis |
| Worker: process, simulate fail/success, 3 attempts + backoff, dead-letter style | `payload.simulateFailure`; after 3 failures the event is `failed` and logs are stored (see below) |
| Log attempts / failures / retries | Rows in `event_failure_logs` + worker stdout |
| Clear modules, `tenantId` through the stack | `src/modules/event/*`, `src/modules/worker/worker.ts`; `tenantId` is in the body, DB row, job payload, and failure logs |

## Architecture

![Architecture diagram](architecture-diagram.png)

---

## Reviewer: run the full flow (Docker only)

You need **Docker** and **Docker Compose**.

### 1. Env

```bash
cp .env.example .env
```

Defaults: API on host **3005** (`API_PUBLISH_PORT`), Postgres **5433**. If you change the port in `.env`, use it in the `curl` URLs below.

### 2. Start everything

```bash
docker compose up -d --build
```

Services: `postgres`, `redis`, `api`, `worker`.

### 3. Migrations (first time or empty DB)

```bash
pnpm migration:up
```

### 4. See failure + retries + logs

Use a **new** `tenantId` each time you repeat (DB has one row per `tenantId`).

```bash
curl -sS -X POST "http://127.0.0.1:3005/api/event" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"review-fail-1","payload":{"simulateFailure":true}}'
```

Wait ~5 seconds (backoff between tries), then:

```bash
curl -sS "http://127.0.0.1:3005/api/event/review-fail-1/failure-logs"
```

You should see **three** entries (`attempt` 1–3). Check the worker:

```bash
docker logs assignment-worker
```

Look for `Failed job` lines and `Moved to DLQ` on the last attempt.

### 5. See success path

```bash
curl -sS -X POST "http://127.0.0.1:3005/api/event" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"review-ok-1","payload":{"simulateFailure":false}}'
```

Worker log should show `Success Job`. Event ends as `completed` in the DB.

### 6. Stop

```bash
docker compose down
```

Remove DB data: `docker compose down -v`.

---

## Run unit test

```bash
pnpm test
```
![Test result](/Test-result.png)

---

## Code map (for review)

- `src/modules/event/` — HTTP, DTOs, service, queue publish, entities  
- `src/modules/worker/worker.ts` — BullMQ consumer (runs in the `worker` Compose service)  
- `requirement.txt` — original brief  
- `docker-compose.yml` — full stack  
