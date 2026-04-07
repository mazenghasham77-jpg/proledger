# Production Notes

## Recommended hosting
- Frontend: Vercel or container platform
- Backend: Render, Railway, Fly.io, ECS, or Kubernetes
- Database: managed PostgreSQL
- File storage: S3-compatible object storage
- Email: SendGrid, Mailgun, SES, or Postmark
- Monitoring: Sentry + infrastructure monitoring

## Backup strategy
- Daily full database backup
- Point-in-time recovery if available
- Attachment storage lifecycle policy
- Restore drill every quarter

## Monitoring
- backend /health endpoint
- database CPU / storage / connections
- application error rate
- failed login attempts
- queue / email failures
- reconciliation import errors

## Go-live recommendation
Use this sequence:
1. Deploy staging
2. Run migrations
3. Seed or bootstrap company/admin
4. Test login and reports
5. Configure email and storage
6. Review permissions and periods
7. Run sample accounting cycle
8. Launch production
