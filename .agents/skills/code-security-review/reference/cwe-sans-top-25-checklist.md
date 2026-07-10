# CWE/SANS Top 25 Most Dangerous Software Weaknesses (2023)

Ranked by danger score. Each entry: CWE ID, name, what to look for, OWASP mapping.

## Rank 1-10

### CWE-787: Out-of-bounds Write

**OWASP**: A03 | **Languages**: C, C++, Rust (unsafe)
**Look for**: Buffer overflows, array index from user input, `memcpy`/`strcpy` without bounds check, `unsafe` Rust blocks writing to raw pointers.

### CWE-79: Cross-site Scripting (XSS)

**OWASP**: A03 | **Languages**: JS/TS, Go templates, Java JSP, Python templates
**Look for**: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, unescaped template variables, `document.write()`, reflected user input in HTML responses.

### CWE-89: SQL Injection

**OWASP**: A03 | **Languages**: All with DB access
**Look for**: String concatenation/interpolation in SQL queries, missing parameterized queries, raw SQL with user input, ORM raw query methods.

### CWE-416: Use After Free

**OWASP**: A03 | **Languages**: C, C++, Rust (unsafe)
**Look for**: Pointer use after `free()`, dangling references, `unsafe` Rust with raw pointers after deallocation, iterator invalidation.

### CWE-78: OS Command Injection

**OWASP**: A03 | **Languages**: All
**Look for**: `exec()`, `system()`, `popen()`, `child_process.exec()`, `os.system()`, `subprocess.run(shell=True)`, `Runtime.exec()` with user input.

### CWE-20: Improper Input Validation

**OWASP**: A03 | **Languages**: All
**Look for**: Missing type/range/format checks on user input, trusting client-side validation, accepting unexpected input types, missing allowlist validation.

### CWE-125: Out-of-bounds Read

**OWASP**: A03 | **Languages**: C, C++, Rust (unsafe)
**Look for**: Array access without bounds checking, buffer reads past allocated size, `unsafe` Rust pointer arithmetic.

### CWE-22: Path Traversal

**OWASP**: A01 | **Languages**: All
**Look for**: `../` in file paths from user input, `path.join(base, userInput)` without validation, missing canonicalization, symlink following.

### CWE-352: Cross-Site Request Forgery (CSRF)

**OWASP**: A01 | **Languages**: Web frameworks
**Look for**: State-changing endpoints without CSRF tokens, missing `SameSite` cookie attribute, custom headers not required for API calls.

### CWE-434: Unrestricted Upload of File with Dangerous Type

**OWASP**: A04 | **Languages**: All with file upload
**Look for**: Missing file type validation, trusting `Content-Type` header, storing uploads in web-accessible directories, missing file size limits.

## Rank 11-20

### CWE-862: Missing Authorization

**OWASP**: A01 | **Languages**: All
**Look for**: Endpoints without authorization middleware, missing ownership checks, admin functions accessible to regular users, missing role-based access control.

### CWE-476: NULL Pointer Dereference

**OWASP**: A03 | **Languages**: C, C++, Go, Java
**Look for**: Pointer/reference use without nil/null check, Go `err != nil` checks that don't return, unchecked `Optional.get()` (Java).

### CWE-287: Improper Authentication

**OWASP**: A07 | **Languages**: All
**Look for**: Authentication bypass logic flaws, missing authentication on sensitive endpoints, weak credential verification, hardcoded credentials.

### CWE-190: Integer Overflow/Wraparound

**OWASP**: A03 | **Languages**: C, C++, Go, Rust
**Look for**: Arithmetic on user-controlled integers without overflow checks, implicit type narrowing, unchecked array size calculations.

### CWE-502: Deserialization of Untrusted Data

**OWASP**: A08 | **Languages**: Java, Python, PHP, .NET
**Look for**: `ObjectInputStream`, `pickle.loads()`, `unserialize()`, `BinaryFormatter`, `yaml.load()` on user input, `JSON.parse` for complex objects.

### CWE-77: Command Injection

**OWASP**: A03 | **Languages**: All
**Look for**: Shell metacharacters in arguments to command execution functions, unquoted variables in shell commands, template injection in command strings.

### CWE-119: Buffer Overflow

**OWASP**: A03 | **Languages**: C, C++
**Look for**: Fixed-size buffers with variable-length input, `gets()`, `sprintf()`, `strcat()` without bounds, stack buffer overflows.

### CWE-798: Use of Hardcoded Credentials

**OWASP**: A07 | **Languages**: All
**Look for**: Passwords, API keys, tokens in source code, hardcoded connection strings, default credentials in config files.

### CWE-918: Server-Side Request Forgery (SSRF)

**OWASP**: A10 | **Languages**: All with HTTP clients
**Look for**: User-controlled URLs in server-side HTTP requests, missing URL allowlists, DNS rebinding vulnerabilities, cloud metadata access.

### CWE-306: Missing Authentication for Critical Function

**OWASP**: A07 | **Languages**: All
**Look for**: Admin/management endpoints without authentication, internal APIs exposed without auth, debug endpoints in production.

## Rank 21-25

### CWE-362: Race Condition (TOCTOU)

**OWASP**: A04 | **Languages**: All with concurrency
**Look for**: Time-of-check to time-of-use gaps, unprotected shared state, missing locks on concurrent access, file operations without atomic guarantees.

### CWE-269: Improper Privilege Management

**OWASP**: A04 | **Languages**: All
**Look for**: Running processes as root/admin unnecessarily, not dropping privileges after setup, overly broad permissions on files/resources.

### CWE-94: Code Injection

**OWASP**: A03 | **Languages**: Dynamic languages (JS, Python, Ruby, PHP)
**Look for**: `eval()`, `Function()`, `exec()`, template engines with code execution, dynamic import with user input.

### CWE-863: Incorrect Authorization

**OWASP**: A01 | **Languages**: All
**Look for**: Authorization logic errors (wrong comparison, off-by-one in role hierarchy), inconsistent enforcement across endpoints, missing resource-level checks.

### CWE-276: Incorrect Default Permissions

**OWASP**: A05 | **Languages**: All
**Look for**: World-readable/writable files, overly permissive umask, `0777` permissions on created files, public S3 buckets, open security groups.
