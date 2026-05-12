# Agency CRM Backend (NestJS)

Production-ready backend for the Agency CRM frontend. Single command brings the full stack up.

**Stack:** NestJS 10 · TypeScript · PostgreSQL (Prisma) · Redis · BullMQ · Cron · Socket.IO · JWT · Helmet · Throttler · Telegram Bot.

---

## 🚀 Deploy on DigitalOcean (one droplet, one command)

1. Create a Ubuntu 22.04 droplet (1 GB RAM is enough to start). SSH in.
2. Install Docker + Compose:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone the repo and enter the backend folder:
   ```bash
   git clone <YOUR_REPO_URL> app && cd app/backend
   cp .env.example .env
   nano .env   # set JWT_SECRET, DIRECTOR_PASSWORD, TELEGRAM_BOT_TOKEN, CORS_ORIGIN
   ```
4. Start everything (Postgres + Redis + API):
   ```bash
   docker compose up -d --build
   ```
5. Verify:
   ```bash
   curl http://YOUR_DROPLET_IP:4000/api/health
   # { "ok": true, "ts": "..." }
   ```

That's it — the API auto-creates the DB schema, the bootstrap director, and starts the Telegram bot poller.

### Putting it behind a domain (HTTPS)

Use Caddy for zero-config TLS:

```bash
docker run -d --name caddy --restart=always --network host \
  -v caddy_data:/data \
  caddy caddy reverse-proxy --from api.example.com --to :4000
```

---

## 🔌 Frontend integration

The frontend already ships with an API client (`src/lib/api/client.ts`) and a WebSocket hook (`src/lib/api/socket.ts`). To point your published app at this backend:

1. In your frontend hosting (Lovable / Vercel / your server), set:
   ```
   VITE_API_URL=https://api.your-domain.com
   ```
2. Rebuild and redeploy the frontend.
3. Open the site, log in with the bootstrap admin (`admin` / `admin123` by default), and **change the password immediately** from the director panel.

> Note: your existing frontend stores data in `localStorage` for offline-first development. To persist everything to this backend, replace the `loadState/saveState` calls in `src/lib/store.ts` (and individual route mutations) with calls from `src/lib/api/client.ts` (`API.clients()`, `API.createClient(...)`, etc.). The endpoints, types and WebSocket events are 1:1 with the local store schema, so it's a drop-in replacement.

---

## 📦 Modules

| Path | Purpose |
| --- | --- |
| `auth` | `POST /api/auth/login`, `GET /api/auth/me` |
| `director` | `GET/PATCH /api/director` |
| `employees` | CRUD `/api/employees` (director-only writes) |
| `categories` | CRUD `/api/categories` |
| `forms` | CRUD `/api/forms`, public read `/api/forms/public/:id` |
| `clients` | CRUD + notes/payments/sale/call `/api/clients` |
| `attendance` | `/api/attendance` check-in/out |
| `tasks` | `/api/tasks` director assigns, employees update |
| `stats` | `/api/stats/overview`, `/api/stats/sales` (director) |
| `telegram` | `/api/telegram/subscribers`, `/api/telegram/send` |
| `realtime` | Socket.IO at `/ws` (JWT in `auth.token`) |
| `jobs` | BullMQ + cron — auto Telegram payment reminders |
| `public` | `POST /api/public/submit` (rate-limited form submit) |
| `health` | `GET /api/health` |

---

## 🔒 Security

- `helmet`, CORS allow-list (`CORS_ORIGIN`), global `ValidationPipe` (whitelist).
- Throttler 200 req/min globally + 10/min on `POST /api/public/submit`.
- bcrypt-hashed passwords; JWT signed with `JWT_SECRET`.
- `RolesGuard` enforces director-only endpoints.
- WebSocket connections rejected without a valid JWT.

## 🔁 Realtime events

| Event | Payload | Audience |
| --- | --- | --- |
| `client:new` | `{ id }` | everyone |
| `client:update` | `{ id }` | everyone |
| `client:delete` | `{ id }` | everyone |
| `task:new` | `{ id, employeeId }` | everyone |
| `task:update` | `{ id }` | everyone |
| `reminder` | `{ clientId }` | role:employee |

Subscribe from the frontend:
```ts
import { useSocketEvent } from "@/lib/api/socket";
useSocketEvent("client:new", (p) => console.log(p));
```

## 🤖 Telegram

1. Create a bot via @BotFather, copy the token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env` and restart.
3. Each client sends `/start` to the bot — they appear in `/api/telegram/subscribers`.
4. From the CRM, link a client to their subscriber.
5. Cron runs every minute and queues a reminder `TELEGRAM_REMINDER_LEAD_MINUTES` minutes before due time.

## 🧰 Local development

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma generate
npx prisma db push
npm run start:dev
# -> http://localhost:4000/api
```

## 🔑 Default credentials

`admin` / `admin123` — change on first login (or override via `DIRECTOR_LOGIN` / `DIRECTOR_PASSWORD` before the first start).
