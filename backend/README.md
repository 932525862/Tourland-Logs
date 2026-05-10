# Agency CRM Backend (NestJS)

Production-ready backend for the Agency CRM frontend.

**Stack:** NestJS 10, TypeScript, PostgreSQL (Prisma), Redis, BullMQ, @nestjs/schedule (cron), Socket.IO (WebSocket), JWT auth, Helmet, Throttler, Telegram bot.

## Modules

- `auth`     — JWT login (`/api/auth/login`, `/api/auth/me`)
- `director` — director profile (`/api/director`)
- `employees`— CRUD (`/api/employees`)
- `categories` — CRUD (`/api/categories`)
- `forms`    — CRUD + public read (`/api/forms`, `/api/forms/public/:id`)
- `clients`  — CRUD + notes/payments/sale/call (`/api/clients`)
- `attendance` — check-in/out (`/api/attendance`)
- `tasks`    — director assigns, employee updates (`/api/tasks`)
- `stats`    — director-only analytics (`/api/stats/overview`, `/api/stats/sales`)
- `telegram` — bot, send messages, list subscribers (`/api/telegram`)
- `realtime` — Socket.IO at `/ws` (auth via `auth.token` Bearer)
- `jobs`     — BullMQ + cron (auto Telegram payment reminders)
- `public`   — public form submission (`/api/public/submit`)

## Local development

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma migrate dev --name init
npm run start:dev
```

API available at `http://localhost:4000/api`.

## Deploy on DigitalOcean

### Option A — Docker droplet (simplest)

```bash
git clone <your-repo> && cd backend
cp .env.example .env  # edit values
docker compose up -d --build
```

The included `docker-compose.yml` brings up Postgres, Redis, and the API with auto-migrations on container start.

### Option B — App Platform / managed services

1. Create a managed Postgres (DigitalOcean DB) and a managed Redis.
2. Set the env vars from `.env.example` in App Platform.
3. Build command: `npm install && npx prisma generate && npm run build`
4. Run command: `npx prisma migrate deploy && node dist/main.js`
5. Health check path: `/api`

### Telegram bot

1. Create a bot via @BotFather and copy the token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env`.
3. Users press **Start** in your bot — they're stored as subscribers.
4. From the CRM, link a client to the chosen Telegram subscriber.
5. Cron scans every minute and queues a reminder `TELEGRAM_REMINDER_LEAD_MINUTES` (default 60) before due time.

## Frontend integration

See `src/lib/api/` in the frontend project — `client.ts`, `auth.ts`, `socket.ts` already wired to call this API. Set `VITE_API_URL=https://api.your-domain.com` in the frontend env.

## Security notes

- `helmet`, CORS allow-list (`CORS_ORIGIN`), global `ValidationPipe` (whitelist).
- Throttler global (200 req/min) + tighter on `/api/public/submit` (10/min).
- Passwords hashed with bcrypt; JWT signed with `JWT_SECRET`.
- Role guard on director-only endpoints.
- WebSocket auth: `io(url, { auth: { token } })` — connection rejected without a valid JWT.

## Default credentials (change after first login!)

`admin` / `admin123` — set via `DIRECTOR_LOGIN` / `DIRECTOR_PASSWORD`.
