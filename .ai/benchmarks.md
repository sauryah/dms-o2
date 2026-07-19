# DMS-O2 Performance Benchmarks Guide

This document defines performance baseline benchmarks for core system flows and provides step-by-step instructions for reproducing and executing tests.

---

## 📊 Baseline Benchmark Targets

| Flow | Endpoint / Action | Test Tool | Baseline Throughput | Baseline Latency (p95) |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST /api/v1/auth/login/` | k6 | 50 RPS | < 120 ms |
| **Go Search** | `GET /api/go/search?q=*` | k6 | 500 RPS | < 45 ms |
| **Direct DB Search**| `GET /api/go/search?size_min=10` | k6 | 150 RPS | < 95 ms |
| **Bulk Import** | `POST /api/v1/dies/import/` | Locust | 1 batch/sec (5k rows)| < 8.0 s (processing) |
| **Excel Export** | `GET /api/v1/dies/export/` | k6 | 10 RPS | < 1.5 s |
| **PDF/SVG Gen** | `GET /api/v1/dies/{id}/blueprint/` | Lighthouse | N/A | < 1.1 s (TTI) |
| **History Audit** | `GET /api/v1/history/dashboard/` | k6 | 80 RPS | < 70 ms |

---

## 🛠️ Performance Testing Tools Setup

We use **k6** for API load testing and **Lighthouse CI** for frontend rendering metrics.

### 1. Installing k6 (Local)
On Fedora / RHEL / CentOS:
```bash
sudo dnf install k6
```
On Debian / Ubuntu:
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD193E37D8582E
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

---

## 🏃 Execution Instructions

The benchmark scripts are located in `scripts/performance/` (conceptually mapped). 

### 1. Running the Go Search API Benchmark
Create `go_search_bench.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% of requests must complete below 50ms
  },
};

export default function () {
  const url = 'http://localhost:8080/api/go/search?q=die';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': 'dms_internal_secret_default_key_998_longer', // Secure header
    },
  };
  const res = http.get(url, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(0.1);
}
```

Execute:
```bash
k6 run go_search_bench.js
```

### 2. Running the Bulk Import Benchmark
Locust is used to simulate concurrent upload loads.
Install locust:
```bash
pip install locust
```

Create `locustfile.py`:
```python
import os
from locust import HttpUser, task, between

class ImportLoadUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def upload_spreadsheet(self):
        # Locate sample 1000 rows CSV
        filepath = "test_import_1000.csv"
        if not os.path.exists(filepath):
            return
        with open(filepath, "rb") as f:
            self.client.post(
                "/api/v1/dies/import/",
                files={"file": ("test_import.csv", f, "text/csv")},
                headers={"X-Requested-With": "XMLHttpRequest"}
            )
```

Execute:
```bash
locust -f locustfile.py --headless -u 10 -r 2 --run-time 1m --host http://localhost:8000
```

---

## 📝 Performance Validation Checklist (Post-Upgrade)

When running benchmarks to validate new changes:
1.  **Warm-up Cache**: Execute a 10-second request cycle first to warm up Redis cache records and PostgreSQL query plans.
2.  **Clear Docker Buffers**: Run `docker system prune` and clear system memory caches between runs to ensure raw execution profiles:
    ```bash
    sudo sh -c 'sync; echo 3 > /proc/sys/vm/drop_caches'
    ```
3.  **Validate DB Size**: Verify database has at least 10,000 seeded die records before measuring queries to ensure scans hit execution limits.
