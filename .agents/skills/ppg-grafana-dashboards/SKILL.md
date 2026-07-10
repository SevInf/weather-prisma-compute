---
name: ppg-grafana-dashboards
description: Use when creating or modifying Grafana Cloud dashboards for PPG monitoring, querying Cloudflare Analytics Engine datasets, or building panels with ClickHouse SQL in legacy or v2beta1 dashboard format
---

# PPG Grafana Cloud Dashboards

## Overview

Reference for creating Grafana Cloud dashboards that query Cloudflare Analytics Engine (CF AE) datasets in the PPG conductor service. Dashboards use the **Altinity ClickHouse datasource plugin** and can be authored in either **legacy format** (for Grafana UI JSON Model editor) or **v2beta1 API format** (for Grafana API).

## When to Use

- Creating a new Grafana dashboard for PPG metrics
- Adding panels to existing PPG dashboards
- Writing ClickHouse SQL queries against CF AE datasets
- Troubleshooting dashboard JSON format issues

**Not for:** Axiom/APL queries, non-PPG services.

## Quick Reference

| Task                                    | Reference                                |
| --------------------------------------- | ---------------------------------------- |
| Write a ClickHouse SQL query            | SQL Query Patterns (below)               |
| Create a panel (v2beta1 API)            | v2beta1-format.md                        |
| Create a panel (legacy/UI)              | legacy-format.md                         |
| Look up proxy usage field mappings      | field-mappings.md                        |
| Look up database metrics field mappings | field-mappings.md                        |
| Add expressions, transforms, overrides  | advanced-panels.md                       |
| Modify an existing dashboard            | Workflow section (below)                 |
| Compare legacy vs v2beta1               | legacy-format.md (Key Differences table) |

## Datasource Configuration

| Setting          | Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| Plugin           | Altinity ClickHouse (`vertamedia-clickhouse-datasource`)                          |
| Datasource UID   | `u9YYRB24k`                                                                       |
| SQL API Endpoint | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql` |
| Auth             | Bearer token via custom HTTP header (`Authorization: Bearer {AE_READ_TOKEN}`)     |
| Folder           | `de0y6hnaq9k3kf` ("PDP PPg")                                                      |

## CF AE Data Model

Fixed schema per dataset:

| Field                | Type     | Description                                                                        |
| -------------------- | -------- | ---------------------------------------------------------------------------------- |
| `index1`             | string   | Primary index (e.g., hostname)                                                     |
| `blob1`-`blob20`     | string   | String fields                                                                      |
| `double1`-`double20` | number   | Numeric fields                                                                     |
| `timestamp`          | DateTime | Event timestamp                                                                    |
| `_sample_interval`   | number   | Sampling weight — every aggregate query must account for this (see Sampling below) |

Field mappings are service-specific. See field-mappings.md for detailed field-by-field mappings. For other datasets, check `writeDataPoint()` calls in source code.

### Sampling

CF AE uses weighted adaptive sampling to handle high data volumes. Sampling happens at two points:

- **Write-time**: if data points are written too quickly into one index, write-side sampling kicks in
- **Query-time**: if a query is too complex, read-side sampling kicks in

Sampling is **per-index and adaptive** — high-traffic indexes get sampled more aggressively, and the rate changes moment to moment based on write volume. The `_sample_interval` column is the weight for each row. When `_sample_interval = 1`, no sampling occurred (the row represents one event). When `_sample_interval = 100`, a 1% sample rate was applied and the row represents 100 events.

**Always use `_sample_interval` in aggregate queries.** When there's no sampling, `_sample_interval = 1` and the result is identical to unweighted aggregates, so there is no cost to always doing it correctly. Using bare `COUNT()`, `SUM()`, or `AVG()` silently undercounts when sampling activates.

| Aggregation             | Correct pattern                                           | Wrong pattern             |
| ----------------------- | --------------------------------------------------------- | ------------------------- |
| Count events            | `SUM(_sample_interval)`                                   | `COUNT()`                 |
| Count with condition    | `sumIf(_sample_interval, condition)`                      | `countIf(condition)`      |
| Sum a numeric field     | `SUM(doubleN * _sample_interval)`                         | `SUM(doubleN)`            |
| Average a numeric field | `SUM(doubleN * _sample_interval) / SUM(_sample_interval)` | `AVG(doubleN)`            |
| Percentile              | `quantileWeighted(0.99, doubleN, _sample_interval)`       | `quantile(0.99)(doubleN)` |

**Limitations of sampled data**: you cannot accurately count unique values for non-indexed fields, cannot reliably observe rare values in non-indexed fields, and cannot guarantee retrieval of individual records. Choose your index to match how users will query the data.

Reference: https://developers.cloudflare.com/analytics/analytics-engine/sampling/

### PPG AE Datasets

Conductor datasets (defined in `services/ppg-conductor/wrangler.toml`):

| Binding                 | Dataset                     | Primary Use                      |
| ----------------------- | --------------------------- | -------------------------------- |
| `ROLLOUT_METRICS`       | `ppg-rollout-events`        | Instance rollout workflow events |
| `FAILURE_METRICS`       | `ppg-instance-failures`     | Instance failure tracking        |
| `BACKUP_METRICS`        | `ppg-backup-events`         | Backup workflow events           |
| `BACKUP_HOST_METRICS`   | `ppg-backup-host-events`    | Per-host backup orchestration    |
| `HOST_METRICS`          | `ppg-host-metrics`          | Host-level metrics               |
| `DATABASE_METRICS`      | `ppg-database-events`       | Database lifecycle events        |
| `RECOVERY_METRICS`      | `ppg-recovery-events`       | Recovery workflow events         |
| `WORKFLOW_METRICS`      | `workflow-do-events`        | Generic workflow DO events       |
| `PPG_PROXY_METRICS`     | `ppg-proxy-metrics`         | TCP proxy metrics                |
| `DETAILED_HOST_METRICS` | `ppg-detailed-host-metrics` | Detailed host stats              |

Extension gateway datasets (defined in `services/ppg-extension-gateway/`):

| Binding                | Dataset                | Primary Use                                               |
| ---------------------- | ---------------------- | --------------------------------------------------------- |
| `PPG_PROXY_USAGE`      | `ppg-proxy-usage`      | Per-connection proxy metrics (connections, bytes, errors) |
| `ACCELERATE_USAGE`     | `accelerate-usage`     | Accelerate request metrics (billing-critical)             |
| `DATABASE_METRICS`     | `ppg-database-metrics` | Database size, ops counters, CPU, memory                  |
| `RQLITE_QUERY_METRICS` | (rqlite metrics)       | rqlite query latency                                      |
| `VM_TIMING_METRICS`    | (vm timing)            | Unikraft VM boot/start timing                             |

## ClickHouse SQL Query Patterns

### Simple Count (stat panel)

```sql
SELECT SUM(_sample_interval) AS total
FROM "ppg-rollout-events"
WHERE $timeFilter
  AND blob1 = 'dispatched'
