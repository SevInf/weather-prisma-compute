# Unikraft API Reference

**Base URL:** `https://api.{REGION}.ppg.prisma-data.net`
**Authentication:** Bearer token via `Authorization` header

## Environment Setup

```bash
export UKC_TOKEN="your-unikraft-api-token"
export UKC_REGION="ewr0"  # or fra0, sin0, etc.
export UKC_BASE_URL="https://api.${UKC_REGION}.ppg.prisma-data.net"
```

---

## Instance Management

### Get Instance by Name

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances?name={INSTANCE_NAME}" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "instances": [{
      "uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "name": "database-01abc123def456ghi789jkl0mn",
      "state": "running",
      "created_at": "2025-01-15T10:30:00Z",
      "started_at": "2026-01-20T14:45:22Z",
      "start_count": 1542,
      "memory_mb": 8192,
      "vcpus": 4,
      "scale_to_zero": {
        "enabled": true,
        "policy": "idle",
        "cooldown_time_ms": 5000,
        "stateful": true
      },
      "volumes": [{
        "uuid": "11111111-2222-3333-4444-555555555555",
        "name": "vol-xxxxx",
        "at": "/mnt/data"
      }]
    }]
  }
}
```

**Field Reference:**

| Field                            | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| `uuid`                           | Instance UUID (needed for host log paths)                    |
| `name`                           | Instance name (matches Tenant Manager `instanceId`)          |
| `state`                          | `running`, `stopped`, `starting`                             |
| `created_at`                     | Instance creation timestamp                                  |
| `started_at`                     | Last start timestamp (useful for incident correlation)       |
| `start_count`                    | Total number of starts (high count normal for scale-to-zero) |
| `memory_mb`                      | Memory allocation                                            |
| `vcpus`                          | CPU count                                                    |
| `scale_to_zero.enabled`          | Whether scale-to-zero is active                              |
| `scale_to_zero.cooldown_time_ms` | Idle time before suspend (5000 = 5 seconds)                  |
| `scale_to_zero.stateful`         | Whether state is preserved on suspend                        |
| `volumes[].uuid`                 | Volume UUID                                                  |
| `volumes[].at`                   | Volume mount point                                           |

**Note on Scale-to-Zero:** Short cooldown times (e.g., 5 seconds) are intentional. PPg uses Unikraft unikernels that can suspend and restart PostgreSQL instances in sub-milliseconds. High `start_count` values are normal and expected.

### Get Instance by UUID

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances?uuid={INSTANCE_UUID}" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

### List All Instances

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

### Get Instance with Metrics

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances?name={INSTANCE_NAME}&metrics=true" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

---

## Monitoring & Logs

### Get Instance Logs (Recent Only)

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances/log?name={INSTANCE_NAME}" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

**Note:** This only returns recent logs. For historical logs, SSH access to the host is required.

### Get Instance Metrics

```bash
curl -X GET "${UKC_BASE_URL}/v1/instances/metrics?name={INSTANCE_NAME}&metrics=true" \
  -H "Authorization: Bearer ${UKC_TOKEN}"
```

---

## Instance Lifecycle

### Wait for Instance State

```bash
curl -X POST "${UKC_BASE_URL}/v1/instances/wait" \
  -H "Authorization: Bearer ${UKC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{INSTANCE_NAME}",
    "state": "running",
    "timeout_ms": 60000
  }'
```

---

## Quick Reference

| Operation            | Method | Endpoint                                 |
| -------------------- | ------ | ---------------------------------------- |
| List instances       | GET    | `/v1/instances`                          |
| Get instance by name | GET    | `/v1/instances?name={name}`              |
| Get instance by UUID | GET    | `/v1/instances?uuid={uuid}`              |
| Get with metrics     | GET    | `/v1/instances?name={name}&metrics=true` |
| Get logs (recent)    | GET    | `/v1/instances/log?name={name}`          |
| Wait for state       | POST   | `/v1/instances/wait`                     |

---

## Host Log Paths

When API logs are insufficient, SSH to the host to access full logs:

```
/var/lib/ukp/data/platform/{INSTANCE_UUID}/
├── vmm.log    # Firecracker/VMM logs - instance lifecycle
└── vm.log     # Guest VM logs (PostgreSQL)

/var/log/ukp/
├── platform/ukpd.log              # Controller daemon (can be 2GB+)
└── openresty/error.log-YYYY-MM-DD # Proxy errors (date-rotated)
```

**Fetching with Tailscale SSH:**

```bash
# Small files - fetch whole
tailscale ssh {user}@{host} "cat /var/lib/ukp/data/platform/{UUID}/vmm.log" > vmm.log

# Large files - filter by timestamp (replace YYYY-MM-DD HH with incident time)
tailscale ssh {user}@{host} "sudo grep '^\[{YYYY-MM-DD} {HH}:' /var/log/ukp/platform/ukpd.log" > ukpd.log
```
