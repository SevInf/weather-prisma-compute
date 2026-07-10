# Language-Specific Security Patterns

Anti-patterns and vulnerable code patterns organized by language.

## Go

### Injection

- `fmt.Sprintf("SELECT ... WHERE id = %s", id)` — SQL injection via string formatting
- `db.Query("SELECT ... WHERE id = " + id)` — SQL injection via concatenation
- `exec.Command("sh", "-c", userInput)` — command injection via shell
- `exec.Command(cmd, args...)` where `cmd` comes from user input

**Safe patterns:** `db.Query("SELECT ... WHERE id = $1", id)`, `exec.Command("binary", sanitizedArgs...)`

### Crypto / Randomness

- `math/rand` for security-sensitive values (tokens, secrets) — use `crypto/rand`
- `md5.Sum()` or `sha1.Sum()` for password hashing — use `bcrypt` or `argon2`
- Hardcoded TLS configs with `InsecureSkipVerify: true`

### Error Handling

- `err` checked but not returned (silent failure → security bypass)
- `defer file.Close()` without error check (resource leak)
- Ignoring error from `crypto/tls` handshake

### Concurrency

- Race conditions on shared maps (Go maps are not goroutine-safe)
- Missing mutex on shared state in HTTP handlers
- TOCTOU in file operations

### Network / HTTP

- Missing TLS on HTTP servers
- Serving on `0.0.0.0` without intent (exposes to all interfaces)
- Missing timeouts on `http.Server` (slowloris DoS)
- CORS `Access-Control-Allow-Origin: *` on authenticated endpoints
- SSRF: `http.Get(userURL)` without URL validation

### Path Traversal

- `filepath.Join(base, userInput)` — does NOT prevent `../` traversal
- Must use `filepath.Clean()` + verify result starts with `base`

## TypeScript / JavaScript

### Injection

- `eval(userInput)` — code injection
- `new Function(userInput)` — code injection
- `child_process.exec(cmd)` where `cmd` includes user input — command injection
- `innerHTML = userInput` — XSS
- `dangerouslySetInnerHTML={{ __html: userInput }}` — XSS in React
- Template literals in SQL: `` `SELECT ... WHERE id = ${id}` `` — SQL injection
- `document.write(userInput)` — XSS

**Safe patterns:** `child_process.execFile(binary, [args])`, `textContent` instead of `innerHTML`, parameterized queries.

### Prototype Pollution

- `Object.assign(target, userControlledObj)` — can inject `__proto__`
- Deep merge utilities without prototype check
- `JSON.parse(untrustedInput)` assigned to objects with spread

**Safe patterns:** `Object.create(null)` for lookup maps, `Object.freeze()`, libraries with prototype pollution protection.

### Dependencies

- `require(userInput)` — arbitrary module loading
- `import(userInput)` — dynamic import injection
- Unvalidated npm packages (typosquatting, supply chain)

### Crypto

- `Math.random()` for tokens/secrets — use `crypto.randomBytes()` or `crypto.randomUUID()`
- `crypto.createHash('md5')` for passwords — use `bcrypt` or `scrypt`

### Node.js Specific

- `fs.readFile(userPath)` without path validation — path traversal
- `process.env` values used without validation
- Missing `helmet` or equivalent security headers middleware
- `Buffer.allocUnsafe()` — may contain old memory data
- Regex with user input — ReDoS (catastrophic backtracking)

## Rust

### Unsafe Code

- `unsafe` blocks: manual review required for every `unsafe` usage
- Raw pointer dereferencing without validation
- FFI boundaries: data passed to/from C code without validation
- `transmute` bypassing type safety
- `unsafe impl Send/Sync` without proving thread safety

### Error Handling

- `.unwrap()` or `.expect()` on user input — panic on invalid data (DoS)
- `panic!` in library code (should return `Result`)
- Missing error propagation with `?`

**Safe patterns:** `match` or `if let` on Results, `.unwrap_or_default()`, custom error types.

### Injection

- `Command::new("sh").arg("-c").arg(user_input)` — command injection
- SQL via string formatting with `format!()` — SQL injection

**Safe patterns:** `Command::new(binary).args(&validated_args)`, parameterized queries via sqlx/diesel.

### Memory / Concurrency

- `std::mem::forget()` — resource leaks
- `Rc` across threads (use `Arc`)
- Missing `Mutex`/`RwLock` on shared state
- Deadlocks from inconsistent lock ordering

### Dependencies

- Crates with `unsafe` code not audited (`cargo audit`, `cargo vet`)
- `build.rs` executing arbitrary code during compilation

## Python

### Injection

- `os.system(user_input)` — command injection
- `subprocess.run(cmd, shell=True)` with user input — command injection
- `eval(user_input)`, `exec(user_input)` — code injection
- `cursor.execute(f"SELECT ... WHERE id = {id}")` — SQL injection

**Safe patterns:** `subprocess.run([binary, arg1, arg2])`, `cursor.execute("SELECT ... WHERE id = %s", (id,))`

### Deserialization

- `pickle.loads(untrusted_data)` — arbitrary code execution
- `yaml.load(data)` without `Loader` — arbitrary code execution
- `marshal.loads()` — unsafe deserialization
- `shelve.open()` on untrusted files

**Safe patterns:** `yaml.safe_load()`, `json.loads()`, avoid `pickle` on untrusted data entirely.

### Path Traversal

- `open(os.path.join(base, user_input))` — `../` traversal
- `send_file(user_path)` in Flask without validation
- `os.path.join("/safe", user_input)` — if `user_input` is absolute path, it replaces base

**Safe patterns:** `os.path.realpath()` + verify prefix, `pathlib.Path.resolve()` + `is_relative_to()`.

### Crypto

- `hashlib.md5(password)` — weak hashing
- `random.random()` for security tokens — use `secrets` module
- `hmac.compare_digest()` not used for timing-safe comparison

### Django / Flask

- `DEBUG = True` in production settings
- `@csrf_exempt` on state-changing views
- `|safe` template filter on user input (XSS)
- `SECRET_KEY` hardcoded in settings file
- `ALLOWED_HOSTS = ['*']` — host header injection

## Java

### Injection

- `Statement.execute("SELECT ... " + userInput)` — SQL injection
- `Runtime.getRuntime().exec(userInput)` — command injection
- JSP `<%= userInput %>` — XSS (use JSTL `<c:out>`)
- `String.format()` for SQL queries — SQL injection

**Safe patterns:** `PreparedStatement` with parameterized queries, `ProcessBuilder` with argument list.

### XXE (XML External Entity)

- `DocumentBuilderFactory` without disabling external entities
- `SAXParserFactory` without disabling external entities
- `XMLInputFactory` without disabling external entities

**Safe patterns:**

```java
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
```

### Serialization

- `ObjectInputStream.readObject()` on untrusted data — remote code execution
- Serializable classes with sensitive fields
- Missing `readResolve()` for singleton enforcement

### Crypto

- `MessageDigest.getInstance("MD5")` for passwords
- `SecureRandom` created with predictable seed
- ECB mode: `Cipher.getInstance("AES/ECB/PKCS5Padding")`

**Safe patterns:** `Cipher.getInstance("AES/GCM/NoPadding")`, `new SecureRandom()` (default seeding).

### Resource Management

- Missing try-with-resources for `Connection`, `Statement`, `InputStream`
- Thread pool exhaustion from unbounded executors
- Connection leaks in error paths
