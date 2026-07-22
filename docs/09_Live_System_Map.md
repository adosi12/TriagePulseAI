# Sentinel AI — Live System Topology Map

## 1. Overview
The Live System Topology Map is the visual nerve center of Sentinel AI. When a microservice fails, it rarely fails in isolation. Downstream databases or message queues might be the true root cause, while upstream API gateways throw the actual 5xx errors. 

The Topology Map visualizes the **Blast Radius**, showing SREs exactly how a failure is propagating through the architecture in real-time.

## 2. Map Architecture & Data Sources
Sentinel AI builds the dependency graph using a combination of:
1. **OpenTelemetry (OTel):** Analyzes `trace_id` and `span_id` relationships to infer which services talk to which.
2. **Kubernetes API:** Identifies running pods, replica sets, and network policies.
3. **Service Mesh (Istio/Linkerd):** Ingests real-time traffic routing rules.

## 3. Node Types
Each node on the map represents a distinct infrastructure component. Nodes are styled with specific icons:
* 🌐 **API Gateway / Load Balancer**
* 💳 **Microservice (e.g., Payment Gateway, Auth Service)**
* 🗄️ **Database (PostgreSQL, MySQL, MongoDB)**
* ⚡ **Message Queue / Broker (Kafka, RabbitMQ)**
* 🧠 **Cache (Redis, Memcached)**
* 🔑 **Secrets / Identity (Vault, AWS IAM)**

## 4. Health Status States
Nodes change color and pulse based on their real-time health, determined by the Metrics Agent:
* 🟢 **Healthy (Green):** Error rate < 1%, Latency < p95 SLA.
* 🟠 **Degraded (Amber):** Error rate 1% - 5%, or Latency approaching SLA breach. Node pulses slowly.
* 🔴 **Failed (Red):** Error rate > 5%, Pod CrashLoopBackOff, or OOM. Node pulses rapidly.
* 🔵 **Recovering (Blue):** Patch applied, error rates dropping back to normal.

## 5. Edge Types & Failure Propagation
Edges (the lines connecting nodes) represent traffic flow.
* **Synchronous (Solid Line):** HTTP/gRPC requests.
* **Asynchronous (Dashed Line):** Pub/Sub or Message Queue publishing.
* **Failure Animation:** If a Database fails (Red), the solid line connecting it to the Upstream Microservice will turn Red and animate with directional arrows, visually demonstrating the failure cascading upward to the user.

## 6. Real-time Node Metrics
Clicking any node on the map opens a detailed pop-over showing live telemetry:
* **Current Error Rate:** %
* **Throughput:** Req/sec
* **Latency:** p50, p95, p99 (ms)
* **Active Replicas:** (e.g., 2/3 healthy)
* **Latest Deployment:** Commit SHA and Time.

## 7. Service Ownership
Every node is tied to an owner in the `teams` database table. The detail panel includes:
* **Owning Team:** e.g., `PAYMENTS-L2-OPS`
* **On-Call Engineer:** e.g., `Alice Smith`
* **Runbook Link:** Direct link to Confluence/Notion.
* **1-Click Slack Page:** Button to instantly ping the team's channel.

## 8. Map Interaction Design
* **Zoom & Pan:** Infinite canvas (like Figma) to navigate massive architectures.
* **Filtering:** Filter the map by Team ("Show only my services") or by Status ("Show only degraded nodes").
* **Blast Radius Focus:** Click a red node and click "Focus Blast Radius" to dim all unrelated services and only show the direct upstream/downstream dependency chain.
