# Security

## Reporting a Vulnerability
If you discover a security issue, do NOT open a public issue.
Email [your-email] or use GitHub's private vulnerability reporting.

## Secrets Management
- All secrets live in `.env.local` (gitignored)
- `.env.example` shows required variables with placeholder values
- Never commit `.env` files, tokens, or keys
- Rotate any accidentally exposed secrets immediately via the Supabase dashboard
