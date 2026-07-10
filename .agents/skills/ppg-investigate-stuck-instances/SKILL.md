---
name: ppg-investigate-stuck-instances
description: Use when investigating stuck or unresponsive PPg (Prisma Postgres) instances, diagnosing instance health issues, or performing root cause analysis on failed instances via API queries, Axiom observability, and host log analysis.
---

# PPg Stuck Instance Investigation

You are investigating a PPg (Prisma Postgres) instance that is stuck, unresponsive, or failed to recover. Follow this systematic methodology to identify the root cause.

## Golden Rules

1. **NEVER GUESS.** Query APIs and logs to verify. "I think it's probably X" is not acceptable.
2. **State facts, not assumptions.** Say "the API shows state=stopped" not "it's probably stopped".
3. **Follow the data.** Every claim traces to an API response, Axiom query, or log entry.
4. **Disprove, don't confirm.** Design queries to falsify your hypothesis.
5. **Be specific.** Use exact timestamps, IDs, and counts.
6. **Ask before SSH.** Never run Tailscale/SSH commands without explicit user permission.
7. **Discover systematically.** If you only have a tenantId, work through the APIs to discover instanceId, UUID, host, etc.

---

## Investigation Phases

### Phase 1: Identify Affected Resources

**Starting point varies - work with what you have:**

| You Have      | Next Step                                       |
| ------------- | ----------------------------------------------- |
| Alert fired   | Extract tenantId from alert details             |
| Tenant ID     | Query Tenant Manager for PPg status             |
| Instance name | Query Unikraft API for instance details         |
| Symptoms only | Query Axiom for recent errors, extract tenantId |

**Resource discovery chain:**

```
tenantId → [TM API: /products/ppg] → instanceId, hostName
instanceId + hostName → [Unikraft API: /v1/instances] → UUID, state, volumes
UUID → host log paths
```

### Phase 2: Assess Current State

**Query both APIs to understand current state:**

1. **Tenant Manager** - Get PPg status and health
2. **Unikraft** - Get instance details, state, metrics

Document:

- Current state (running/stopped/starting)
- Last known healthy timestamp
- Any error codes or reason messages

### Phase 3: Query Axiom for Timeline

**Build the error timeline using these datasets:**

| Dataset                   | Contains                                                   |
| ------------------------- | ---------------------------------------------------------- |
| `otel-traces`             | Query Engine errors, P2024 timeouts, database connectivity |
| `cf-workers-trace-events` | PpgFailureDetector actions, reboot attempts, health checks |
| `prod-events`             | Control plane events, instance lifecycle                   |

**Key questions to answer:**

1. When did errors first appear?
2. What type of errors? (P2024, connection refused, timeout)
3. Did PpgFailureDetector detect the failure?
4. Were recovery attempts made? Did they succeed?

### Phase 4: Analyze Failure Pattern

**Determine the failure mode:**

| Pattern                       | Indicators                                     |
| ----------------------------- | ---------------------------------------------- |
| Instance stopped unexpectedly | vmm.log shows `force-shutdown signal`          |
| Scale-to-zero stuck           | vmm.log shows `snapshot signal` but no restart |
| Reboot failed                 | ukpd.log shows STOP but no START               |
| PostgreSQL unresponsive       | P2024 errors, no PG errors in vm.log           |
| Network/connectivity          | Error 1016, "Can't reach database"             |

### Phase 5: Escalate to Host Logs (If Needed)

**Only with user permission.** Host logs provide deeper insight:

| Log       | Path                                      | Contains                       |
| --------- | ----------------------------------------- | ------------------------------ |
| vmm.log   | `/var/lib/ukp/data/platform/{UUID}/`      | VM lifecycle, shutdown signals |
| vm.log    | `/var/lib/ukp/data/platform/{UUID}/`      | PostgreSQL logs                |
| ukpd.log  | `/var/log/ukp/platform/`                  | Controller state transitions   |
| openresty | `/var/log/ukp/openresty/error.log-{DATE}` | Proxy errors                   |

