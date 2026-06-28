# Search Endpoint Load Testing

This document details the performance testing procedure for the high-frequency Go Search Service endpoint (`GET /api/go/search`).

---

## 🛠 Prerequisites

Load tests require a running development or staging stack with seeded database records. The Go API, Meilisearch, Redis Cache, and PostgreSQL services must be online.

Load testing is designed to run via **k6**. You can run it either natively or through a Docker container.

### Option A: Local Installation (Native)
Install k6 on your system (e.g., using apt for Linux):
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD19442217C0678E3A1A0654B649A1559840B7
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Option B: Dockerized Runner (Recommended)
Run the test from the project root directory using the official Docker image:
```bash
docker run --rm -i --net=host grafana/k6 run - <scripts/load_test.js
```

---

## 🚀 Executing the Load Test

Run the following command against the active stack:

```bash
# Using native k6
k6 run scripts/load_test.js

# Using dockerized k6
docker run --rm -i --net=host grafana/k6 run - <scripts/load_test.js
```

---

## 📊 Baseline Performance Results

The following is the baseline performance profile captured running against the standard development container stack (Intel Core i7, 16GB RAM):

```text
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: scripts/load_test.js
     output: -

  scenarios: (100.00%) 1 scenario, 50 max VUs, 1m0s duration (incl. gracefulStop: 30s)

           ✓ status is 200

     ✓ http_req_duration..............: avg=2.45ms   min=0.28ms p(90)=4.89ms  p(95)=7.12ms  max=32.14ms
       { expected_response:true }.....: avg=2.45ms   min=0.28ms p(90)=4.89ms  p(95)=7.12ms  max=32.14ms
     ✓ http_req_failed................: 0.00%        ✓ 0          ✗ 12450
     
     vus..............................: 50           min=50       max=50
     vus_max..........................: 50           min=50       max=50
```

### Summary Analysis
- **p95 Request Latency**: **7.12ms** (Well below the **200ms** threshold requirement).
- **Error Rate**: **0.00%** (Below the **1%** threshold).
- **Throughput**: **~415 requests per second** (Highly scalable due to Go API direct PostgreSQL scans and Redis database 0 key caching).
