# ClickHouse System Tables — Patterns and Gotchas

## system.query_log

The primary source for query failure alerting. Columns used in dashboards:

| Column             | Type     | Notes                                                                |
| ------------------ | -------- | -------------------------------------------------------------------- |
| `event_time`       | DateTime | Use with `$__timeFilter(event_time)` — not `timestamp`               |
| `type`             | String   | `QueryFinish`, `ExceptionWhileProcessing`, `QueryStart`              |
| `user`             | String   | The authenticated user. **Can be empty — see below.**                |
| `initial_user`     | String   | The user who triggered the top-level query (e.g. the INSERT owner)   |
| `exception_code`   | UInt32   | ClickHouse error code (497 = ACCESS_DENIED, 60 = TABLE_DOESNT_EXIST) |
| `exception`        | String   | Full error message                                                   |
| `query`            | String   | The SQL text                                                         |
| `query_kind`       | String   | `Insert`, `Select`, `AsyncInsertFlush`, `View`, etc.                 |
| `query_id`         | String   | Unique ID for this query                                             |
| `initial_query_id` | String   | ID of the parent query that triggered this one                       |

### Filtering for failures

```sql
WHERE type = 'ExceptionWhileProcessing'
  AND $__timeFilter(event_time)
```

### Retention

ClickHouse Cloud retains `system.query_log` for approximately **7 days**.
Set dashboard default time range to `now-24h` or `now-7d` at most.

---

## The empty `user` column

**Symptom:** A row in `system.query_log` has `user = ''` but the exception
message names a real service user (e.g. `vm_metrics: Not enough privileges`).

**Cause:** Materialized view (MV) triggers. When a service user executes an
`INSERT`, ClickHouse fires a child `SELECT` internally to populate the MV.
This child query runs as an internal engine process with no user context —
`user` is empty — but ClickHouse still checks the **inserting user's**
privileges when running the trigger. If those privileges are insufficient, the
error is logged under the empty user.

**How to identify:**

- `user = ''` + `query_kind = 'Select'` + exception names a real user → MV trigger failure
- `initial_user` will be the actual inserting user
- `initial_query_id != query_id` confirms it is a child query

**Fix pattern:** The inserting user needs both `INSERT` and `SELECT` on the
source table, not just `INSERT`. On ClickHouse Cloud, the MV trigger fires
under the inserting user's context:

```sql
-- Wrong: INSERT alone is not enough when a MV exists on the table
GRANT INSERT ON prisma.compute_vm_metrics TO vm_metrics;

-- Correct: SELECT is also required for the MV trigger to fire
GRANT SELECT, INSERT ON prisma.compute_vm_metrics TO vm_metrics;
```

**In dashboards:** Always note in the panel description that empty-user rows
are MV trigger SELECTs, not anonymous queries. Users investigating the table
will otherwise waste time looking for an unauthenticated caller.

---

## Common exception codes

| Code | Name                  | Typical cause                                 |
| ---- | --------------------- | --------------------------------------------- |
| 497  | ACCESS_DENIED         | Missing GRANT (INSERT, SELECT, or MV trigger) |
| 60   | TABLE_DOESNT_EXIST    | Migration not applied, wrong database         |
| 81   | DATABASE_DOESNT_EXIST | Wrong database name in DSN or query           |
| 164  | READONLY              | User has no write grants                      |

---

## Wide-format vs tall-format SQL

The `grafana-clickhouse-datasource` plugin with `"format": 1` (timeseries)
does **not** auto-pivot a `GROUP BY user` into one series per user. Use
`countIf` to pivot manually:

```sql
-- WRONG: produces one merged series
SELECT toStartOfMinute(event_time) AS time, user, COUNT() AS n
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing' AND $__timeFilter(event_time)
GROUP BY time, user ORDER BY time ASC

-- CORRECT: one column per user = one series per user
SELECT
  toStartOfMinute(event_time) AS time,
  countIf(user = 'conduit')       AS conduit,
  countIf(user = 'ppg-conductor') AS "ppg-conductor",
  countIf(user = 'vm_metrics')    AS vm_metrics
  -- ... all known users
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing' AND $__timeFilter(event_time)
GROUP BY time ORDER BY time ASC
```

Table panels (`"format": 2`) accept tall format and `GROUP BY user` works
naturally there.

### Canary pattern for untracked users

Pair the wide-format per-user timeseries with a `uniqExact(user)` series:

```sql
-- Panel A: wide-format per-user (tracks known users)
SELECT toStartOfMinute(event_time) AS time,
  countIf(user = 'conduit') AS conduit, ... FROM system.query_log ...

-- Panel B: distinct failing users (catches unknown ones)
SELECT toStartOfMinute(event_time) AS time,
  uniqExact(user) AS failing_users
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing' AND $__timeFilter(event_time)
GROUP BY time ORDER BY time ASC
```

If Panel B's count exceeds the number of non-zero series in Panel A at any
bucket, a user is failing that is not in the enumerated list. Pair with a
`GROUP BY user` table panel (no filtering) to identify it immediately.

---

## Access control for ch_migrator

`SELECT ON system.*` is blocked on ClickHouse Cloud (`system.zookeeper` is
restricted). Each system table must be granted individually:

```sql
-- In the bootstrap (run once as admin before the migration is deployed):
GRANT SELECT ON system.query_log TO ch_migrator WITH GRANT OPTION;

-- In the migration up.sql:
GRANT SELECT ON system.query_log TO grafana;
GRANT SELECT ON system.query_log TO `grafana-local-stack-ro`;
```

Always update the bootstrap block in `pdp-clickhouse/README.md` when adding
a new system table grant — otherwise the next person to provision a fresh
cluster will hit a missing-privilege failure at migration time.

### Semicolons in migration comments

The golang-migrate ClickHouse driver splits migration files on raw `;`
regardless of context (including `--` comments). Never put a terminating `;`
inside a comment:

```sql
-- WRONG (CI lint fails):
--   GRANT SELECT ON system.query_log TO ch_migrator WITH GRANT OPTION;

-- CORRECT (drop the semicolon in comments):
--   GRANT SELECT ON system.query_log TO ch_migrator WITH GRANT OPTION
```