**Before requesting SSH access, explain:**

1. What you're looking for
2. Why API/Axiom data is insufficient
3. Specific commands you need to run

### Phase 6: Document Findings

Create a structured investigation report with:

- Timeline of events (with sources)
- What was ruled out
- Root cause (or remaining hypotheses)
- Follow-up actions needed

---

## API Quick Reference

### Environment Variables

```bash
export TM_TOKEN="your-tenant-manager-token"
export TM_BASE_URL="https://tenants.prisma-data.net"
export UKC_TOKEN="your-unikraft-token"
export UKC_BASE_URL="https://api.{REGION}.ppg.prisma-data.net"
```

### Tenant Manager API

**Base URL:** `https://tenants.prisma-data.net`

| Operation          | Method | Endpoint                                    |
| ------------------ | ------ | ------------------------------------------- |
| Get PPg status     | GET    | `/tenants/{TENANT_ID}/products/ppg`         |
| Get tenant         | GET    | `/tenants/{TENANT_ID}`                      |
| List query engines | GET    | `/tenants/{TENANT_ID}/query-engines`        |
| List backups       | GET    | `/tenants/{TENANT_ID}/products/ppg/backups` |

**Get PPg Status:**

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/products/ppg" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

**Response fields:**

| Field                | Description                                   |
| -------------------- | --------------------------------------------- |
| `instanceId`         | Unikraft instance name (use for Unikraft API) |
| `hostName`           | Region code (e.g., `ewr0` = Newark)           |
| `status`             | `healthy`, `unhealthy`, `unknown`             |
| `reasonCode`         | Status code (e.g., `HY001` = healthy)         |
| `metrics.state`      | `running`, `stopped`, `starting`              |
| `metrics.stopped_at` | ISO timestamp if stopped                      |

### Unikraft API

**Base URL:** `https://api.{REGION}.ppg.prisma-data.net`

| Operation              | Method | Endpoint                                 |
| ---------------------- | ------ | ---------------------------------------- |
| Get instance           | GET    | `/v1/instances?name={INSTANCE_NAME}`     |
| Get instance by UUID   | GET    | `/v1/instances?uuid={UUID}`              |
| List instances         | GET    | `/v1/instances`                          |
| Get logs (recent only) | GET    | `/v1/instances/log?name={NAME}`          |
| Get metrics            | GET    | `/v1/instances?name={NAME}&metrics=true` |

**Get Instance Details:**

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances?name={INSTANCE_NAME}" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

**Response fields:**

| Field                            | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `uuid`                           | Instance UUID (needed for host log paths)          |
| `name`                           | Instance name (matches TM `instanceId`)            |
| `state`                          | `running`, `stopped`, `starting`                   |
| `started_at`                     | Last start timestamp                               |
| `start_count`                    | Total starts (high count normal for scale-to-zero) |
| `scale_to_zero.cooldown_time_ms` | Idle timeout before suspend                        |
| `volumes[].uuid`                 | Volume UUID                                        |

**Note:** Short cooldown times (e.g., 5 seconds) are intentional. PPg uses Unikraft unikernels that suspend/restart PostgreSQL in sub-milliseconds.

---

## Axiom Query Patterns

### Dataset Reference

| Dataset                   | Use For                                           |
| ------------------------- | ------------------------------------------------- |
| `otel-traces`             | QE errors, database connectivity, latency         |
| `cf-workers-trace-events` | PpgFailureDetector, health checks, CF Worker logs |
| `prod-events`             | Control plane events, lifecycle                   |

### Discovery Queries

**Find tenant from recent errors:**

```apl
['otel-traces']
| where _time > ago(1h)
| where isnotempty(events)
| where events contains "P2024" or events contains "Can't reach database"
| extend tenant_id = tostring(['attributes.custom']['prisma.tenant.id'])
| summarize error_count=count() by tenant_id
| order by error_count desc
| take 10
```

