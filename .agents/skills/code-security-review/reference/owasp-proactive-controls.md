# OWASP Proactive Controls — Defensive Review Checklist

Top 10 things code SHOULD do. Verify these patterns are present.

## C1: Define Security Requirements

**Verify present:**

- Security requirements derived from business requirements
- Authentication/authorization requirements documented
- Data classification applied (public, internal, confidential, restricted)
- Compliance requirements identified (GDPR, HIPAA, PCI-DSS)

**Common gaps:** No data classification, missing security requirements for new features, compliance requirements not reflected in code.

## C2: Leverage Security Frameworks and Libraries

**Verify present:**

- Using framework-provided security features (CSRF, XSS prevention, auth)
- Not reimplementing crypto, auth, or session management
- Security libraries up to date
- Framework security features not disabled or bypassed

**Common gaps:** Custom auth instead of framework auth, disabled CSRF protection "for API", outdated security libraries, bypassing ORM for raw queries.

## C3: Secure Database Access

**Verify present:**

- Parameterized queries / prepared statements for ALL database access
- ORM used correctly (no raw query escape hatches with user input)
- Database connections use least-privilege accounts
- Connection strings not hardcoded (use environment variables)
- Query results limited (pagination, `LIMIT`)

**Common gaps:** Raw SQL with string interpolation, DB admin account in application, hardcoded connection strings, unbounded queries.

## C4: Encode and Escape Data

**Verify present:**

- Output encoding applied per context:
  - HTML body: HTML entity encoding
  - HTML attributes: attribute encoding
  - JavaScript: JS encoding
  - URLs: URL encoding
  - CSS: CSS encoding
  - SQL: parameterized queries (not escaping)
- Template engines with auto-escaping enabled
- Content-Type headers set correctly on responses

**Common gaps:** Missing encoding in one context (HTML vs JS), auto-escaping disabled, raw HTML rendering, incorrect Content-Type.

## C5: Validate All Inputs

**Verify present:**

- Server-side validation on all input (never trust client-only validation)
- Validation strategy: allowlist > denylist
- Type checking, length limits, range checks, format validation
- Structured data validated against schema
- File upload content validation (not just extension)

**Common gaps:** Client-side-only validation, denylist approach (trying to block bad input), missing length limits, no schema validation on JSON.

## C6: Implement Digital Identity

**Verify present:**

- Strong password policy enforced (>= 8 chars, no common passwords)
- Password storage: bcrypt/argon2/scrypt with appropriate cost
- Multi-factor authentication for sensitive operations
- Account lockout or rate limiting after failed attempts
- Session management: secure token generation, proper invalidation
- Credential recovery: secure reset flow (time-limited tokens)

**Common gaps:** Weak hashing (MD5/SHA1), no rate limiting on auth, no MFA option, password reset tokens that don't expire, session not invalidated on password change.

## C7: Enforce Access Controls

**Verify present:**

- Deny by default — explicit grant required
- Server-side enforcement (never client-only)
- Centralized access control mechanism (not scattered checks)
- Role-based or attribute-based access control
- Resource-level authorization (not just role checks)
- Audit logging of access control decisions

**Common gaps:** Missing authorization on some endpoints, client-side role checks, decentralized auth logic, no resource ownership validation, no audit trail.

## C8: Protect Data Everywhere

**Verify present:**

- Data classified and protection applied per classification
- Encryption in transit (TLS for all connections)
- Encryption at rest for sensitive data
- Sensitive data not in logs, URLs, or error messages
- Proper key management (not hardcoded, rotatable)
- Data minimization (only collect/store what's needed)

**Common gaps:** Sensitive data in logs, missing encryption at rest, hardcoded keys, excessive data collection, PII in URLs.

## C9: Implement Security Logging and Monitoring

**Verify present:**

- Authentication events logged (success and failure)
- Authorization failures logged
- Input validation failures logged
- Sensitive data NOT in logs (mask/redact)
- Logs have consistent format with timestamps and context
- Alerting configured for anomalous patterns
- Log integrity protected (append-only, centralized)

**Common gaps:** No auth event logging, sensitive data in logs, inconsistent log format, no alerting, logs easily tampered with.

## C10: Handle All Errors and Exceptions

**Verify present:**

- Centralized error handling
- Generic error messages to users (no internal details)
- All exceptions caught (no unhandled crashes)
- Fail securely (errors don't leave system in insecure state)
- Error handling doesn't leak information (stack traces, paths, versions)
- Resources released in error paths (connections, file handles)

**Common gaps:** Stack traces in production, inconsistent error handling, resource leaks in error paths, errors bypassing security checks, verbose 500 responses.
