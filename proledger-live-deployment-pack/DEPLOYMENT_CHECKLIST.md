# ProLedger Deployment Checklist

## Infrastructure
- [ ] Separate dev / staging / production environments
- [ ] Managed PostgreSQL or hardened PostgreSQL host
- [ ] Daily automated database backups
- [ ] TLS enabled for frontend and backend
- [ ] Domain names configured
- [ ] Firewall or security groups restricted
- [ ] Secrets stored outside git

## Backend
- [ ] Environment variables configured securely
- [ ] Prisma migrations reviewed before apply
- [ ] Seed only used in non-production or controlled bootstrap
- [ ] Healthcheck endpoint enabled
- [ ] Logging configured
- [ ] Rate limiting added
- [ ] Error monitoring connected

## Frontend
- [ ] Correct API base URL
- [ ] Production build tested
- [ ] Login flow verified
- [ ] Session expiry handling verified
- [ ] Protected routes verified

## Data
- [ ] Company master data configured
- [ ] Chart of accounts reviewed
- [ ] Tax settings reviewed
- [ ] Number sequences validated
- [ ] Accounting periods configured
- [ ] Admin users created

## Finance controls
- [ ] Approval flows tested
- [ ] Closed-period blocking tested
- [ ] Journal balancing tested
- [ ] Invoice posting tested
- [ ] Bill posting tested
- [ ] Inventory valuation tested
- [ ] Reconciliation workflow tested

## Documents
- [ ] PDF renderer configured
- [ ] Email provider configured
- [ ] Attachment storage configured
- [ ] Customer email templates reviewed

## Security
- [ ] Strong JWT secret
- [ ] Password policy enforced
- [ ] HTTPS only in production
- [ ] Admin access limited
- [ ] Dependency audit reviewed
- [ ] Database access restricted
