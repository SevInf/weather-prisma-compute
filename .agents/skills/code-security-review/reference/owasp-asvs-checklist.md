# OWASP ASVS v4.0 — Condensed Verification Checklist

Application Security Verification Standard. Focus on Level 1 (minimum) and Level 2 (standard).
Level 3 (advanced/formal verification) omitted.

## V1: Architecture, Design and Threat Modeling

**Verify:**

- Application has a documented security architecture
- Components have defined trust boundaries
- Sensitive data flows are identified and protected
- All authentication/authorization points are centralized (not scattered)
- No hardcoded secrets in source code

**Common failures:** No separation between trusted/untrusted input paths, missing threat model for new features, decentralized auth logic.

## V2: Authentication

**Verify:**

- Passwords: minimum 8 characters, no maximum < 64, no truncation
- Credential stuffing protections (rate limiting, CAPTCHA, account lockout)
- Password storage uses bcrypt/scrypt/argon2 with appropriate cost factor
- Multi-factor authentication available for sensitive operations
- Session tokens regenerated after authentication
- Authentication errors do not reveal which factor failed ("invalid credentials" not "invalid password")
- Password change requires current password verification

**Common failures:** MD5/SHA1 password hashing, no rate limiting on login, session fixation, verbose error messages revealing valid usernames.

## V3: Session Management

**Verify:**

- Session tokens are generated with sufficient entropy (>=128 bits)
- Sessions expire after inactivity (idle timeout) and absolute timeout
- Session tokens invalidated on logout
- Session tokens not exposed in URLs
- Cookies: `HttpOnly`, `Secure`, `SameSite` flags set
- Concurrent session limits (or user notification of active sessions)

**Common failures:** Missing idle timeout, session tokens in URL parameters, cookies without security flags, no session invalidation on password change.

## V4: Access Control

**Verify:**

- Deny by default — access requires explicit grant
- Access control enforced server-side (not client-only)
- Principle of least privilege applied to all resources
- Access control checks cannot be bypassed via parameter tampering
- Consistent enforcement across all endpoints (no forgotten endpoints)
- Administrative interfaces restricted by role AND network

**Common failures:** Client-side-only access control, IDOR via predictable IDs, missing authorization on API endpoints, inconsistent enforcement.

## V5: Validation, Sanitization and Encoding

**Verify:**

- All input validated server-side (type, length, range, format)
- Output encoding applied per context (HTML, JS, CSS, URL, SQL)
- Parameterized queries used for all database access
- Input validation uses allowlists over denylists
- Structured data validated against schema (JSON schema, XML schema)
- File uploads validated (type, size, content, not just extension)
- HTTP headers with user input are properly encoded

**Common failures:** Missing server-side validation (relying on client), SQL string concatenation, XSS from unescaped output, file upload trusting Content-Type.

## V6: Stored Cryptography

**Verify:**

- No custom/home-grown cryptographic algorithms
- Deprecated algorithms not used (MD5, SHA1, DES, RC4, ECB mode)
- Key management: keys not hardcoded, rotatable, stored securely
- Random values generated using cryptographically secure PRNG
- Passwords hashed with adaptive one-way function (bcrypt, argon2, scrypt)
- Encryption uses authenticated modes (GCM, CCM) not unauthenticated (CBC without HMAC)

**Common failures:** Hardcoded keys, MD5 for hashing, `Math.random()` for tokens, ECB mode encryption, missing key rotation.

## V7: Error Handling and Logging

**Verify:**

- Generic error messages shown to users (no stack traces, internal paths)
- Logging covers security events (auth, access control, input validation failures)
- Logs do NOT contain sensitive data (passwords, tokens, PII, session IDs)
- Log entries cannot be forged (input sanitized before logging)
- Centralized error handling — no inconsistent error responses
- Application fails securely (errors don't leave system in insecure state)

**Common failures:** Stack traces in production responses, passwords in logs, missing auth event logging, log injection, inconsistent error formats.

## V8: Data Protection

**Verify:**

- Sensitive data identified and classified (PII, credentials, financial)
- Sensitive data encrypted at rest and in transit
- Sensitive data not cached unnecessarily (HTTP cache, browser storage)
- Sensitive data not exposed in URLs or referrer headers
- Server-side data masking for sensitive fields in API responses
- Appropriate data retention and deletion policies

**Common failures:** PII in query strings, sensitive data in browser localStorage, missing encryption at rest, excessive data in API responses.

## V9: Communications

**Verify:**

- TLS used for all connections (no fallback to cleartext)
- TLS certificates valid and properly configured
- Strong TLS versions (1.2+) and cipher suites only
- Certificate pinning for mobile/high-security applications
- External connections validate server certificates

**Common failures:** HTTP fallback, self-signed certs in production, TLS 1.0/1.1 enabled, disabled certificate validation.

## V10: Malicious Code

**Verify:**

- No backdoors, Easter eggs, or undocumented functionality
- No time bombs or logic bombs
- No phone-home or unauthorized data collection
- Code review covers all third-party contributions
- Dependencies vetted for known vulnerabilities

**Common failures:** Debug endpoints in production, unused dependencies with known CVEs, unreviewed third-party code.

## V11: Business Logic

**Verify:**

- Business flows enforce correct sequencing (can't skip steps)
- Rate limiting on business-critical operations
- Transaction integrity maintained (no partial state)
- Anti-automation controls where appropriate
- Business rules validated server-side (pricing, limits, permissions)

**Common failures:** Price manipulation via client-side changes, race conditions in financial operations, missing rate limits on expensive operations.

## V12: Files and Resources

**Verify:**

- File uploads stored outside web root
- File type validated by content (magic bytes), not just extension
- File size limits enforced
- Path traversal prevented in file operations
- Uploaded files not executed
- Temporary files cleaned up

**Common failures:** File upload to web root, extension-only validation, no size limit, path traversal via filename.

## V13: API and Web Service

**Verify:**

- API authentication on all endpoints (no unauthenticated access to sensitive data)
- API rate limiting to prevent abuse
- Input validation on all API parameters
- API versioning strategy prevents breaking changes
- Sensitive operations require re-authentication
- GraphQL: depth/complexity limits, introspection disabled in production

**Common failures:** Missing auth on internal APIs, no rate limiting, GraphQL DoS via deep queries, excessive data exposure.

## V14: Configuration

**Verify:**

- Security headers set (`Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.)
- Debug/development features disabled in production
- Server software version headers removed/minimized
- Default accounts/credentials changed or disabled
- Dependency versions pinned and regularly updated
- Build pipeline integrity (reproducible builds, signed artifacts)

**Common failures:** Missing CSP, debug mode enabled, default credentials, unpinned dependencies, server version disclosure.
