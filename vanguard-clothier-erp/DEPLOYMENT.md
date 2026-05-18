# Vanguard Clothier ERP - Deployment Guide

## 1. Prerequisites
- Node.js v18+
- PostgreSQL (Recommended for production)
- Docker & Docker Compose (Optional)

## 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vanguard"
JWT_SECRET="your-very-secure-random-secret"
NODE_ENV="production"
GEMINI_API_KEY="your-google-ai-key"
```

## 3. Production Build Path
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Build the application
npm run build

# 4. Start the production server
npm start
```

## 4. Docker Deployment
Use the provided `Dockerfile` (or create one):
```bash
docker build -t vanguard-erp .
docker run -p 3000:3000 --env-file .env vanguard-erp
```

## 5. Reverse Proxy (Nginx)
Recommended configuration for SSL/HTTPS:
```nginx
server {
    listen 443 ssl;
    server_name erp.vanguard.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 6. Backup Strategy
- **Database**: Nightly dumps using `pg_dump`.
- **Logs**: Rotate logs using `pm2` or `logrotate`.

## 7. Monitoring
The system exposes a health check at `/api/health`.
Integrate with Prometheus or Datadog for uptime monitoring.
