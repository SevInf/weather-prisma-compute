---
name: clickhouse-grafana-dashboards
description: >
  Use when creating or modifying Grafana dashboards that query ClickHouse
  system tables (system.query_log, system.errors, etc.) for cluster-wide
  observability and alerting. Covers SQL patterns, known ClickHouse Cloud
  behaviours, access control gotchas, and the grafana-clickhouse-datasource
  plugin format. Not for prisma.* application tables (use
  compute-grafana-dashboards for those).
metadata:
  version: "2026.5.27"
---

# ClickHouse Grafana Dashboards

Reference for creating Grafana dashboards that query ClickHouse **system
tables** — primarily `system.query_log` — for cluster-wide failure alerting
and observability.

## Quick Reference

| Topic                               | Reference                        |
| ----------------------------------- | -------------------------------- |
| system.query_log schema and gotchas | clickhouse-system-tables.md      |
| Datasource / panel JSON structure   | (see compute-grafana-dashboards) |

## When to Use

- Creating failure-rate, error-code, or access-denied alerting dashboards
- Querying `system.query_log`, `system.errors`, or other CH system tables
- Debugging why empty-user rows appear in failure queries
- Granting Grafana access to system tables via migrations

**Not for:** dashboards querying `prisma.*` application tables — use
`compute-grafana-dashboards` for those.

## Dashboard Files

```
grafana/   ← in pdp-clickhouse repo root
```

## Workflow

### Creating a New Dashboard

1. Copy boilerplate from `grafana/clickhouse-query-failures.json` in
   `pdp-clickhouse` — datasource ref, annotations, timeSettings, and
   preferences are identical across all dashboards.
2. Default time range for failure dashboards: `"from": "now-24h"` with
   `"autoRefresh": "5m"`. Note: `system.query_log` retains ~7 days on
   ClickHouse Cloud — don't set a longer default or panels will be slow.
3. Write SQL following the patterns in `clickhouse-system-tables.md`.
4. Check the access-control prerequisites before deploying.

### Access Control Prerequisites

The `grafana` service user needs explicit grants for each system table it
queries. `SELECT ON system.*` is blocked on ClickHouse Cloud. Add a migration
to `pdp-clickhouse/migrations/` for each new table:

```sql
GRANT SELECT ON system.query_log TO grafana;
GRANT SELECT ON system.query_log TO `grafana-local-stack-ro`;
```

And update the `ch_migrator` bootstrap in `README.md` with the corresponding
`GRANT SELECT ON system.<table> TO ch_migrator WITH GRANT OPTION` line —
without it the migration will fail at deploy time.
