# Advanced Panel Features

## Expression Queries (Cross-Query Math)

Combine results from other queries using the `__expr__` datasource. Reference queries by `$refId`:

```json
{
  "kind": "PanelQuery",
  "spec": {
    "hidden": false,
    "refId": "RATIO",
    "query": {
      "datasource": { "name": "__expr__" },
      "group": "__expr__",
      "kind": "DataQuery",
      "spec": {
        "expression": "$FAILED / $TOTAL",
        "type": "math"
      },
      "version": "v0"
    }
  }
}
```

The panel would have queries with `refId: "FAILED"` and `refId: "TOTAL"` alongside this expression query. Useful for ratios, percentages, and derived metrics.

## Transformations

Added in the `transformations` array within `QueryGroup.spec`:

| Kind                 | Purpose                                           | Key Options                                                        |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `rowsToFields`       | Pivot rows into field names/values (for piechart) | `mappings: [{ fieldName, handlerKey: "field.name"/"field.value"}]` |
| `renameByRegex`      | Rename series (e.g., strip prefixes)              | `regex`, `renamePattern`                                           |
| `sortBy`             | Sort rows by field                                | `sort: [{ field, desc }]`                                          |
| `partitionByValues`  | Split one series into many by field values        | `fields: ["blob1"]`, `keepFields: false`                           |
| `calculateField`     | Compute new fields from existing                  | `mode: "binary"` or `"reduceRow"` (see below)                      |
| `organize`           | Reorder, rename, exclude columns                  | `excludeByName`, `indexByName`, `renameByName`                     |
| `joinByField`        | Join multiple queries by common field             | `byField`, `mode: "outerTabular"`                                  |
| `labelsToFields`     | Convert labels to columns                         | `keepLabels: [...]`, `mode: "columns"`                             |
| `prepareTimeSeries`  | Convert to wide format for timeseries viz         | `format: "wide"`                                                   |
| `groupToNestedTable` | Group rows into expandable nested tables          | `fields: { FieldName: { aggregations } }`                          |

Example — pivot rows to fields (for piechart from grouped query):

```json
"transformations": [
  {
    "kind": "rowsToFields",
    "spec": {
      "id": "rowsToFields",
      "options": {
        "mappings": [
          { "fieldName": "status", "handlerKey": "field.name" },
          { "fieldName": "count", "handlerKey": "field.value" }
        ]
      }
    }
  }
]
```

Example — `calculateField` modes:

```json
// Binary mode: compute from two fields
{ "kind": "calculateField", "spec": { "id": "calculateField", "options": {
  "alias": "ratio", "mode": "binary",
  "binary": { "left": "hits", "operator": "/", "right": "total" },
  "replaceFields": true
}}}

// ReduceRow mode: aggregate selected fields into one
{ "kind": "calculateField", "spec": { "id": "calculateField", "options": {
  "alias": "all_hits", "mode": "reduceRow",
  "reduce": { "include": ["swr", "ttl"], "reducer": "sum" },
  "replaceFields": false
}}}
```

Example — rename series to strip "count " prefix:

```json
"transformations": [
  {
    "kind": "renameByRegex",
    "spec": {
      "id": "renameByRegex",
      "options": { "regex": "count (.*)", "renamePattern": "$1" }
    }
  }
]
```

## fieldConfig: Color Overrides and Value Mappings

**Color overrides** — by regex pattern or exact name:

```json
"fieldConfig": {
  "overrides": [
    {
      "matcher": { "id": "byRegexp", "options": "/^2.*$/" },
      "properties": [
        { "id": "color", "value": { "fixedColor": "green", "mode": "fixed" } }
      ]
    },
    {
      "matcher": { "id": "byName", "options": "miss" },
      "properties": [
        { "id": "color", "value": { "fixedColor": "red", "mode": "fixed" } }
      ]
    }
  ]
}
```

Matcher types: `byRegexp` (pattern), `byName` (exact match), `byType` (field type).

**Value mappings** — map string values to colors (useful with `state-timeline`):

```json
"mappings": [
  {
    "type": "value",
    "options": {
      "healthy": { "color": "green", "index": 0 },
      "degraded": { "color": "yellow", "index": 1 },
      "unavailable": { "color": "red", "index": 2 }
    }
  }
]
```

**Thresholds** — color by value range (useful with `gauge` and `stat`):

```json
// Absolute mode: steps are actual values
"thresholds": {
  "mode": "absolute",
  "steps": [
    { "color": "green", "value": 0 },
    { "color": "#EAB839", "value": 0.75 },
    { "color": "red", "value": 0.9 }
  ]
}

// Percentage mode: steps are percentages of min→max range
"thresholds": {
  "mode": "percentage",
  "steps": [
    { "color": "red", "value": 0 },
    { "color": "#EAB839", "value": 25 },
    { "color": "green", "value": 50 }
  ]
}
```

Use `"mode": "percentage"` with `"min"` / `"max"` in `fieldConfig.defaults` to define the range.

## Panel Links

Navigate to other dashboards or external URLs. Supports Grafana variables for time range and field values:

```json
"links": [
  {
    "title": "Jump to Detail Dashboard",
    "url": "https://prismadataplatform.grafana.net/d/slug/name?${__url_time_range}"
  },
  {
    "targetBlank": true,
    "title": "Open in Console",
    "url": "https://example.com/detail?id=${__data.fields.hostname}"
  }
]
```

**Link variables:** `${__url_time_range}` (preserves time range), `${__data.fields.FieldName}` (row field value), `${__field.labels.LabelName}` (series label value).

## Annotation Queries

Show deployment markers or events on all panels. Define in `spec.annotations`:

```json
{
  "kind": "AnnotationQuery",
  "spec": {
    "enable": true,
    "hide": false,
    "iconColor": "purple",
    "name": "Deployments",
    "mappings": {
      "time": { "source": "field", "value": "committed_at" },
      "title": { "source": "field", "value": "message" },
      "tags": { "source": "field", "value": "author" }
    },
    "query": {
      "datasource": { "name": "datasource-uid" },
      "group": "datasource-plugin-id",
      "kind": "DataQuery",
      "spec": { ... },
      "version": "v0"
    }
  }
}
```

## Other Panel Options

- **Collapsed rows**: Set `"collapse": true` on `RowsLayoutRow` to start a section collapsed
- **Transparent panels**: Add `"transparent": true` to panel spec (removes background/border)
- **No-data display**: Set `"noValue": "0"` in `fieldConfig.defaults` to show "0" instead of "No data"
- **Panel description**: Set `"description": "Helpful tooltip text"` on panel spec