**Get error timeline for tenant:**

```apl
['otel-traces']
| where _time > ago(2h)
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| where isnotempty(events)
| extend error_type = case(
    events contains "P2024", "P2024-pool-timeout",
    events contains "Can't reach database", "db-unreachable",
    events contains "error code: 1016", "accelerate-1016",
    events contains "Network connection lost", "network-lost",
    "other"
)
| summarize count() by error_type, bin(_time, 5m)
| order by _time asc
```

**Check PpgFailureDetector activity:**

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "ppg-conductor-production"
| where Logs contains "{TENANT_ID}"
| project _time, Logs
| order by _time asc
```

**Find first error timestamp:**

```apl
['otel-traces']
| where _time > ago(2h)
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| where isnotempty(events)
| summarize first_error=min(_time)
```

### Service Health Queries

**Request success rate by time:**

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "accelerate-edge-production"
| where Logs contains "{TENANT_ID}"
| summarize
    total=count(),
    success=countif(['Event.Response.Status'] == 200),
    client_errors=countif(['Event.Response.Status'] >= 400 and ['Event.Response.Status'] < 500),
    server_errors=countif(['Event.Response.Status'] >= 500)
    by bin(_time, 5m)
| extend success_rate = round(100.0 * success / total, 2)
| order by _time asc
```

**QE latency during incident:**

```apl
['otel-traces']
| where _time > ago(2h)
| where name contains "startQueryEngine"
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| summarize
    p50=percentile(duration_ms, 50),
    p95=percentile(duration_ms, 95),
    p99=percentile(duration_ms, 99)
    by bin(_time, 5m)
| order by _time asc
```

---

## Host Log Analysis

### Requesting Access

Before SSH, ask the operator:

```
To investigate further, I need to check the host logs on {HOSTNAME}.
This requires SSH access via Tailscale.

I'm looking for:
- vmm.log: VM lifecycle events (shutdown signals, restarts)
- vm.log: PostgreSQL logs (errors, checkpoints)
- ukpd.log: Controller state transitions

May I proceed? If yes, I'll provide the exact commands.
```

### Log Paths

```
# Per-instance logs (need UUID)
/var/lib/ukp/data/platform/{INSTANCE_UUID}/
├── vmm.log    # Firecracker/VMM lifecycle
└── vm.log     # PostgreSQL logs

# Platform logs (large files - filter by time)
/var/log/ukp/platform/ukpd.log
/var/log/ukp/openresty/error.log-{YYYY-MM-DD}
```

### Fetching Logs (Time-Filtered)

```bash
# vmm.log and vm.log (usually small enough to fetch whole)
tailscale ssh {USER}@{HOST} "cat /var/lib/ukp/data/platform/{UUID}/vmm.log" > vmm.log
tailscale ssh {USER}@{HOST} "cat /var/lib/ukp/data/platform/{UUID}/vm.log" > vm.log

# ukpd.log (can be 2GB+ - MUST filter by time)
# Format: [YYYY-MM-DD HH:MM:SS.mmm]
tailscale ssh {USER}@{HOST} "sudo grep '^\[{DATE} {HH}:' /var/log/ukp/platform/ukpd.log" > ukpd.log

# openresty (date-rotated)
# Format: YYYY/MM/DD HH:MM:SS
tailscale ssh {USER}@{HOST} "sudo grep '^{YYYY/MM/DD} {HH}:' /var/log/ukp/openresty/error.log-{DATE}" > openresty.log
```

### Interpreting vmm.log

| Signal                           | Meaning                      | Action                         |
| -------------------------------- | ---------------------------- | ------------------------------ |
| `Received snapshot signal`       | Normal scale-to-zero suspend | Expected behavior              |
| `Received force-shutdown signal` | External stop command        | Investigate who/what triggered |
| `Successfully started microvm`   | VM started/resumed           | Check if from snapshot or cold |
| `LISTEN TCP/0.0.0.0:5432`        | PostgreSQL ready             | Instance is healthy            |

