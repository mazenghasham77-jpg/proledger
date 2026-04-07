# Production Runbook

## Before launch
- verify backups
- verify secrets
- verify TLS
- verify monitoring
- verify admin accounts
- verify restricted access to database

## Launch
1. deploy backend
2. deploy frontend
3. run migrations
4. verify /health
5. login as admin
6. verify core flows
7. announce go-live

## After launch
- monitor logs
- monitor failed requests
- monitor bank import issues
- monitor reconciliation mismatches
- verify daily backups
