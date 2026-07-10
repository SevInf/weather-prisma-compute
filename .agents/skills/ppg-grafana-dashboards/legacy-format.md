# Dashboard JSON Schema (Legacy Format)

**Use legacy format when:** pasting into the Grafana UI JSON Model editor, duplicating dashboards, or when the user provides a legacy-format dashboard to modify. The Grafana UI **does not accept v2beta1 format** — it will fail with errors like "Dashboard title cannot be empty".

**Use v2beta1 format when:** interacting with the Grafana HTTP API directly.

## Top-Level Structure (Legacy)

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [],
  "refresh": "",
  "schemaVersion": 40,
  "tags": ["ppg"],
  "templating": { "list": [] },
  "time": { "from": "now-2d", "to": "now" },
  "timepicker": { "refresh_intervals": ["1m", "5m", "15m", "30m", "1h", "2h", "1d"] },
  "timezone": "utc",
  "title": "Dashboard Title",
  "uid": null,
  "version": 1
}
```

Set `"uid": null` and `"id": null` when creating a new dashboard or pasting into a duplicated dashboard.

## Panel Template (Legacy)

Each panel is an entry in the `panels[]` array with `gridPos` for positioning:

```json
{
  "id": 1,
  "type": "timeseries",
  "title": "Panel Title",
  "description": "",
  "transparent": true,
  "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
  "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "u9YYRB24k" },
  "fieldConfig": {
    "defaults": { ... },
    "overrides": []
  },
  "options": { ... },
  "targets": [
    {
      "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "u9YYRB24k" },
      "refId": "A",
      "query": "SELECT $timeSeries AS t, count() FROM \"dataset\" WHERE $timeFilter GROUP BY t ORDER BY t",
      "format": "time_series",
      "formattedQuery": "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
      "adHocFilters": [],
      "adHocValuesQuery": "",
      "add_metadata": true,
      "contextWindowSize": "10",
      "dateTimeColDataType": "timestamp",
      "editorMode": "builder",
      "extrapolate": true,
      "interval": "",
      "intervalFactor": 1,
      "round": "0s",
      "showFormattedSQL": true,
      "skip_comments": true,
      "useWindowFuncForMacros": true
    }
  ]
}
```

## Key Differences: Legacy vs v2beta1

| Aspect           | Legacy                                     | v2beta1                                      |
| ---------------- | ------------------------------------------ | -------------------------------------------- |
| Panels           | `panels[]` array                           | `spec.elements` map + `spec.layout`          |
| Position         | `gridPos` on each panel                    | Separate `GridLayoutItem` in layout          |
| Panel type       | `"type": "timeseries"`                     | `vizConfig.group: "timeseries"`              |
| Viz config       | `fieldConfig` + `options` at panel root    | Nested inside `vizConfig.spec`               |
| Queries          | `targets[]` with flat fields               | Nested `PanelQuery` wrappers                 |
| Datasource ref   | `{"type": "...", "uid": "u9YYRB24k"}`      | `{"name": "u9YYRB24k"}`                      |
| Variables        | `templating.list[]` with `"type": "query"` | `variables[]` with `"kind": "QueryVariable"` |
| Variable query   | `"query": "SQL string"`                    | `query.spec.__legacyStringValue`             |
| Variable hide    | `0` / `1` / `2`                            | `"dontHide"` / `"hide"` / `"variable"`       |
| Variable refresh | `1` (load) / `2` (time range)              | `"onDashboardLoad"` / `"onTimeRangeChanged"` |
| Title            | Root-level `"title"`                       | `spec.title`                                 |
| Threshold null   | `"value": null` (first step)               | `"value": 0` (first step)                    |

## Query Variable Template (Legacy)

```json
{
  "type": "query",
  "name": "tenant_id",
  "label": "Tenant",
  "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "u9YYRB24k" },
  "definition": "SELECT substring(index1, 1, 8) AS \"text\", index1 AS \"value\" FROM \"ppg-database-metrics\" WHERE timestamp >= toDateTime($from) AND timestamp <= toDateTime($to) GROUP BY index1",
  "query": "SELECT substring(index1, 1, 8) AS \"text\", index1 AS \"value\" FROM \"ppg-database-metrics\" WHERE timestamp >= toDateTime($from) AND timestamp <= toDateTime($to) GROUP BY index1",
  "current": { "text": "", "value": "" },
  "hide": 0,
  "includeAll": false,
  "multi": false,
  "options": [],
  "refresh": 2,
  "regex": "",
  "skipUrlSync": false,
  "sort": 0,
  "allowCustomValue": false
}
```

## Special Datasource References (Legacy)

```json
// ClickHouse (most panels)
{ "type": "vertamedia-clickhouse-datasource", "uid": "u9YYRB24k" }

// Dashboard datasource (reuse another panel's query)
{ "type": "datasource", "uid": "-- Dashboard --" }
// Target: { "datasource": ..., "refId": "A", "panelId": 3 }

// Grafana built-in (annotations)
{ "type": "grafana", "uid": "-- Grafana --" }

// Expression (cross-query math)
{ "type": "__expr__", "uid": "__expr__" }
```
