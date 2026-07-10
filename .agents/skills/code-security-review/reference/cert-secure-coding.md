# SEI CERT Secure Coding Standards — Review Checklist

Language-specific secure coding rules from the Software Engineering Institute.
Focus on most impactful rules per language.

## C / C++

### Memory Management (MEM)

- **MEM30-C**: Do not access freed memory (use-after-free)
- **MEM31-C**: Free dynamically allocated memory when no longer needed
- **MEM33-C**: Allocate and copy structures with flexible array members dynamically
- **MEM35-C**: Allocate sufficient memory for an object

**Look for:** `free()` followed by pointer use, missing `free()` on error paths, `malloc()` without size validation, double-free.

### Strings (STR)

- **STR31-C**: Guarantee null termination for character arrays
- **STR32-C**: Do not pass non-null-terminated strings to library functions
- **STR38-C**: Do not confuse narrow and wide character strings

**Look for:** `strncpy()` without explicit null termination, buffer sizes not accounting for null terminator, `gets()` usage (always vulnerable).

### Integer Operations (INT)

- **INT30-C**: Ensure unsigned integer operations do not wrap
- **INT31-C**: Ensure integer conversions do not lose or misinterpret data
- **INT32-C**: Ensure signed integer operations do not overflow
- **INT33-C**: Ensure division and remainder operations do not result in divide-by-zero

**Look for:** Integer arithmetic without overflow checks, narrowing conversions, unchecked division, `size_t` to `int` conversions.

### Input/Output (FIO)

- **FIO30-C**: Exclude user input from format strings
- **FIO32-C**: Do not perform operations on devices only appropriate for files
- **FIO42-C**: Close files when they are no longer needed

**Look for:** `printf(userInput)` (format string vulnerability), unclosed file handles, TOCTOU in file operations.

### Preprocessor (PRE)

- **PRE31-C**: Avoid side effects in assertions and unsafe macros

### Environment (ENV)

- **ENV33-C**: Do not call `system()` — use `exec` family with validated arguments

**Look for:** `system()` calls with any user-derived input.

## Java

### Input Validation (IDS)

- **IDS00-J**: Prevent SQL injection (use PreparedStatement)
- **IDS01-J**: Normalize strings before validating
- **IDS07-J**: Sanitize untrusted data passed to Runtime.exec()
- **IDS11-J**: Perform any string modifications before validation

**Look for:** `Statement.execute()` with concatenated SQL, `Runtime.exec()` with user input, validation before normalization.

### Serialization (SER)

- **SER01-J**: Do not deviate from the proper signatures of serialization methods
- **SER03-J**: Do not serialize unencrypted sensitive data
- **SER06-J**: Make defensive copies of private mutable components during deserialization
- **SER12-J**: Prevent deserialization of untrusted data

**Look for:** `ObjectInputStream.readObject()` on untrusted input, sensitive data in serializable fields, missing input filtering for deserialization.

### Thread Safety (THI/LCK/VNA)

- **LCK00-J**: Use private final lock objects
- **VNA00-J**: Ensure visibility of shared state
- **VNA02-J**: Ensure that compound operations on shared variables are atomic
- **THI02-J**: Notify all waiting threads rather than a single thread

**Look for:** Non-private lock objects, unsynchronized access to shared mutable state, `notify()` instead of `notifyAll()`, check-then-act without synchronization.

### Exception Handling (ERR)

- **ERR00-J**: Do not suppress or ignore checked exceptions
- **ERR01-J**: Do not allow exceptions to expose sensitive information
- **ERR06-J**: Do not throw undeclared checked exceptions
- **ERR07-J**: Do not throw RuntimeException, Exception, or Throwable

**Look for:** Empty catch blocks, stack traces in user-facing responses, catching `Exception` broadly.

### Object Construction (OBJ)

- **OBJ01-J**: Limit accessibility of fields
- **OBJ04-J**: Provide mutable classes with copy functionality for inputs and outputs
- **OBJ05-J**: Do not return references to private mutable class members

**Look for:** Public mutable fields, returning internal arrays/collections directly, missing defensive copies.

### File I/O (FIO)

- **FIO02-J**: Detect and handle file-related errors
- **FIO08-J**: Distinguish between characters and bytes
- **FIO14-J**: Perform proper cleanup at program termination
- **FIO16-J**: Canonicalize path names before validating

**Look for:** File path validation without canonicalization (path traversal), unclosed streams, missing try-with-resources.

### Numeric (NUM)

- **NUM00-J**: Detect or prevent integer overflow
- **NUM02-J**: Ensure division and modulo operations do not result in divide-by-zero
- **NUM09-J**: Do not use floating-point variables as loop counters

**Look for:** Arithmetic overflow in size calculations, unchecked division, floating-point comparison for equality.

## General (All Languages)

### Expression Rules (EXP)

- Avoid side effects in expressions used for control flow
- Do not compare padding data or uninitialized memory
- Use parentheses for clarity in complex expressions

### Declaration Rules (DCL)

- Minimize variable scope
- Declare variables close to first use
- Use `const`/`final` for values that should not change

### Concurrency Rules

- Protect shared data with appropriate synchronization
- Avoid deadlocks (consistent lock ordering)
- Use thread-safe data structures for concurrent access
- Do not rely on thread scheduling order

---

> For Go, Rust, Python, and TypeScript/JavaScript secure coding patterns,
> see `language-security-patterns.md`.
