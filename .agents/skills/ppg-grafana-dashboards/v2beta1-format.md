# Dashboard JSON Schema (v2beta1)

## Top-Level Structure

```json
{
  "apiVersion": "dashboard.grafana.app/v2beta1",
  "kind": "DashboardWithAccessInfo",
  "metadata": {
    "name": "dashboard-slug",
    "annotations": {
      "grafana.app/folder": "de0y6hnaq9k3kf",
      "grafana.app/folderTitle": "PDP PPg",
      "grafana.app/folderUrl": "/dashboards/f/de0y6hnaq9k3kf/pdp-ppg"
    }
  },
  "spec": {
    "elements": {},
    "layout": {},
    "title": "Dashboard Title",
    "tags": ["ppg", "monitoring"],
    "timeSettings": {
      "from": "now-4h",
      "to": "now",
      "timezone": "utc",
      "autoRefresh": "1m",
      "autoRefreshIntervals": [
        "5s",
        "10s",
        "30s",
        "1m",
        "5m",
        "15m",
        "30m",
        "1h",
        "2h",
        "1d"
      ],
      "fiscalYearStartMonth": 0,
      "hideTimepicker": false
    },
    "annotations": [],
    "cursorSync": "Crosshair",
    "editable": true,
    "links": [],
    "liveNow": false,
    "preload": false,
    "variables": []
  },
  "status": {}
}
```

## Panel Element Template

Each panel is a named entry in `spec.elements`:

```json
"panel-my-metric": {
  "kind": "Panel",
  "spec": {
    "data": {
      "kind": "QueryGroup",
      "spec": {
        "queries": [
          {
            "kind": "PanelQuery",
            "spec": {
              "hidden": false,
              "refId": "A",
              "query": {
                "datasource": { "name": "u9YYRB24k" },
                "group": "vertamedia-clickhouse-datasource",
                "kind": "DataQuery",
                "spec": {
                  "adHocFilters": [],
                  "adHocValuesQuery": "",
                  "add_metadata": true,
                  "contextWindowSize": "10",
                  "dateTimeColDataType": "timestamp",
                  "editorMode": "builder",
                  "extrapolate": true,
                  "format": "table",
                  "formattedQuery": "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
                  "interval": "",
                  "intervalFactor": 1,
                  "query": "YOUR SQL HERE",
                  "round": "0s",
                  "skip_comments": true,
                  "useWindowFuncForMacros": true
                },
                "version": "v0"
              }
            }
          }
        ],
        "queryOptions": {},
        "transformations": []
      }
    },
    "description": "",
    "id": 1,
    "links": [],
    "title": "Panel Title",
    "vizConfig": {
      "group": "stat",
      "kind": "VizConfig",
      "spec": {},
      "version": "12.4.0"
    }
  }
}
```

**Critical query spec fields** (always include all of these):

- `adHocFilters`, `adHocValuesQuery`, `add_metadata`, `contextWindowSize`
- `dateTimeColDataType`: always `"timestamp"`
- `editorMode`: `"builder"`
- `extrapolate`: `true`
- `format`: `"table"` (stat/table panels) or `"time_series"` (timeseries panels)
- `formattedQuery`: boilerplate `"SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t"`
- `interval`, `intervalFactor`, `round`, `skip_comments`, `useWindowFuncForMacros`

## Layout Structure

```json
"layout": {
  "kind": "RowsLayout",
  "spec": {
    "rows": [
      {
        "kind": "RowsLayoutRow",
        "spec": {
          "collapse": false,
          "title": "Section Title",
          "layout": {
            "kind": "GridLayout",
            "spec": {
              "items": [
                {
                  "kind": "GridLayoutItem",
                  "spec": {
                    "element": {
                      "kind": "ElementReference",
                      "name": "panel-my-metric"
                    },
                    "x": 0,
                    "y": 0,
                    "width": 12,
                    "height": 8
                  }
                }
              ]
            }
          }
        }
      }
    ]
  }
}
```

**Grid**: 24 columns wide. Common widths: 4 (quarter), 6 (quarter), 8 (third), 12 (half), 24 (full).

## Query Variable Template (e.g., hostname filter)

```json
{
  "kind": "QueryVariable",
  "spec": {
    "allowCustomValue": false,
    "current": { "text": ["All"], "value": ["$__all"] },
    "definition": "SELECT index1 FROM \"ppg-rollout-events\" GROUP BY index1 ORDER BY index1",
    "hide": "dontHide",
    "includeAll": true,
    "multi": true,
    "name": "hostname",
    "options": [],
    "query": {
      "datasource": { "name": "u9YYRB24k" },
      "group": "vertamedia-clickhouse-datasource",
      "kind": "DataQuery",
      "spec": {
        "__legacyStringValue": "SELECT index1 FROM \"ppg-rollout-events\" GROUP BY index1 ORDER BY index1"
      },
      "version": "v0"
    },
    "refresh": "onTimeRangeChanged",
    "regex": "",
    "regexApplyTo": "value",
    "skipUrlSync": false,
    "sort": "alphabeticalAsc"
  }
}
```

**Critical variable fields:**

- `current.text` / `current.value`: Must be **arrays** (e.g., `["All"]`, `["$__all"]`)
- `query.spec`: Use `__legacyStringValue` with the raw SQL — NOT the full panel query boilerplate
- No `$timeFilter` in variable queries — use `$from`/`$to` instead: `timestamp >= toDateTime($from) AND timestamp <= toDateTime($to)`
- No `allValue` field — omit it so Grafana enumerates all values when "All" is selected (empty `allValue` produces `IN ()`)
- `label`: Optional display label (e.g., `"label": "Tenant"` with `"name": "tenant_id"`)
- `allowCustomValue`: Set `true` to allow typing arbitrary values (useful for ID lookups)

## Visualization Types

| `vizConfig.group` | Use For                      | Format          |
| ----------------- | ---------------------------- | --------------- |
| `stat`            | Single value KPIs            | `"table"`       |
| `timeseries`      | Line/bar charts over time    | `"time_series"` |
| `gauge`           | Ratio/threshold indicators   | `"table"`       |
| `state-timeline`  | Status over time (up/down)   | `"time_series"` |
| `table`           | Detailed breakdowns          | `"table"`       |
| `piechart`        | Distribution/proportions     | `"table"`       |
| `barchart`        | Categorical comparisons      | `"table"`       |
| `alertlist`       | Active alerts list           | N/A (no query)  |
| `text`            | Static markdown/HTML content | N/A (no query)  |
