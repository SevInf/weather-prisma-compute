# PPg Failure Patterns Reference

## Pattern 1: Reboot STOP Succeeded, START Failed

### Symptoms

- Instance stuck in stopped state
- ukpd.log shows `running` → `stopping` + `Snapshot deleted`
- No subsequent `stopped` → `starting` transition
- cf-workers shows "Reboot cooldown active" on retry attempts

### Timeline Example

```
05:07:53.216  ukpd: running → stopping
05:07:54.849  ukpd: Snapshot deleted
05:07:54+     START phase never executes
05:09:54      PpgFailureDetector retry blocked by cooldown
~17 min       Instance remains down
```

### Root Cause Indicators

- `Snapshot deleted` in ukpd.log (force-stop, not scale-to-zero)
- Rate limiting in cf-workers: `health check rate limit exceeded`
- Cooldown blocking: `Reboot cooldown active... skipping reboot`

### Investigation Steps

1. Confirm ukpd.log shows STOP without START
2. Check cf-workers for cooldown/rate limit messages
3. Determine why START phase failed
4. Check if cooldown duration is appropriate

### Questions to Answer

- What is the reboot cooldown duration?
- Does cooldown trigger on STOP or completed reboot?
- Why no retry after cooldown expires?

---

## Pattern 2: PostgreSQL Unresponsive (External Cause)

### Symptoms

- P2024 errors (connection pool timeout) in otel-traces
- vm.log shows NO PostgreSQL errors before failure
- Checkpoint was in progress when failure occurred
- vmm.log shows `force-shutdown signal`

### Timeline Example

```
05:05:22  vm.log: checkpoint starting (normal)
05:07:04  Instance becomes unresponsive (inferred)
05:07:14  otel-traces: First P2024 errors
05:07:37  vm.log: unexpected EOF on client connection
05:07:53  vmm.log: force-shutdown signal
05:27:05  vm.log: Recovery - "last known up at 05:04:52"
```

### Root Cause Indicators

- No PostgreSQL errors in vm.log before failure
- Recovery point is BEFORE the checkpoint that was in progress
- `/dev/pts: Failed to mount devpts: -19` is BENIGN (normal startup message)

### Investigation Steps

1. Confirm vm.log shows healthy operation before EOF
2. Check vmm.log for shutdown signal type
3. Verify no PostgreSQL errors/warnings before failure
4. Conclude: Issue at Unikraft/VM layer, not PostgreSQL

### Key Insight

PostgreSQL was healthy. Failure was external. Look at:

- Unikraft controller behavior
- Host-level resource exhaustion
- Control plane actions

---

## Pattern 3: Scale-to-Zero Stuck

### Symptoms

- vmm.log shows `snapshot signal` (normal suspend)
- Instance stays stopped despite incoming traffic
- No `running` state after snapshot

### Timeline Example

```
05:00:00  vmm.log: snapshot signal (scale-to-zero)
05:00:01  Instance suspended (expected)
05:05:00  Traffic arrives, wake expected
05:05:00+ Instance never wakes
```

### Root Cause Indicators

- vmm.log shows `snapshot signal` (NOT `force-shutdown`)
- No subsequent `Successfully started microvm` message
- Unikraft API shows instance as `stopped`

### Investigation Steps

1. Verify vmm.log shows snapshot (not force-shutdown)
2. Check if wake requests reach Unikraft (openresty logs)
3. Look for ukpd errors during start attempts
4. Check host resource availability

---

## Pattern 4: Connectivity Errors Only

### Symptoms

- Error code 1016, "Can't reach database server"
- Unikraft API shows instance as `running`
- No errors in vm.log or vmm.log

### Possible Causes

- Stale API cache (instance actually stopped)
- Network routing issue
- OpenResty proxy problem
- DNS resolution failure

### Investigation Steps

1. Verify instance state via API (with `?details=true`)
2. Check openresty logs for proxy errors
3. Look for network-level issues
4. Verify DNS resolution

---

## Pattern 5: High Error Rate, Instance Healthy

### Symptoms

- High error rate in Axiom for specific tenant
- Instance shows as healthy in all APIs
- vm.log shows normal operation

### Possible Causes

- QE (Query Engine) issues, not PPg
- Client-side connection issues
- Rate limiting at Accelerate layer
- Brief transient errors already resolved

### Investigation Steps

1. Confirm instance is actually healthy (API + logs)
2. Check if errors are from QE layer (otel-traces)
3. Look for client IP patterns in errors
4. Check if errors have already stopped

---

## Log Signal Reference

### vmm.log Signals

| Signal                            | Meaning                    | Concern Level |
| --------------------------------- | -------------------------- | ------------- |
| `Received snapshot signal`        | Scale-to-zero suspend      | Normal        |
| `Received force-shutdown signal`  | External stop command      | Investigate   |
| `Successfully started microvm`    | VM started                 | Normal        |
| `loaded from a snapshot`          | Resumed from scale-to-zero | Normal        |
| `configured from one single json` | Cold start                 | Normal        |
| `LISTEN TCP/0.0.0.0:5432`         | PostgreSQL ready           | Healthy       |

### ukpd.log Transitions

| From                 | To         | Meaning                      |
| -------------------- | ---------- | ---------------------------- |
| `running`            | `stopping` | Stop initiated               |
| `stopped`            | `starting` | Start initiated              |
| `starting`           | `running`  | Instance ready               |
| + `Snapshot deleted` | -          | Force-stop (state destroyed) |

### vm.log Messages

| Message                                      | Meaning            | Concern Level |
| -------------------------------------------- | ------------------ | ------------- |
| `checkpoint starting/complete`               | Normal operation   | Healthy       |
| `unexpected EOF on client connection`        | Connection dropped | Symptom       |
| `database system was not properly shut down` | Crash recovery     | Post-crash    |
| `last known up at {TIME}`                    | Recovery point     | Post-crash    |
| `/dev/pts: Failed to mount devpts: -19`      | Startup message    | Benign        |

### cf-workers Messages

| Message                                   | Meaning             |
| ----------------------------------------- | ------------------- |
| `[PpgFailureDetector] Processing failure` | Failure detected    |
| `Attempting reboot`                       | Reboot initiated    |
| `Reboot cooldown active`                  | Blocked by cooldown |
| `health check rate limit exceeded`        | Rate limited        |

---

## Decision Tree

```
Instance reported stuck
│
├─ Check TM API: /products/ppg
│  ├─ status: unhealthy → Instance has problem
│  └─ status: healthy → May be stale, verify with Unikraft
│
├─ Check Unikraft API: /v1/instances
│  ├─ state: stopped → Instance is down
│  │  └─ Check vmm.log for shutdown type
│  │     ├─ force-shutdown → Investigate who triggered
│  │     └─ snapshot → Scale-to-zero stuck
│  │
│  ├─ state: running → Instance claims to be up
│  │  └─ Check vm.log for PostgreSQL health
│  │     ├─ Errors present → PostgreSQL issue
│  │     └─ No errors → Network/connectivity issue
│  │
│  └─ state: starting → Instance is starting
│     └─ Wait and re-check, or look for start failures
│
└─ Check Axiom for error timeline
   ├─ Errors stopped → Transient, may be resolved
   └─ Errors ongoing → Active incident
```
