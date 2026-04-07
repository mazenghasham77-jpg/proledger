# ProLedger Security Checklist

## Authentication
- [ ] Strong password hashing
- [ ] Refresh token strategy added
- [ ] Session invalidation strategy added
- [ ] MFA for admin users
- [ ] Brute-force protection / rate limiting
- [ ] Account lockout or anomaly detection

## Authorization
- [ ] Role-based access verified per endpoint
- [ ] Sensitive controls limited to admin/approver roles
- [ ] Object-level access checks reviewed

## Data protection
- [ ] Database encrypted at rest where supported
- [ ] Backups encrypted
- [ ] Secrets not stored in repository
- [ ] PII minimized in logs
- [ ] Audit logs retained safely

## App security
- [ ] Input validation across all endpoints
- [ ] CSRF strategy reviewed if cookies are introduced
- [ ] Security headers configured
- [ ] CORS restricted
- [ ] File upload MIME/type checks implemented
- [ ] Malware scanning for uploads considered

## Operations
- [ ] Dependency scanning in CI
- [ ] Error monitoring configured
- [ ] Infrastructure access restricted
- [ ] Regular patch cycle defined