```

### Conditional Counts

```sql
SELECT
  sumIf(_sample_interval, blob1 = 'dispatched') AS dispatched,
  sumIf(_sample_interval, blob1 = 'failed') AS failed,
  sumIf(_sample_interval, blob1 = 'skipped') AS skipped
FROM "ppg-rollout-events"
WHERE $timeFilter
```

### Time Series (use for timeseries panels)

```sql
SELECT
  formatDateTime(
    toStartOfInterval(timestamp, INTERVAL '5' MINUTE),
    '%Y-%m-%dT%H:%i:%SZ'
  ) AS time,
  sumIf(_sample_interval, blob1 = 'dispatched') AS dispatched,
  sumIf(_sample_interval, blob1 = 'failed') AS failed
FROM "ppg-rollout-events"
WHERE $timeFilter
GROUP BY time
ORDER BY time ASC
```

### Grouped Table (breakdown by dimension)

```sql
SELECT
  index1 AS hostname,
  sumIf(_sample_interval, blob1 = 'dispatched') AS dispatched,
  sumIf(_sample_interval, blob1 = 'failed') AS failed,
  ROUND(sumIf(_sample_interval, blob1 = 'dispatched') * 100.0
    / GREATEST(SUM(_sample_interval), 1), 1) AS success_pct
FROM "ppg-rollout-events"
WHERE $timeFilter
GROUP BY hostname
ORDER BY dispatched DESC
```

### Time Series with $timeSeries Macro

The ClickHouse plugin's `$timeSeries` macro auto-buckets timestamps — simpler than manual `formatDateTime(toStartOfInterval(...))`:

```sql
SELECT
  $timeSeries as t,
  sumIf(_sample_interval, blob1 = 'dispatched') AS dispatched,
  sumIf(_sample_interval, blob1 = 'failed') AS failed
FROM "ppg-rollout-events"
WHERE $timeFilter
GROUP BY t
ORDER BY t
```

### Weighted Average

```sql
SELECT
  $timeSeries as t,
  SUM(double1 * _sample_interval) / SUM(_sample_interval) AS avg_latency
