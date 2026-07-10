# Axiom Query Reference for PPg Investigation

## Datasets

| Dataset                   | Description                       | Key Fields                                           |
| ------------------------- | --------------------------------- | ---------------------------------------------------- |
| `otel-traces`             | OpenTelemetry distributed tracing | `name`, `duration_ms`, `events`, `attributes.custom` |
| `cf-workers-trace-events` | Cloudflare Workers execution      | `ScriptName`, `Logs`, `Event.Response.Status`        |
| `prod-events`             | Control plane events              | Various                                              |

---

## Discovery Queries

### Find Tenants with Recent Errors

```apl
['otel-traces']
| where _time > ago(1h)
| where isnotempty(events)
| where events contains "P2024" or events contains "Can't reach database" or events contains "error code: 1016"
| extend tenant_id = tostring(['attributes.custom']['prisma.tenant.id'])
| summarize error_count=count() by tenant_id
| order by error_count desc
| take 20
```

### Find Instance from Tenant Errors

```apl
['otel-traces']
| where _time > ago(2h)
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| where isnotempty(events)
| where events contains "database-"
| extend instance = extract("database-[a-z0-9]+", 0, tostring(events))
| summarize count() by instance
| where isnotempty(instance)
```

---

## Error Timeline Queries

### Error Distribution by Type

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
    events contains "ETIMEDOUT", "timeout",
    events contains "Internal Server Error", "internal-error",
    "other"
)
| summarize count() by error_type, bin(_time, 5m)
| order by _time asc
```

### First Error Timestamp

```apl
['otel-traces']
| where _time > ago(2h)
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| where isnotempty(events)
| summarize first_error=min(_time), last_error=max(_time), total_errors=count()
```

### Error Details (Sample)

```apl
['otel-traces']
| where _time > ago(2h)
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| where isnotempty(events)
| project _time, name, duration_ms, events
| order by _time asc
| take 50
```

---

## Service Health Queries

### Request Success Rate

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

### Compare Affected vs Other Tenants

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "accelerate-edge-production"
| extend is_affected = Logs contains "{TENANT_ID}"
| summarize
    total=count(),
    affected_requests=countif(is_affected),
    affected_errors=countif(is_affected and ['Event.Response.Status'] >= 500),
    other_requests=countif(not(is_affected)),
    other_errors=countif(not(is_affected) and ['Event.Response.Status'] >= 500)
| extend
    affected_error_rate = round(100.0 * affected_errors / affected_requests, 2),
    other_error_rate = round(100.0 * other_errors / other_requests, 4)
```

---

## PpgFailureDetector Queries

### FailureDetector Activity

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "ppg-conductor-production"
| where Logs contains "{TENANT_ID}"
| project _time, Logs
| order by _time asc
```

### Reboot Attempts

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "ppg-conductor-production"
| where Logs contains "{TENANT_ID}"
| where Logs contains "reboot" or Logs contains "Reboot" or Logs contains "cooldown"
| project _time, Logs
| order by _time asc
```

### Health Check Rate Limiting

```apl
['cf-workers-trace-events']
| where _time > ago(2h)
| where ScriptName == "ppg-conductor-production"
| where Logs contains "{TENANT_ID}"
| where Logs contains "rate limit" or Logs contains "health check"
| project _time, Logs
| order by _time asc
```

---

## Query Engine Queries

### QE Start Attempts

```apl
['otel-traces']
| where _time > ago(2h)
| where name contains "startQueryEngine"
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| extend has_error = isnotempty(events)
| summarize total=count(), failed=countif(has_error) by bin(_time, 5m)
| extend failure_rate = round(100.0 * failed / total, 2)
| order by _time asc
```

### QE Latency

```apl
['otel-traces']
| where _time > ago(2h)
| where name contains "startQueryEngine"
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| summarize
    p50=percentile(duration_ms, 50),
    p95=percentile(duration_ms, 95),
    p99=percentile(duration_ms, 99),
    count=count()
    by bin(_time, 5m)
| order by _time asc
```

### QE Stop Reasons

```apl
['otel-traces']
| where _time > ago(2h)
| where name contains "stopQueryEngine"
| where ['attributes.custom']['prisma.tenant.id'] contains "{TENANT_ID}"
| extend reason = extract("reason: ([a-z]+)", 1, tostring(events))
| summarize count() by reason, bin(_time, 5m)
| order by _time asc
```

---

## Time Range Patterns

**For active incidents (last few hours):**

```apl
| where _time > ago(2h)
```

**For specific incident window:**

```apl
| where _time >= datetime('{START_TIME}') and _time <= datetime('{END_TIME}')
// Example: datetime('2026-01-15T14:00:00Z') and datetime('2026-01-15T16:00:00Z')
```

**For historical analysis (with sampling):**

```apl
| where _time > ago(24h)
| sample 0.1  // 10% sample for cost efficiency
```

---

## Output Formatting

**Compact timeline:**

```apl
| summarize count() by bin(_time, 5m)
| order by _time asc
```

**Detailed with all fields:**

```apl
| project _time, name, duration_ms, events, ['attributes.custom']
| order by _time asc
| take 100
```

**Aggregated summary:**

```apl
| summarize
    total=count(),
    errors=countif(isnotempty(events)),
    error_rate=round(100.0 * countif(isnotempty(events)) / count(), 2)
```
