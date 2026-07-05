# Observability

This project uses Azure-managed observability for the AKS production environment. We do not run Prometheus or Grafana as pods in the cluster. That is the right call for this lab because it reduces cluster maintenance, avoids another stateful workload to operate, and keeps alerting tied to Azure resources that already own the AKS, PostgreSQL, Service Bus, and Application Insights data.

## Stack

| Layer | Tooling | Why |
| --- | --- | --- |
| Cluster logs | Azure Monitor Container Insights and Log Analytics | Centralizes Kubernetes events, pod state, container logs, and query-based alerts. |
| Metrics | Azure Monitor managed Prometheus | Scrapes app Prometheus endpoints without running Prometheus in AKS. |
| Dashboards | Azure Managed Grafana | Reads Azure Monitor managed Prometheus and Azure Monitor data without maintaining Grafana pods. |
| Traces | Application Insights with OpenTelemetry | Gives request traces across services without building a tracing backend ourselves. |
| Alerts | Azure Monitor action group and alert rules | Sends admin email notifications from the same place that owns infra and app telemetry. |

Infra implementation lives in `D:\Projects\attendance-infra`:

| File | Purpose |
| --- | --- |
| `iac/terraform/observability.tf` | Log Analytics, Azure Monitor workspace, Application Insights, Managed Grafana, diagnostics, action group, and alert rules. |
| `iac/terraform/main.tf` | Enables AKS `oms_agent` and `monitor_metrics`. |
| `iac/terraform/variables.tf` | Adds observability resource names and `observability_admin_email`. |
| `iac/terraform/outputs.tf` | Outputs the Application Insights connection string and observability resource IDs. |
| `iac/ansible/playbook.yml` | Creates `application-insights-secret` from Terraform output. |
| `k8s/aks/ConfigMaps/ama-metrics-settings-configmap.yaml` | Enables managed Prometheus pod annotation scraping for the app namespace. |
| `k8s/aks/Workloads/backend-workloads.yaml` | Adds scrape annotations and tracing environment variables to service pods. |

## Runtime Wiring

Java services expose Prometheus metrics at:

```text
/actuator/prometheus
```

Python services expose Prometheus metrics at:

```text
/metrics
```

These endpoints are internal only. They are scraped by Azure Monitor managed Prometheus through pod annotations and are not exposed through Traefik ingress.

All backend pods receive:

```text
APPLICATIONINSIGHTS_CONNECTION_STRING
OTEL_SERVICE_NAME
APPLICATIONINSIGHTS_ROLE_NAME
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=prod,service.namespace=attendance-platform
```

`APPLICATIONINSIGHTS_CONNECTION_STRING` is not a manual secret. Terraform creates Application Insights, outputs the connection string, and Ansible creates the Kubernetes secret named `application-insights-secret`.

## Metrics We Observe

### Cluster

| Metric or signal | Why it matters |
| --- | --- |
| Node readiness | A NotReady node means pods may be evicted, unschedulable, or isolated from the cluster. |
| Pod restarts | Repeated restarts usually mean bad config, crashes, failing dependencies, or memory pressure. |
| OOM kills | Memory limits are too low, memory usage regressed, or the service has a leak. |
| Deployment availability | Shows whether services have running pods and can serve traffic. |
| Container CPU | Finds services saturating CPU before latency becomes visible to users. |
| Container memory | Finds memory pressure before OOM kills or node pressure. |
| Pending pods | Indicates capacity, scheduling, image pull, or resource request problems. |

### Java Services

Applies to `auth-service`, `user-service`, `attendance-service`, `justification-service`, and `notification-service`.

| Metric | Why it matters |
| --- | --- |
| HTTP request count by route/status | Tells us traffic volume and error rate per service endpoint. |
| HTTP latency percentiles | p95 and p99 latency catch slow user paths that averages hide. |
| JVM heap and non-heap memory | Detects leaks and bad memory sizing. |
| GC pause/count | Shows if memory pressure is hurting response time. |
| JVM threads | Finds blocked thread pools or runaway concurrency. |
| Hikari active/idle/pending connections | Critical because prod DB pools are intentionally small. Pending connections mean the DB pool is saturated. |
| Feign/client failures | Shows downstream service failures before they look like random app errors. |

RabbitMQ health checks remain disabled in AKS for services that no longer use RabbitMQ in prod:

```text
MANAGEMENT_HEALTH_RABBIT_ENABLED=false
management.health.rabbit.enabled=false
```

That must stay. Re-enabling it in prod would create false unhealthy pods because prod messaging uses Azure Service Bus.

### Attendance Service

| Metric | Why it matters |
| --- | --- |
| Session created/started/finalized | Measures the main teacher workflow volume. |
| Attendance mark attempts by method | Splits QR, face, manual, and self-mark behavior. |
| Attendance mark success/failure | Finds broken attendance paths quickly. |
| Self-mark denials | Shows location/rule enforcement and possible abuse or bad configuration. |
| QR/face/self-mark outcomes | Lets us compare reliability of each attendance method. |
| Redis lock wait/failure | Finds concurrency problems around live session updates. |
| Notification publish success/failure | Confirms attendance events reach notification-service. |

Current custom metric added:

```text
notification_events_published_total{transport,outcome}
```

### Justification Service

