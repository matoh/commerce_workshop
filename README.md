# Unified Commerce Dashboard

A mini POS backoffice for managing products and inventory across multiple sales channels (in-store, online, marketplace) with real-time sync.

## Stack

- **Client:** React + TypeScript + Vite
- **Server:** Fastify + TypeScript
- **Database:** PostgreSQL 16
- **Cache/Pub-Sub:** Redis 7
- **Real-time:** SSE (Server-Sent Events)
- **Infrastructure:** Docker Compose + Nginx (load balancer)

## Architecture

- 3 Fastify API instances behind Nginx round-robin load balancer
- Redis Pub/Sub for cross-instance event broadcasting
- SSE for real-time frontend updates
- PostgreSQL with optimistic locking and atomic operations for concurrency

## Getting Started

```bash
docker compose up --build

# First time only — run migrations and seed data:
docker compose exec api-1 npm run migrate
docker compose exec api-1 npm run seed
```

| Service       | URL                    |
|---------------|------------------------|
| Client        | http://localhost:5173   |
| API (via LB)  | http://localhost:3000   |
| API instances | :3001, :3002, :3003    |
| Adminer (DB)  | http://localhost:8080   |

### Database Access (Adminer)

- System: **PostgreSQL**
- Server: **postgres**
- Username: **commerce**
- Password: **commerce**
- Database: **commerce**
