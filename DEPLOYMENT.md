# Deployment & Operations Guide

## Prerequisites
* Node.js v20.x or higher
* npm v10.x or higher
* Docker & Docker Compose (optional for containerized deployment)

## Running Locally

```bash
# 1. Clone repository
git clone https://github.com/DavidParantha/grid-monitor.git
cd grid-monitor

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The application starts automatically on `http://localhost:3000` (or `http://localhost:3001`).

## Docker Deployment

```bash
docker compose up -d
```

## Environment Variables
* `DATABASE_URL`: Connection string for SQLite database (`file:./dev.db`) or PostgreSQL. Default: `file:./dev.db`.

## Troubleshooting

### Port Conflicts
* **Symptom**: `Port 3000 is in use by an unknown process`.
* **Fix**: Next.js automatically switches to port 3001 or 3002. Alternatively, kill the running process using `Stop-Process -Id <PID> -Force` on Windows.

### Database Lock / Out-of-sync
* **Symptom**: Database table not found or missing fields.
* **Fix**: Run `npx prisma db push` to re-sync SQLite schema.