| Metric | Why it matters |
| --- | --- |
| Submission count | Tracks student usage of the justification workflow. |
| Approval/rejection count | Tracks administrative processing throughput. |
| Attachment upload failures | Finds R2 or file validation failures. |
| R2 failures | Separates object storage problems from application problems. |
| Processing latency | Shows if justification review is becoming slow. |
| Notification publish success/failure | Confirms review events reach notification-service. |

Current custom metric added:

```text
notification_events_published_total{transport,outcome}
```

### Notification Service

| Metric | Why it matters |
| --- | --- |
| Notification events consumed | Shows whether Service Bus/Rabbit consumers are alive. |
| Invalid or ignored events | Finds producer contract bugs. |
| Notifications created | Confirms in-app notification persistence works. |
| Email jobs queued | Confirms email work is being scheduled. |
| Email sent/failed/skipped | Separates SMTP failures from intentionally skipped mail. |
| Service Bus processing errors | Finds message handler failures. |
| Dead-letter messages | Shows messages the system could not process. |

Current custom metrics added:

```text
notification_events_consumed_total{outcome}
notification_email_initial_state_total{outcome}
notification_email_enqueue_total{outcome}
```

### QR Service

| Metric | Why it matters |
| --- | --- |
| QR payload generation | Shows teacher/session QR creation volume. |
| Scan attempts | Shows student QR usage volume. |
| Scan success/failure | Separates valid attendance from broken scans. |
| Expired or invalid payloads | Finds clock, token, or QR expiry problems. |
| Invalid user/session results | Finds caller or data-contract bugs. |
| Upstream attendance-service errors | Separates QR logic from attendance-service failures. |

Current custom metrics added:

```text
qr_payloads_created_total
qr_scan_attempts_total
qr_scan_results_total{outcome}
```

### Face Service

| Metric | Why it matters |
| --- | --- |
| Enrollment success/failure | Shows whether students can enroll face data. |
| Verification matched/not matched | Tracks recognition quality and rejection rate. |
| Attendance verification outcome | Shows whether face verification can complete attendance marking. |
| Quality rejections | Helps tune image-quality gates. |
| Model or embedding failures | Finds ML/runtime regressions. |
| Upstream user-service or attendance-service errors | Separates face logic from dependency failures. |

Current custom metrics added:

```text
face_enrollment_results_total{outcome}
face_verification_results_total{outcome}
face_attendance_results_total{outcome}
```

### Azure Dependencies

| Resource | Metric | Why it matters |
| --- | --- | --- |
| PostgreSQL Flexible Server | CPU percent | Database CPU pressure will surface as slow requests. |
| PostgreSQL Flexible Server | Storage percent | Prevents sudden write failures from full storage. |
| PostgreSQL Flexible Server | Connections | Important because service pools are intentionally small. |
| Azure Service Bus | Active messages | Detects consumer lag/backlog. |
| Azure Service Bus | Dead-letter messages | Detects unprocessable messages and contract bugs. |
| Redis pod | Pod health/restarts | Attendance live-session locking depends on Redis. |

## Alerts

The first alert set is intentionally infrastructure-heavy because it catches the failures that usually take the whole system down:

| Alert | Trigger |
| --- | --- |
| AKS node not ready | Any node reports not ready. |
| Pod restarts | Application pods restart repeatedly in a short window. |
| OOMKilled | Any application pod is killed for memory. |
| Deployment unavailable | Application deployment has no running pods. |
| Container CPU high | App container CPU exceeds the lab threshold. |
| Container memory high | App container memory RSS exceeds the lab threshold. |
| PostgreSQL CPU high | PostgreSQL CPU exceeds threshold. |
| PostgreSQL storage high | PostgreSQL storage exceeds threshold. |
| Service Bus backlog | Active messages exceed threshold. |
| Service Bus dead letters | Any dead-letter messages appear. |

Admin notifications are sent through the Azure Monitor action group created by Terraform. The only new manual input is:

```env
TF_VAR_observability_admin_email="admin@example.com"
```

The email receiver may require confirmation in Azure before alerts are delivered.

## What This Does Not Do Yet

This setup creates the observability foundation, not a complete operations practice.

Missing or still needs hardening:

| Gap | Why it matters |
| --- | --- |
| Grafana dashboards are not codified yet | Managed Grafana exists, but polished dashboards still need to be created/imported. |
| Query alerts use `skip_query_validation` | The Container Insights table shape must be verified in the real Log Analytics workspace. |
| No SLOs yet | We observe latency/errors, but we have not defined reliability targets. |
| No trace sampling policy tuned yet | Default tracing may be too noisy or too expensive under load. |
| No managed identity auth for Service Bus yet | Connection strings are acceptable for the lab, but not the stronger production posture. |

## Homelab Validation

Run this from the infra repo on the homelab machine:

```bash
cd D:/Projects/attendance-infra/iac/terraform
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

Then run Ansible so the generated Application Insights connection string reaches AKS:

```bash
cd D:/Projects/attendance-infra/iac/ansible
ansible-playbook playbook.yml
```

After deploy:

```bash
kubectl kustomize D:/Projects/attendance-infra/k8s/aks
kubectl get pods -n attendance-dev
kubectl get secret application-insights-secret -n attendance-dev
```

Then verify in Azure:

1. Managed Grafana exists and your user has a Grafana role assignment.
2. Azure Monitor workspace receives Prometheus metrics.
3. Log Analytics receives AKS logs and Container Insights data.
4. Application Insights receives traces from services.
5. Azure Monitor action group email is confirmed.
6. A test alert delivers to the admin email.

Do not run `terraform destroy` unless you intentionally want to delete the lab resources.