FROM "ppg-proxy-metrics"
WHERE $timeFilter
GROUP BY t
ORDER BY t
```

### Percentile Calculations

Use `quantileWeighted` with `_sample_interval` for accurate percentiles (`quantileExactWeighted` is also available if exact results are needed, but the approximate variant is fine for dashboard panels):

```sql
SELECT
  $timeSeries as t,
  quantileWeighted(0.99, double1, _sample_interval) AS "P99",
  quantileWeighted(0.95, double1, _sample_interval) AS "P95",
  quantileWeighted(0.50, double1, _sample_interval) AS "P50"
FROM "ppg-proxy-metrics"
WHERE $timeFilter
GROUP BY t
ORDER BY t
```

### Key SQL Rules

- **Table names**: Double-quoted (`"ppg-rollout-events"`, not backticks)
- **Time filter**: Always include `$timeFilter` in WHERE clause (Grafana macro)
- **Time bucketing**: Use `$timeSeries as t` macro (preferred), or manual `formatDateTime(toStartOfInterval(timestamp, INTERVAL '5' MINUTE), '%Y-%m-%dT%H:%i:%SZ')`
- **Counting**: `SUM(_sample_interval)` for total counts, `sumIf(_sample_interval, condition)` for conditional counts — never use bare `COUNT()` or `countIf()` (see Sampling section)
- **Sums**: `SUM(doubleN * _sample_interval)` for sums of numeric fields (e.g., bytes, latency)
- **Averages**: `SUM(doubleN * _sample_interval) / SUM(_sample_interval)` — never use bare `AVG()`
- **Percentiles**: `quantileWeighted(0.99, doubleN, _sample_interval)` — always weight by `_sample_interval`
- **String formatting**: `format('{}xx', substring(blob3, 1, 1))` to categorize values (e.g., status codes → "2xx", "5xx")
- **String comparison**: Single-quoted values (`blob1 = 'dispatched'`)
- **No DISTINCT**: CF AE does not support `SELECT DISTINCT` — use `GROUP BY` instead (e.g., `SELECT index1 FROM "dataset" GROUP BY index1`)

## Dashboard JSON Schemas

See v2beta1-format.md for full JSON schema and templates (v2beta1 API format).

See legacy-format.md for legacy JSON schema, templates, and format comparison.

## Workflow: Modifying Existing Dashboards

### Adding Panels to an Existing Dashboard

1. **Get the current dashboard JSON** — ask the user to export from Grafana UI (Dashboard Settings > JSON Model) or fetch via API
2. **Determine the format** — if the JSON has `panels[]` array at root level, it's legacy format; if it has `spec.elements`, it's v2beta1
3. **Always output in the same format as the input** — don't convert between formats unless asked
4. **Find the next available panel ID** — scan existing panels for the highest `id`, increment from there
5. **Find the bottom of the layout** — scan `gridPos` for `max(y + h)` across all panels, start new panels there
6. **Add new panels** — append to `panels[]` (legacy) or add to `spec.elements` + `spec.layout` (v2beta1)
7. **Save the file** — write to `pdp-cloudflare/docs/grafana/<dashboard-name>.json`

### Creating a New Dashboard from Scratch

1. **Prefer legacy format** — it's more widely compatible (works in both UI and API)
2. **Set `"uid": null` and `"id": null`** — Grafana assigns these on import
3. **Include the templating variables** — copy from existing dashboard patterns

### Format Detection Checklist

| Has this at root?                               | Format  |
| ----------------------------------------------- | ------- |
| `"panels": [...]`                               | Legacy  |
| `"apiVersion": "dashboard.grafana.app/v2beta1"` | v2beta1 |
| `"spec": { "elements": {...} }`                 | v2beta1 |

### Handling Large Dashboards (JSON Too Big for Context)

Some PPG dashboards (e.g., PPg Platform Insights) have JSON too large to fit in the conversation context. Use this incremental approach:

**Step 1: Get the dashboard JSON onto disk**

Ask the user to save the exported JSON to a file (e.g., `~/projects/dashboard-export.json`). Do NOT ask the user to paste the full JSON.

**Step 2: Extract what you need with targeted reads**

Find the highest panel ID (to avoid conflicts):

```bash
grep -o '"panel-[0-9]*"' dashboard-export.json | sed 's/"panel-//;s/"//' | sort -n | tail -5
```

For v2beta1 with RowsLayout, find the target collapsible block's layout items to determine the bottom y position.

**Step 3: Ask the user for a reference panel**

Ask the user to paste **one existing panel element** that is similar to what you want to create. This gives you:

- The exact vizConfig structure and version to match
- The query pattern (dataset, field references, GROUP BY dimensions)
- The fieldConfig defaults and overrides style

**Step 4: Ask the user for the target layout block**

For v2beta1 dashboards with `RowsLayout`, ask for the specific `RowsLayoutRow` JSON where new panels should go. This gives you:

- The collapsible block title and structure
- The current layout items and their y positions
- The bottom of the block (last item's `y + height`)

**Step 5: Produce a separate additions file**

Write the new panels to a **separate JSON file** (not the full dashboard), structured as:

```json
{
  "_instructions": "Add elements to spec.elements and layout items to the target row's GridLayout items array",
  "new_elements": {
    "panel-85": { ... },
    "panel-86": { ... }
  },
  "new_layout_items": [
    { "kind": "GridLayoutItem", "spec": { "element": { "kind": "ElementReference", "name": "panel-85" }, "height": 9, "width": 12, "x": 0, "y": 53 } },
    { "kind": "GridLayoutItem", "spec": { "element": { "kind": "ElementReference", "name": "panel-86" }, "height": 9, "width": 12, "x": 12, "y": 53 } }
  ]
}
```

Save to `pdp-cloudflare/docs/grafana/<dashboard-name>-new-panels.json`.

**Step 6: Guide the user through manual integration**

Tell the user exactly:

1. Which elements to copy into `spec.elements` (or `panels[]` for legacy)
2. Which layout items to append and where (which row/collapsible block)
3. Any other changes (e.g., dashboard title)

**Key principles:**

- Never attempt to read or output the full dashboard JSON if it exceeds ~3000 lines
- Always work incrementally: extract metadata → get reference panel → produce additions
- Match the `vizConfig.version` from the reference panel exactly (e.g., `"13.0.0-22326976726"`)
- Match the query pattern (same dataset, same `substring(blob1, ...)` host extraction, etc.)

## Advanced Panel Features

See advanced-panels.md for expression queries, transformations, overrides, and annotations.

## Common Mistakes

| Mistake                                             | Fix                                                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Using backtick-quoted table names                   | Use double quotes: `"ppg-rollout-events"`                                                                                    |
| Missing `$timeFilter` in WHERE                      | Always include it - Grafana injects time range                                                                               |
| Using v2beta1 JSON in Grafana UI editor             | Grafana UI JSON Model only accepts legacy format — use `panels[]` array                                                      |
| Mixing formats in same JSON                         | Detect input format and output the same format                                                                               |
| Missing query spec boilerplate fields               | Copy full spec block from template above                                                                                     |
| Wrong `format` for panel type                       | `"time_series"` for timeseries, `"table"` for everything else                                                                |
| Using bare `COUNT()` or `countIf()`                 | Always use `SUM(_sample_interval)` / `sumIf(_sample_interval, cond)` — sampling is adaptive and can activate without warning |
| Referencing datasource by name string               | Use UID: `{ "name": "u9YYRB24k" }`                                                                                           |
| Using `SELECT DISTINCT`                             | Not supported by CF AE — use `GROUP BY` instead                                                                              |
| Variable `query` as plain string                    | Must be `DashboardDataQueryKind` object with `__legacyStringValue` in spec                                                   |
| Variable `current.text`/`value` as string           | Must be arrays: `["All"]`, `["$__all"]`                                                                                      |
| Setting `allValue: ""`                              | Omit `allValue` entirely — empty string produces `IN ()` when All selected                                                   |
| Using `$timeFilter` in variable queries             | Variable queries don't have time range context — omit `$timeFilter`                                                          |
| Filtering TCP with `blob4 = 'tcp'`                  | Empty `blob4` also means TCP — use `(blob4 = '' OR blob4 = 'tcp')`                                                           |
| Displaying transport without normalizing            | Use `if(blob4 = '', 'tcp', blob4) AS transport` for clean labels                                                             |
| Using `"value": 0` in first threshold step (legacy) | Legacy format uses `"value": null` for the first step                                                                        |

## Reference Dashboards

Working examples in the codebase:

- `services/ppg-conductor/docs/grafana-rollout-dashboard.json` - Instance rollout monitoring (v2beta1 format)
- `docs/grafana/ppg-instance-failures-dashboard.md` - Instance failure tracking (query reference + legacy JSON sample)
- `docs/grafana/ppg-tenant-insights-dashboard.json` - Tenant insights dashboard (legacy format, full working example)
