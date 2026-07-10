# Tenant Manager API Reference

**Base URL (Production):** `https://tenants.prisma-data.net`
**Authentication:** Bearer token via `Authorization` header

## Environment Setup

```bash
export TM_TOKEN="your-tenant-manager-api-token"
export TM_BASE_URL="https://tenants.prisma-data.net"
```

---

## PPg (Prisma Postgres) Management

### Get PPg Status

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/products/ppg" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

**Response:**

```json
{
  "instanceId": "database-01abc123def456ghi789jkl0mn",
  "hostName": "ewr0",
  "status": "healthy",
  "reasonCode": "HY001",
  "reasonMessage": "instance ready",
  "metrics": {
    "memory_mb": 8192,
    "volume_size_mb": 102400,
    "state": "running",
    "stopped_at": "",
    "ran_since_last_check": true
  },
  "version": "postgres:17.2"
}
```

**Field Reference:**

| Field                          | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `instanceId`                   | Unikraft instance name (use for Unikraft API queries) |
| `hostName`                     | Unikraft host/region code (e.g., `ewr0` = Newark)     |
| `status`                       | Health status: `healthy`, `unhealthy`, `unknown`      |
| `reasonCode`                   | Status code (e.g., `HY001` = healthy, ready)          |
| `reasonMessage`                | Human-readable status                                 |
| `metrics.state`                | Instance state: `running`, `stopped`, `starting`      |
| `metrics.stopped_at`           | ISO timestamp if stopped; empty if running            |
| `metrics.ran_since_last_check` | Whether instance was active since last health check   |
| `version`                      | PostgreSQL version                                    |

---

## Tenant Management

### Get Tenant

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

### List Tenant Query Engines

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/query-engines" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

### List Tenant Databases

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/databases" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

---

## Backups

### List Backups

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/products/ppg/backups" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

### Get Backup Status

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/products/ppg/backups/{BACKUP_ID}" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

---

## Recovery

### Get Recovery Status

```bash
curl -X GET "${TM_BASE_URL}/tenants/{TENANT_ID}/products/ppg/recoveries/{RECOVERY_ID}" \
  -H "Authorization: Bearer ${TM_TOKEN}"
```

---

## Quick Reference

| Operation          | Method | Endpoint                                             |
| ------------------ | ------ | ---------------------------------------------------- |
| Get tenant         | GET    | `/tenants/{id}`                                      |
| Get PPg status     | GET    | `/tenants/{id}/products/ppg`                         |
| List query engines | GET    | `/tenants/{id}/query-engines`                        |
| List databases     | GET    | `/tenants/{id}/databases`                            |
| List backups       | GET    | `/tenants/{id}/products/ppg/backups`                 |
| Get backup         | GET    | `/tenants/{id}/products/ppg/backups/{backupId}`      |
| Get recovery       | GET    | `/tenants/{id}/products/ppg/recoveries/{recoveryId}` |

---

## Host/Region Codes

| Code   | Region           |
| ------ | ---------------- |
| `ewr0` | Newark (US East) |
| `fra0` | Frankfurt (EU)   |
| `sin0` | Singapore (APAC) |
