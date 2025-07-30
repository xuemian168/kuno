# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of EchoPaper seriously. If you have discovered a security vulnerability in our project, we appreciate your help in disclosing it to us in a responsible manner.

### Reporting Process

1. **DO NOT** disclose the vulnerability publicly until it has been addressed by our team.
2. Email your findings to ` xuemian888@gmail.com` (or create a private security advisory on GitHub).
3. Provide sufficient information to reproduce the problem, so we will be able to resolve it as quickly as possible.
4. Please include the following:
   - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
   - Full paths of source file(s) related to the manifestation of the issue
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours.
- We will provide an estimated timeline for addressing the vulnerability.
- We will notify you when the vulnerability is fixed.
- We will publicly acknowledge your responsible disclosure, if you wish.

## Security Measures

### Authentication & Authorization

- **JWT-based authentication** for admin panel access
- **Session timeout** after period of inactivity
- **Password requirements**: Minimum length and complexity enforced
- **Rate limiting** on authentication endpoints to prevent brute force attacks

### Data Protection

- **SQLite database** stored with restricted file permissions
- **Input validation** on all user inputs to prevent SQL injection
- **XSS protection** through proper output encoding
- **CSRF protection** on all state-changing operations

### Docker Security

- **Non-root user** execution in containers
- **Read-only root filesystem** where possible
- **Minimal base images** to reduce attack surface
- **No secrets in images** - all sensitive data via environment variables

### API Security

- **CORS configuration** restricts API access to authorized origins
- **Request size limits** to prevent DoS attacks
- **API rate limiting** per IP address
- **Input sanitization** for all API endpoints

### Content Security

- **Markdown sanitization** to prevent script injection
- **File upload restrictions** by type and size
- **Image processing** to strip metadata
- **Content Security Policy (CSP)** headers

## Security Best Practices for Deployment

### Environment Variables

⚠️ **Never commit sensitive data to the repository**

Required security-related environment variables:
```bash
# Production deployment
NODE_ENV=production
GIN_MODE=release

# API Configuration - MUST be HTTPS in production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Database - Use volume with restricted permissions
DB_PATH=/app/data/blog.db

# JWT Secret - CRITICAL for production
# Generate a secure secret: openssl rand -base64 32
JWT_SECRET=your-very-secure-random-string-here
```

**JWT Secret Security**:
- **Always set in production** - Auto-generated secrets change on restart
- **Use strong secrets** - At least 32 characters, randomly generated
- **Keep it secret** - Never commit to version control
- **Rotate periodically** - Change every 90 days or after personnel changes
- **Example generation**: `openssl rand -base64 32`

### HTTPS Configuration

**Always use HTTPS in production:**
- Configure SSL/TLS certificates
- Enable HSTS (HTTP Strict Transport Security)
- Use secure cookie flags

### Network Security

1. **Firewall Rules**
   - Only expose necessary ports (typically 80/443)
   - Restrict admin access by IP if possible

2. **Reverse Proxy**
   - Use Nginx or similar as reverse proxy
   - Enable rate limiting
   - Configure security headers

3. **Container Isolation**
   - Run containers in isolated networks
   - Use Docker secrets for sensitive data

### Regular Updates

- **Monitor dependencies** for security vulnerabilities
- **Update base images** regularly
- **Apply security patches** promptly
- **Review security advisories** for Go and Node.js

### Backup Security

- **Encrypt backups** at rest
- **Secure backup storage** location
- **Test restore procedures** regularly
- **Limit backup access** to authorized personnel

## Security Headers

Recommended security headers for production:
```nginx
# Nginx configuration example
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

## Compliance

This project follows security best practices aligned with:
- OWASP Top 10
- CIS Docker Benchmark
- NIST Cybersecurity Framework

## Security Tools

Recommended tools for security testing:
- **Static Analysis**: `gosec` for Go, `npm audit` for Node.js
- **Dependency Scanning**: GitHub Dependabot, Snyk
- **Container Scanning**: Trivy, Clair
- **Runtime Protection**: Fail2ban for brute force protection

## Incident Response

In case of a security incident:
1. **Isolate** affected systems
2. **Assess** the scope and impact
3. **Contain** the incident
4. **Eradicate** the root cause
5. **Recover** normal operations
6. **Document** lessons learned

## Contact

For security concerns, please contact:
- Email:  xuemian888@gmail.com
- GitHub Security Advisories: [Create private advisory](https://github.com/xuemian168/EchoPaper/security/advisories/new)

## Acknowledgments

We would like to thank the following individuals for responsibly disclosing security issues:
- *Your name could be here*

---

**Remember**: Security is everyone's responsibility. If you notice something suspicious, please report it!