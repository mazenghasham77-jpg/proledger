# Provider Setup Notes

## SMTP
Use any real provider such as:
- SendGrid SMTP
- Mailgun SMTP
- Amazon SES SMTP
- Postmark SMTP

Make sure:
- sender identity is verified
- SPF/DKIM are configured
- from-address is approved

## Storage
Use:
- Amazon S3
- Cloudflare R2
- Backblaze B2 S3-compatible
- MinIO for private/self-hosted setups

Store:
- invoice attachments
- bill attachments
- uploaded documents

## PDF
Current package gives HTML foundation.
For real PDFs, connect:
- Playwright
- Puppeteer
- wkhtmltopdf-based service

## Monitoring
Recommended:
- Sentry for application errors
- host monitoring for CPU/memory
- DB monitoring from your provider
