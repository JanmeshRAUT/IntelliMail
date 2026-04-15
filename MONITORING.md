# Prometheus & Grafana Monitoring Setup

## Overview
IntelliMail includes comprehensive monitoring with **Prometheus** (metrics collection) and **Grafana** (visualization).

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

---

## Metrics Collected

### Application Metrics
- **HTTP Requests Total** - `intellmail_http_requests_total`
- **HTTP Request Duration** - `intellmail_http_request_duration_seconds`
- **HTTP Errors Total** - `intellmail_http_request_errors_total`

### Process Metrics (Auto-collected)
- CPU usage: `intellmail_process_cpu_seconds_total`
- Memory usage: `intellmail_process_resident_memory_bytes`
- Uptime: `intellmail_up`

---

## Prometheus Configuration

File: `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'intellmail_app'
    metrics_path: /metrics
    static_configs:
      - targets: ['intellmail:5000']
```

**To modify scraping:**
1. Edit `prometheus.yml`
2. Reload Prometheus: Access `http://localhost:9090/-/reload`
3. Or restart: `docker-compose restart prometheus`

---

## Grafana Configuration

### Login
- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin
- ⚠️ Change password on first login!

### Pre-configured
- ✅ Datasource auto-provisioned (Prometheus)
- ✅ Default dashboard included: IntelliMail Application Metrics
- ✅ All panels configured for HTTP metrics

---

## PromQL Query Examples

### HTTP Request Rate (per minute)
```promql
rate(intellmail_http_requests_total[1m])
```

### Error Rate (Percentage)
```promql
(rate(intellmail_http_request_errors_total[5m]) / rate(intellmail_http_requests_total[5m])) * 100
```

### Memory Usage (MB)
```promql
intellmail_process_resident_memory_bytes / 1024 / 1024
```

### P95 Latency
```promql
histogram_quantile(0.95, rate(intellmail_http_request_duration_seconds_bucket[5m]))
```

---

## Troubleshooting

### Prometheus not scraping metrics
```bash
# Check logs
docker logs intellmail-prometheus

# Verify metrics endpoint
curl http://localhost:5000/metrics

# Check configuration syntax
docker exec intellmail-prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana datasource not connecting
1. Login to Grafana (http://localhost:3000)
2. Go to Configuration → Data Sources
3. Click "Prometheus" and verify URL
4. Click "Test" to verify connection

### Containers not starting
```bash
# Check logs
docker-compose logs prometheus
docker-compose logs grafana

# Restart all
docker-compose down
docker-compose up -d --build
```

---

## Production Recommendations

### Security
- ✅ Change Grafana admin password
- ✅ Enable Grafana authentication (OAuth, LDAP)
- ✅ Use reverse proxy (Nginx) with SSL/TLS
- ✅ Add network policies to limit access

### Performance
- ✅ Increase scrape_interval in prometheus.yml (to 30s)
- ✅ Use persistent volumes for both Prometheus & Grafana
- ✅ Implement alerting rules in Prometheus
- ✅ Monitor storage: `--storage.tsdb.retention.time=30d`

---

## Docker Compose Services

### IntelliMail App
- **Port**: 5000
- **Network**: intellmail-network
- **Restart**: always
- **Health Check**: /health endpoint

### Prometheus
- **Port**: 9090
- **Data Retention**: 30 days
- **Storage**: prometheus-data volume
- **Restart**: unless-stopped

### Grafana
- **Port**: 3000
- **Storage**: grafana-data volume
- **Auto-provisioning**: Enabled
- **Restart**: unless-stopped

---

For more details, see `docker-compose.yaml` configuration.
