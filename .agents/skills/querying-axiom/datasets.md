# Data Plane Axiom Datasets

## otel-traces

OpenTelemetry span data from Data Plane services. Use for app-level
investigation: error rates, latency analysis, tracing specific operations.

### Key Fields

- `name` (string) — span name, e.g. `"sendRqliteRequest"`
- `['status.code']` (string) — `"ERROR"`, `"OK"`, or unset. NOT numeric.
  **Gotcha:** error identification is unreliable from this field alone. Errors
  can appear in three ways: (1) `status.code == "ERROR"`, (2) exception events
  in `events` with `status.code` unset, (3) plain events with error messages
  but no exception and no error status. To catch all errors, check
  `status.code`, exception events, AND event message content.
- `duration` (timespan) — supports time literals: `duration < 500ms`,
  `duration < 2s`
- `events` (array) — span events, must `mv-expand events` before accessing
  nested attributes like `events.attributes["exception.message"]`. May contain
  errors even when `status.code` is unset.
- `['attributes.custom']` (map) — custom span attributes. Tenant ID lives
  here but uses inconsistent keys: `prisma.tenant.id`, `prisma.tenant_id`,
  `tenant_id`, and possibly others. Check for multiple variants when filtering
  by tenant.
- `service.name` (string) — which service emitted the span
- `_time` (datetime) — timestamp

### Example Patterns

Error rate over time (15-minute bins):

```apl
['otel-traces']
| where name == "sendRqliteRequest"
| summarize total=count(), errors=countif(['status.code'] == "ERROR") by bin(_time, 15m)
| extend error_rate = round(todouble(errors) / todouble(total) * 100, 2)
| order by _time asc
```

Error breakdown by exception message:

```apl
['otel-traces']
| where name == "sendRqliteRequest"
| where ['status.code'] == "ERROR"
| mv-expand events
| extend error_msg = tostring(events.attributes["exception.message"])
| summarize count() by error_msg
| order by count_ desc
```

Duration distribution (bucketed):

```apl
['otel-traces']
| where name == "sendRqliteRequest"
| where ['status.code'] != "ERROR"
| extend bucket = case(
    duration < 500ms, "0-500ms",
    duration < 1s, "500ms-1s",
    duration < 2s, "1s-2s",
    duration < 3s, "2s-3s",
    duration < 5s, "3s-5s",
    duration < 10s, "5s-10s",
    "10s+"
  )
| summarize count() by bucket
| order by count_ desc
```

---

## cf-workers-trace-events

Cloudflare Workers platform-level trace events. Use for request/response level
analysis: traffic patterns, error rates by endpoint, per-worker breakdowns.

### Key Fields

- `ScriptName` (string) — Worker name, e.g.
  `"ppg-extension-gateway-production"`
- `Entrypoint` (string) — script or DO class that owns the logs
- `EventType` (string) — event classification
- `['Event.Request.URL']` (string) — full request URL, use
  `contains`/`endswith` for path matching
- `['Event.Response.Status']` (integer) — HTTP status code. IS numeric —
  compare with `!= 200`, not `!= "200"`. Opposite convention from
  `otel-traces` `status.code`.
- `Logs` (array) — structured log events from `console.log` and similar,
  stored as a JSON array. Often the most useful debugging information.
- `Outcome` (string) — worker execution outcome. **May lie** — can report
  success when `Logs` contains errors.
- `EventTimestampMs` (integer) — actual event timestamp in epoch milliseconds.
  **Use instead of `_time`** — `_time` is Axiom ingestion time, can lag by
  minutes. **Gotcha:** because this is a raw integer, `bin(EventTimestampMs,
1h)` produces numeric bins that render as nonsensical 1970 timestamps.
  Always convert before binning:
  `extend ts = unixtime_milliseconds_todatetime(EventTimestampMs)` then
  `bin(ts, 1h)`. Filtering with `where` on the raw integer still works fine
  for time scoping — only `bin()` needs the conversion.

### Debugging Durable Objects

Filter by `Entrypoint` to isolate logs from a specific DO class. This is
usually the most effective filter for DO-specific investigation. DO
classes often emit a single trace event with all step logs inline in the
`Logs` array.

Break down traffic by Entrypoint to understand what's driving volume:

```apl
['cf-workers-trace-events']
| where ScriptName contains 'ppg-conductor'
| summarize count() by Entrypoint
| order by count_ desc
```

### Analytics Engine Data

Analytics Engine datasets (e.g., ppg-rollout-events, PPG_PROXY_USAGE)
are not in Axiom. Query them via the Cloudflare dashboard (Workers &
Pages > Analytics Engine) or the AE SQL API. If you need AE data, help
the user construct a SQL query rather than attempting APL.

### Example Patterns

Traffic by endpoint (daily breakdown):

```apl
['cf-workers-trace-events']
| where ScriptName == "ppg-extension-gateway-production"
| extend path = case(
    ['Event.Request.URL'] contains "/proxy/pgbouncer-config", "pgbouncer-config",
    ['Event.Request.URL'] contains "/proxy/metrics", "proxy-metrics",
    ['Event.Request.URL'] contains "/proxy/access", "proxy-access",
    ['Event.Request.URL'] contains "/rqlite-metrics", "rqlite-metrics",
    ['Event.Request.URL'] endswith "/metrics", "db-metrics",
    "other"
  )
| extend ts = unixtime_milliseconds_todatetime(EventTimestampMs)
| summarize request_count=count() by path, bin(ts, 1d)
```

Error rate by status code:

```apl
['cf-workers-trace-events']
| where ScriptName == "ppg-extension-gateway-production"
| where ['Event.Request.URL'] contains "pgbouncer-config"
| where ['Event.Response.Status'] != 200
| extend ts = unixtime_milliseconds_todatetime(EventTimestampMs)
| summarize error_count=count() by ['Event.Response.Status'], bin(ts, 6h)
```

Hourly totals by event type:

```apl
['cf-workers-trace-events']
| where ScriptName == "ppg-extension-gateway-production"
| extend ts = unixtime_milliseconds_todatetime(EventTimestampMs)
| summarize event_count=count() by bin(ts, 1h), EventType
```

Searching for a tenant or instance ID embedded in log messages:

```apl
['cf-workers-trace-events']
| where Entrypoint == "DatabaseInstanceWorkflow"
| where Logs contains "cly1a2b3c4d5e"
| project EventTimestampMs, Entrypoint, Logs
```