**Key insight:** `force-shutdown signal` ≠ scale-to-zero. It indicates deliberate termination (reboot attempt, manual stop, or system intervention).

### Interpreting ukpd.log

| Transition             | Meaning                                               |
| ---------------------- | ----------------------------------------------------- |
| `running` → `stopping` | Instance being stopped                                |
| `stopped` → `starting` | Instance starting up                                  |
| `starting` → `running` | Instance ready                                        |
| `Snapshot deleted`     | Force-stop with state destruction (NOT scale-to-zero) |

**Key insight:** If you see STOP but no subsequent START, the reboot failed to complete.

### Interpreting vm.log (PostgreSQL)

| Entry                                        | Meaning                                    |
| -------------------------------------------- | ------------------------------------------ |
| `checkpoint starting/complete`               | Normal operation                           |
| `unexpected EOF on client connection`        | Connections being dropped                  |
| `database system was not properly shut down` | Crash recovery needed                      |
| `last known up at {TIME}`                    | Recovery point (crash happened after this) |

**Note:** `/dev/pts: Failed to mount devpts: -19` is benign - occurs during normal VM startup.

---

## Common Failure Patterns

### Pattern 1: Reboot STOP Succeeded, START Failed

**Symptoms:**

- ukpd.log shows `running` → `stopping` + `Snapshot deleted`
- No subsequent `stopped` → `starting` transition
- Instance remains down

**Investigation:**

1. Check cf-workers for PpgFailureDetector logs
2. Look for "Reboot cooldown active" or rate limiting messages
3. Determine why START phase never executed

### Pattern 2: PostgreSQL Unresponsive (External Cause)

**Symptoms:**

- P2024 errors (connection pool timeout)
- vm.log shows no PostgreSQL errors before failure
- Checkpoint was in progress when failure occurred

**Investigation:**

1. Confirm vm.log shows healthy operation before EOF
2. Check vmm.log for shutdown signal type
3. Issue is at Unikraft/VM layer, not PostgreSQL

### Pattern 3: Scale-to-Zero Stuck

**Symptoms:**

- vmm.log shows `snapshot signal` but no restart
- Instance stays stopped despite traffic

**Investigation:**

1. Check if wake requests are reaching Unikraft
2. Look for errors in ukpd.log during start attempts
3. Check for resource exhaustion on host

### Pattern 4: Connectivity Errors Only

**Symptoms:**

- Error code 1016, "Can't reach database"
- Instance shows as running in APIs

**Investigation:**

1. Verify instance is actually running (not stale API cache)
2. Check openresty logs for proxy errors
3. Look for network-level issues

---

## Investigation Checklist

```markdown
## Resource Identification

- [ ] Tenant ID:
- [ ] Instance ID:
- [ ] Unikraft UUID:
- [ ] Host:
- [ ] Region:

## Current State (from APIs)

- [ ] TM PPg status:
- [ ] Unikraft state:
- [ ] Last started_at:

## Timeline (from Axiom)

- [ ] First error time:
- [ ] Error type:
- [ ] PpgFailureDetector detection time:
- [ ] Recovery attempts:

## Root Cause Analysis

- [ ] PostgreSQL healthy before failure? (vm.log)
- [ ] What triggered stop? (vmm.log)
- [ ] Did reboot complete? (ukpd.log)
- [ ] Why did recovery fail? (cf-workers)

## Conclusion

- [ ] Root cause identified:
- [ ] Follow-up actions:
```

---

## References

- `reference/api-tenant-manager.md` - Full Tenant Manager API documentation
- `reference/api-unikraft.md` - Full Unikraft API documentation
- `reference/axiom-queries.md` - Extended query examples
- `reference/failure-patterns.md` - Detailed failure pattern analysis
