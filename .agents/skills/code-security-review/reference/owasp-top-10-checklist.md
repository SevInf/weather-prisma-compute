# OWASP Top 10 2021 — Security Review Checklist

Condensed for agent-driven code review. Each category: what to look for, CWE mappings, code patterns.

## A01: Broken Access Control

**CWEs**: CWE-200, CWE-201, CWE-352, CWE-639, CWE-862, CWE-863

**Look for:**

- Missing authorization checks on endpoints/functions
- Direct object references without ownership validation (IDOR)
- CORS misconfiguration (`Access-Control-Allow-Origin: *`)
- Path traversal in file access (`../` in user input reaching filesystem)
- Missing CSRF protection on state-changing operations
- Privilege escalation via parameter tampering (role/user ID in request body)
- JWT validation gaps (missing signature verification, expired token acceptance)

**Code patterns:**

- Routes/handlers without auth middleware
- `req.params.id` or `req.body.userId` used directly for DB lookups without ownership check
- File paths constructed from user input without sanitization
- Admin endpoints accessible without role verification

## A02: Cryptographic Failures

**CWEs**: CWE-259, CWE-261, CWE-327, CWE-328, CWE-330, CWE-331

**Look for:**

- Sensitive data transmitted in cleartext (HTTP, unencrypted DB connections)
- Weak/deprecated algorithms (MD5, SHA1 for security, DES, RC4)
- Hardcoded keys, passwords, or salts
- Missing encryption for PII, credentials, financial data at rest
- Weak random number generation (`Math.random()`, `rand()` for security)
- Missing TLS certificate validation

**Code patterns:**

- `http://` URLs for API calls or redirects
- `crypto.createHash('md5')`, `hashlib.md5()`, `MessageDigest.getInstance("MD5")`
- Hardcoded strings in crypto operations or connection strings
- `Math.random()` or `rand.Intn()` for tokens/secrets (use `crypto/rand`)

## A03: Injection

**CWEs**: CWE-20, CWE-74, CWE-75, CWE-77, CWE-78, CWE-79, CWE-89, CWE-94, CWE-116

**Look for:**

- SQL queries built via string concatenation/interpolation
- OS command execution with user input
- LDAP/XPath/NoSQL injection vectors
- XSS via unescaped user input in HTML output
- Template injection (server-side template rendering with user data)
- Log injection (unsanitized input in log statements)
- Header injection (user input in HTTP headers)

**Code patterns:**

- `"SELECT * FROM users WHERE id = " + userId`
- `exec()`, `eval()`, `child_process.exec()`, `os.system()`, `Runtime.exec()`
- `innerHTML = userInput`, `dangerouslySetInnerHTML`
- `fmt.Sprintf("SELECT ... WHERE id = %s", id)` (Go)
- `f"SELECT ... WHERE id = {id}"` (Python)
- `String.format("SELECT ... WHERE id = %s", id)` (Java)

## A04: Insecure Design

**CWEs**: CWE-209, CWE-256, CWE-501, CWE-522

**Look for:**

- Missing rate limiting on authentication/sensitive endpoints
- Business logic flaws (bypassing payment, order manipulation)
- Missing account lockout after failed attempts
- Absence of input validation at business logic level
- Excessive data exposure in API responses
- Missing multi-factor authentication for critical operations

**Code patterns:**

- Auth endpoints without rate limiting middleware
- API responses returning full database objects (`SELECT *`)
- Missing validation of business rules (negative quantities, self-approval)

## A05: Security Misconfiguration

**CWEs**: CWE-2, CWE-11, CWE-13, CWE-15, CWE-16, CWE-388

**Look for:**

- Default credentials or accounts enabled
- Unnecessary features/services enabled (debug mode, directory listing)
- Missing security headers (`Content-Security-Policy`, `X-Frame-Options`, etc.)
- Verbose error messages exposing stack traces to users
- Overly permissive cloud/infra permissions
- Missing `HttpOnly`, `Secure`, `SameSite` flags on cookies

**Code patterns:**

- `DEBUG = True` or `app.debug = True` in production config
- Error handlers returning full stack traces
- Cookie creation without security flags
- Permissive CORS configuration
- Dockerfile running as root

## A06: Vulnerable and Outdated Components

**CWEs**: CWE-1035, CWE-1104

**Look for:**

- Dependencies with known CVEs (check via Semgrep supply chain scan)
- Outdated frameworks, libraries, or runtime versions
- Unused dependencies (increased attack surface)
- Missing dependency pinning (version ranges allowing vulnerable versions)

**Code patterns:**

- Lock files with old dependency versions
- `"*"` or `"latest"` version specifiers
- Importing deprecated/abandoned packages

## A07: Identification and Authentication Failures

**CWEs**: CWE-255, CWE-259, CWE-287, CWE-288, CWE-306, CWE-384, CWE-521, CWE-798

**Look for:**

- Weak password policies (no length/complexity requirements)
- Missing brute force protection
- Session fixation vulnerabilities
- Credentials in URLs, logs, or error messages
- Hardcoded credentials or API keys
- Missing session invalidation on logout/password change

**Code patterns:**

- Password length check `< 8` or no check at all
- `console.log(password)`, `logger.info(credentials)`
- API keys in source code or config files committed to repo
- Session tokens not rotated after authentication

## A08: Software and Data Integrity Failures

**CWEs**: CWE-345, CWE-353, CWE-426, CWE-494, CWE-502, CWE-565, CWE-784, CWE-829

**Look for:**

- Insecure deserialization of untrusted data
- Missing integrity checks on software updates or CI/CD pipelines
- Unsigned or unverified downloads/dependencies
- Reliance on untrusted CDNs without SRI (Subresource Integrity)
- `pickle.loads()`, `yaml.load()`, Java `ObjectInputStream` on user data

**Code patterns:**

- `JSON.parse(untrustedInput)` for complex objects (prototype pollution)
- `pickle.loads(user_data)`, `yaml.load(data)` (Python, use `yaml.safe_load`)
- `ObjectInputStream.readObject()` on untrusted input (Java)
- CDN scripts without `integrity` attribute

## A09: Security Logging and Monitoring Failures

**CWEs**: CWE-117, CWE-223, CWE-532, CWE-778

**Look for:**

- Missing logging for auth events (login, logout, failures)
- Missing logging for access control failures
- Sensitive data in log output (passwords, tokens, PII)
- No alerting mechanism for suspicious activity
- Log injection vulnerabilities (unsanitized user input in logs)

**Code patterns:**

- Auth handlers without any logging
- `logger.info("User logged in: " + password)`
- Missing audit trail for admin operations
- Log statements with user-controlled format strings

## A10: Server-Side Request Forgery (SSRF)

**CWEs**: CWE-918

**Look for:**

- User-supplied URLs passed to server-side HTTP clients
- URL validation that can be bypassed (IP notation tricks, DNS rebinding)
- Internal service access via URL manipulation
- Cloud metadata endpoint access (`169.254.169.254`)

**Code patterns:**

- `fetch(userProvidedUrl)`, `http.Get(userUrl)`, `requests.get(url)`
- URL validation using only string checks (not parsing)
- Redirect following on server-side requests
- Missing allowlist for outbound request targets
