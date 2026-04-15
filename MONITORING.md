# Prometheus & Grafana Monitoring Setup

## Overview
IntelliMail includes comprehensive monitoring with **Prometheus** (metrics collection) and **Grafana** (visualization).

---

## Architecture

```
┌─────────────────────────────────────┐
│ IntelliMail Application             │
│ (Express Server)                    │
│ - Exposes /metrics endpoint         │
│ - Collects HTTP request metrics     │
│ - Tracks response times & errors    │
└─────────────────────────────────────┘
                  │
                  │ (scrapes every 15s)
                  ▼
┌─────────────────────────────────────┐
│ Prometheus (Port 9090)              │
│ - Collects time-series metrics      │
│ - Stores data in prometheus-data    │
│ - Provides query API                │
└─────────────────────────────────────┘
                  │
                  │ (queries)
                  ▼
┌─────────────────────────────────────┐
│ Grafana (Port 3000)                 │
│ - Visualizes metrics                │
│ - Pre-configured dashboards         │
│ - Auto-provisioned datasources      │
└─────────────────────────────────────┘
```

---

## Quick Start

### 1. Start the Stack
```bash
docker-compose up -d --build
```

### 2. Access Services

| Service      | URL                    | Credentials    |
|--------------|------------------------|----------------|
| Application  | http://localhost:5000  | -              |
| Prometheus   | http://localhost:9090  | -              |
| Grafana      | http://localhost:3000  | Admin:admin    |

### 3. Verify Services Running
```bash
docker ps | grep intellmail
```

Expected output:
```
intellmail-app        (Port 5000)
intellmail-prometheus (Port 9090)
intellmail-grafana    (Port 3000)
```

---

## Metrics Collected

### Application Metrics
- **HTTP Requests Total** - `intellmail_http_requests_total`
  - Labels: method, route, status_code
  - Type: Counter (increments on each request)

- **HTTP Request Duration** - `intellmail_http_request_duration_seconds`
  - Labels: method, route, status_code
  - Type: Histogram (tracks latency)
  - Buckets: 5ms, 10ms, 25ms, 50ms, 100ms, 300ms, 1s, 2.5s, 5s, 10s

- **HTTP Errors Total** - `intellmail_http_request_errors_total`
  - Labels: method, route, status_code
  - Type: Counter (5xx responses)

### Process Metrics (Auto-collected)
- CPU usage: `intellmail_process_cpu_seconds_total`
- Memory usage: `intellmail_process_resident_memory_bytes`
- Uptime: `intellmail_up`

---

## Prometheus Configuration

File: `prometheus.yml`

```yaml
global:
  scrape_interval: 15s      # Scrape every 15 seconds
  evaluation_interval: 15s  # Evaluate rules every 15s

scrape_configs:
  - job_name: 'intellmail_app'
    metrics_path: /metrics
    static_configs:
      - targets: ['intellmail:5000']  # IntelliMail container
```

**To modify scraping:**
1. Edit `prometheus.yml`
2. Reload Prometheus at: `http://localhost:9090/-/reload`
   - Or restart: `docker-compose restart prometheus`

---

## Grafana Configuration

### Pre-configured
- ✅ Datasource auto-provisioned (Prometheus)
- ✅ Default dashboard included: IntelliMail Application Metrics
- ✅ All panels configured for HTTP metrics

### Login
- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin
- ⚠️ Change password on first login!

### Create Custom Dashboard
1. Go to Grafana → Dashboards → New
2. Add panels with PromQL queries:

```promql
# HTTP request rate
rate(intellmail_http_requests_total[5m])

# Average response time
rate(intellmail_http_request_duration_seconds_sum[5m]) / rate(intellmail_http_request_duration_seconds_count[5m])

# P95 latency
histogram_quantile(0.95, rate(intellmail_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(intellmail_http_request_errors_total[5m])
```

---

## PromQL Query Examples

### Get HTTP Request Rate (per minute)
```promql
rate(intellmail_http_requests_total[1m])
```

### Top 10 Slowest Routes
```promql
topk(10, histogram_quantile(0.95, rate(intellmail_http_request_duration_seconds_bucket[5m])))
```

### Error Rate (Percentage)
```promql
(rate(intellmail_http_request_errors_total[5m]) / rate(intellmail_http_requests_total[5m])) * 100
```

### Memory Usage (MB)
```promql
intellmail_process_resident_memory_bytes / 1024 / 1024
```

### Request Count by Status Code
```promql
sum(rate(intellmail_http_requests_total[5m])) by (status_code)
```

---

## Troubleshooting

### Prometheus not scraping metrics
1. Check Prometheus logs: `docker logs intellmail-prometheus`
2. Verify IntelliMail /metrics endpoint: `curl http://localhost:5000/metrics`
3. Check prometheus.yml syntax: `docker exec intellmail-prometheus promtool check config /etc/prometheus/prometheus.yml`

### Grafana datasource not connecting
1. Login to Grafana (http://localhost:3000)
2. Go to Configuration → Data Sources
3. Click "Prometheus" and click "Test"
4. Check container network: `docker network inspect intellmail-network`

### Containers not starting
```bash
# Check logs
docker-compose logs prometheus
docker-compose logs grafana

# Restart all
docker-compose down
docker-compose up -d --build
```

### High memory usage
- Prometheus stores time-series data. Default: 15 days retention
- Reduce retention: Add `--storage.tsdb.retention.time=7d` to Prometheus command

---

## Production Recommendations

### Security
- ✅ Change Grafana admin password
- ✅ Enable Grafana authentication (OAuth, LDAP)
- ✅ Use reverse proxy (Nginx) with SSL/TLS
- ✅ Add network policies to limit access

### Performance
- ✅ Increase scrape_interval in prometheus.yml (to 30s)
- ✅ Add service monitor labels for better filtering
- ✅ Use persistent volumes for both Prometheus & Grafana
- ✅ Implement alerting rules in Prometheus

### Alerting (Optional)
Create `prometheus-alerts.yml`:
```yaml
groups:
  - name: intellmail_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(intellmail_http_request_errors_total[5m]) > 0.05
        for: 1m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(intellmail_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "High latency detected"
```

---

## Docker Compose Configuration

Services defined in `docker-compose.yaml`:

### IntelliMail App
- **Image**: Local (built from Dockerfile)
- **Port**: 5000
- **Network**: intellmail-network
- **Volumes**: None
- **Restart**: always

### Prometheus
- **Image**: prom/prometheus:latest
- **Port**: 9090
- **Network**: intellmail-network
- **Volumes**:
  - prometheus.yml (RO)
  - prometheus-data (persistent storage)
- **Command**: Custom args for lifecycle & storage

### Grafana
- **Image**: grafana/grafana:latest
- **Port**: 3000
- **Network**: intellmail-network
- **Volumes**:
  - grafana-data (persistent storage)
  - grafana/provisioning (RO - auto-config)
- **Environment**: Admin password, sign-up disabled

---

## Next Steps

1. ✅ Start stack: `docker-compose up -d --build`
2. ✅ Check metrics: http://localhost:5000/metrics
3. ✅ Open Grafana: http://localhost:3000
4. ✅ Create custom dashboards
5. ✅ Set up alerting (optional)
6. ✅ Monitor your application! 📊

---

**Questions?** Check logs with:
```bash
docker-compose logs -f [service-name]
```
