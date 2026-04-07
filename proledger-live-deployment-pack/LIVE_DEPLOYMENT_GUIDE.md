# ProLedger Live Deployment Guide

This guide shows one practical deployment path using:

- Frontend: Vercel
- Backend: Render
- Database: PostgreSQL managed service
- Storage: S3-compatible bucket
- Email: SMTP provider

You can adapt this to Railway, Fly.io, AWS, or another host.

---

## 1. Prepare production services

### Database
Create a PostgreSQL database and keep:
- host
- port
- database name
- username
- password
- full connection string

### Backend host
Create a backend web service and connect the repository or upload the code.

### Frontend host
Create a frontend app and point it to the frontend folder.

### Storage
Prepare an object storage bucket for attachments.

### Email
Prepare SMTP credentials.

---

## 2. Backend environment variables

Use values like these:

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DBNAME?schema=public`
- `JWT_SECRET=<very long random secret>`
- `JWT_EXPIRES_IN=1d`
- `FRONTEND_URL=https://your-frontend-domain.com`
- `SMTP_HOST=...`
- `SMTP_PORT=587`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `STORAGE_BUCKET=...`
- `STORAGE_REGION=...`
- `STORAGE_ACCESS_KEY=...`
- `STORAGE_SECRET_KEY=...`

---

## 3. Frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com`

---

## 4. Deploy backend

### Build command
```bash
npm install && npx prisma generate && npm run build
```

### Start command
```bash
npx prisma migrate deploy && node dist/index.js
```

### Healthcheck
Use:
```bash
/health
```

---

## 5. Deploy frontend

### Build command
```bash
npm install && npm run build
```

### Start command
```bash
npm run start
```

---

## 6. First production bootstrap

After backend is live:

1. run migrations
2. create the first admin user
3. configure company details
4. configure chart of accounts
5. configure accounting period
6. configure number sequences
7. configure tax settings
8. configure bank accounts

---

## 7. Required validation before go-live

### Login
- admin can log in
- wrong password is rejected
- protected routes are protected

### Accounting
- journal entries balance
- invoice posting works
- bill posting works
- payment posting works
- reports load

### Inventory
- inventory in increases stock
- inventory out decreases stock
- valuation updates correctly

### Controls
- approvals work
- closed periods block posting
- audit records appear

### Banking
- bank transactions import
- match and clear workflow works

### Documents
- PDF generation path works
- email integration works
- attachments save correctly

---

## 8. Recommended go-live order

1. deploy database
2. deploy backend
3. verify `/health`
4. deploy frontend
5. test login
6. seed/bootstrap data
7. test one full transaction cycle
8. confirm backups
9. launch production

---

## 9. After go-live

Monitor:
- backend logs
- failed logins
- failed document sends
- bank import issues
- database CPU and storage
- daily backup success
