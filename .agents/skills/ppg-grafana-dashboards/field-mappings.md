# PPG Field Mappings

Field mappings are defined by the `writeDataPoint()` calls in the pdp-cloudflare codebase. **Always read the source files below** to get the current field order — do not rely on hardcoded tables, as fields may be added or reordered.

## PPG Proxy Usage (`ppg-proxy-usage`)

**Source**: `services/ppg-extension-gateway/src/ppg-proxy.ts` — look for the `proxyDataset.writeDataPoint()` call (around line 162).

The `blobs` array defines blob1–blobN in order, `doubles` defines double1–doubleN, and `indexes` defines index1.

**Important**: `blob4` (transport) can be empty string for TCP connections. Always use `if(blob4 = '', 'tcp', blob4)` when displaying transport labels, and `(blob4 = '' OR blob4 = 'tcp')` when filtering for TCP.

## PPG Database Metrics (`ppg-database-metrics`)

**Source**: `services/ppg-extension-gateway/src/metrics.ts` — the field order is defined by the `parsePrometheusRequestBody()` return array (around line 40), and written via `DATABASE_METRICS.writeDataPoint()` (around line 65).

The doubles are mapped positionally from the return array (double1 = first entry, double2 = second, etc.).

## Other Datasets

For other CF AE datasets, find the `writeDataPoint()` call in the corresponding service source code. Common locations:

| Dataset                             | Service               | Source File                                                                                                                          |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `accelerate-usage` (via PPG)        | ppg-extension-gateway | `services/ppg-extension-gateway/src/ppg-proxy.ts` — `accelerateDataset.writeDataPoint()`                                             |
| `accelerate-usage` (via Accelerate) | accelerate-edge       | `services/accelerate-edge/src/accelerateMiddlewares.ts`                                                                              |
| `ppg-canaries-metrics`              | ppg-extension-gateway | `services/ppg-extension-gateway/src/ppg-canaries-metrics.ts`                                                                         |
| `rqlite-query-metrics`              | ppg-extension-gateway | `services/ppg-extension-gateway/src/rqlite-metrics.ts` (types in `services/ppg-extension-gateway/src/rqlite-metrics-types.ts`)       |
| `vm-timing-metrics`                 | ppg-extension-gateway | `services/ppg-extension-gateway/src/vm-timing-metrics.ts` (types in `services/ppg-extension-gateway/src/vm-timing-metrics-types.ts`) |
| Conductor datasets                  | ppg-conductor         | Check `writeDataPoint()` calls in `services/ppg-conductor/` source                                                                   |

All paths are relative to the `pdp-cloudflare/` repo root.
