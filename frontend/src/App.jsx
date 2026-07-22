import { useState, useEffect, useCallback } from 'react';
import './index.css';

const API = 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DATA — 10 production incidents with full telemetry
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'scenario-a',
    incident_number: 'INC-8492',
    snow_number: 'INC0094821',
    title: 'Payment Gateway — Jackson Deserialization Failure',
    group_name: 'PAYMENTS-L2-OPS',
    repo_name: 'bank/payment-gateway-service',
    created_by: 'Client ServiceNow Portal (customer_app_service)',
    alert_type: 'MQ Failure / Deserialization Error',
    affected_service: 'payment-gateway',
    impact: 'Critical',
    trans_id: 'TXN_98765',
    severity: 'CRITICAL',
    confidence: 94,
    jira_id: 'TPAI-492',
    summary: 'Environment drift detected: jackson-databind version mismatch between UAT (v2.15.2) and Production (v2.10.1). Production service failed deserializing transactionMetadata field, causing cascading 504 gateway timeouts.',
    error_signature: 'java.lang.NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree(Ljava/lang/String;)',
    rag_match: { title: 'INC-2026-0391 — jackson-databind regression post-deploy', score: 92, resolved: '14 days ago', resolution: 'Bumped jackson-databind in pom.xml to 2.15.2' },
    logs: [
      { level: 'INFO',  text: 'com.bank.payments.GatewayFilter — Request received TXN_98765 from 10.12.4.5', ts: '19:41:58' },
      { level: 'ERROR', text: 'com.bank.payments.TransactionSerializer — NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree(Ljava/lang/String;)', ts: '19:41:59', highlight: true },
      { level: 'WARN',  text: 'com.bank.payments.GatewayFilter — Upstream connection reset after 5000ms timeout', ts: '19:42:01' },
      { level: 'ERROR', text: 'com.bank.payments.PaymentServlet — HTTP 504 Gateway Timeout returned to client TXN_98765', ts: '19:42:05', highlight: true },
      { level: 'FATAL', text: 'com.bank.payments.HealthCheck — 3 consecutive 504 responses — marking service DEGRADED', ts: '19:42:08', highlight: true },
    ],
    metrics: { error_rate: '14.2%', latency_p99: '5,420 ms', throughput: '1,240 req/s', cpu_usage: '68%', timeseries: [
      { t: '19:35', e: 0.2,  l: 120  }, { t: '19:40', e: 1.1,  l: 180  },
      { t: '19:41', e: 8.4,  l: 2400 }, { t: '19:42', e: 14.2, l: 5420 }, { t: '19:43', e: 13.9, l: 5100 },
    ]},
    traces: [
      { service: 'api-gateway',      duration: 12,   pct: 1,   status: 'ok'   },
      { service: 'payment-gateway',  duration: 5420, pct: 95,  status: 'fail' },
      { service: 'jackson-deserializer', duration: 4980, pct: 88, status: 'fail' },
      { service: 'mq-broker',        duration: 220,  pct: 4,   status: 'slow' },
    ],
    topology: [
      { id: 'client',    name: 'Client',     icon: '👤', status: 'healthy',  metric: 'TXN_98765' },
      { id: 'api-gw',    name: 'API Gateway',icon: '🌐', status: 'healthy',  metric: '0.01% err | 12ms' },
      { id: 'payment',   name: 'Payment GW', icon: '💳', status: 'failed',   metric: '14.2% err | 5420ms',
        detail: { 'Error': 'NoSuchMethodError', 'Service': 'payment-gateway', 'Replica': '3/3 down', 'Alert': 'P1 Active' }},
      { id: 'mq',        name: 'RabbitMQ',   icon: '📨', status: 'degraded', metric: '10k+ pending' },
      { id: 'settlement',name: 'Settlement', icon: '🏦', status: 'failed',   metric: 'NoSuchMethodError' },
    ],
    diff: {
      file: 'pom.xml — bank/payment-gateway-service',
      stats: { add: 2, del: 2 },
      lines: [
        { n: 40, type: 'info', code: '@@ -40,4 +40,4 @@ <dependencies>' },
        { n: 41, type: 'del',  code: '-    <jackson.version>2.10.1</jackson.version>' },
        { n: 41, type: 'add',  code: '+    <jackson.version>2.15.2</jackson.version>' },
        { n: 44, type: 'del',  code: '-    <version>${jackson.version}</version>  <!-- PROD -->' },
        { n: 44, type: 'add',  code: '+    <version>2.15.2</version>              <!-- FIXED -->' },
      ]
    },
    files: ['pom.xml', 'src/main/java/com/bank/payments/config/JacksonConfig.java', 'src/main/java/com/bank/payments/service/TransactionSerializer.java'],
    actions: [
      { id: 1, text: 'Bump jackson-databind to 2.15.2 in Prod pom.xml', done: false },
      { id: 2, text: 'Run hotfix deploy pipeline deploy-payment-service-prod', done: false },
      { id: 3, text: 'Clear RabbitMQ dead-letter queue after service recovery', done: false },
    ],
    memory: { incidents: 1842, embeddings: '98,412', patches: 214, postmortems: 88 },
  },
  {
    id: 'scenario-b',
    incident_number: 'INC-9511',
    snow_number: 'INC0095112',
    title: 'Fraud Stream — Kafka Consumer Group Rebalance',
    group_name: 'FRAUD-STREAM-TEAM',
    repo_name: 'bank/fraud-event-processor',
    created_by: 'ServiceNow Monitoring Bot (kafka_alert_sys)',
    alert_type: 'Kafka Consumer Lag / Rebalance Failure',
    affected_service: 'fraud-event-stream',
    impact: 'Critical',
    trans_id: 'TXN_41109',
    severity: 'CRITICAL',
    confidence: 91,
    jira_id: 'TPAI-493',
    summary: 'Kafka Consumer Group Rebalance Failure: Unhandled ConsumerGroupRebalanceError in event processing pipeline causing partition lag to grow at ~50,000 msgs/min. max.poll.interval.ms (300s) exceeded due to slow deserialization of enriched fraud payloads.',
    error_signature: 'ConsumerGroupRebalanceError: maximum poll interval exceeded (300000ms)',
    rag_match: { title: 'INC-2026-0182 — Kafka consumer poll timeout in fraud pipeline', score: 88, resolved: '21 days ago', resolution: 'Increased max.poll.interval.ms to 600000ms' },
    logs: [
      { level: 'WARN',  text: 'org.apache.kafka.clients.consumer.KafkaConsumer — max.poll.interval.ms (300000ms) exceeded', ts: '14:01:10' },
      { level: 'FATAL', text: 'org.apache.kafka.clients.consumer.internals.ConsumerCoordinator — Consumer poll timeout exceeded', ts: '14:01:12', highlight: true },
      { level: 'WARN',  text: 'org.apache.kafka.clients.consumer.KafkaConsumer — Revoking partitions [fraud-events-0, fraud-events-1]', ts: '14:01:15' },
      { level: 'ERROR', text: 'com.bank.fraud.Processor — Stalled partition rebalance loop detected on fraud-events', ts: '14:01:30', highlight: true },
      { level: 'ERROR', text: 'com.bank.fraud.LagMonitor — Partition lag: 48,392 messages — SLA BREACH', ts: '14:01:45', highlight: true },
    ],
    metrics: { error_rate: '28.5%', latency_p99: '12,800 ms', throughput: '450 req/s', cpu_usage: '92%', timeseries: [
      { t: '13:55', e: 0.1,  l: 45    }, { t: '14:00', e: 0.5,  l: 60    },
      { t: '14:01', e: 15.3, l: 4500  }, { t: '14:02', e: 28.5, l: 12800 }, { t: '14:03', e: 27.9, l: 12100 },
    ]},
    traces: [
      { service: 'kafka-broker',     duration: 8,    pct: 1,   status: 'ok'   },
      { service: 'consumer-group',   duration: 12800, pct: 98,  status: 'fail' },
      { service: 'fraud-enrichment', duration: 8900, pct: 70,  status: 'slow' },
      { service: 'event-writer',     duration: 180,  pct: 2,   status: 'ok'   },
    ],
    topology: [
      { id: 'producer', name: 'Event Producer', icon: '📤', status: 'healthy',  metric: '50k msg/min' },
      { id: 'kafka',    name: 'Kafka Broker',   icon: '⚡', status: 'degraded', metric: '48k lag' },
      { id: 'consumer', name: 'Consumer Group', icon: '📥', status: 'failed',   metric: 'Rebalance loop',
        detail: { 'Error': 'Poll timeout exceeded', 'Partitions': '2 revoked', 'Lag': '48,392 msgs', 'Interval': '300s exceeded' }},
      { id: 'fraud-db', name: 'Fraud DB',       icon: '🗄️', status: 'healthy',  metric: 'Waiting...' },
    ],
    diff: {
      file: 'consumer.properties — fraud-event-processor',
      stats: { add: 2, del: 2 },
      lines: [
        { n: 22, type: 'info', code: '@@ -22,4 +22,4 @@ consumer configuration' },
        { n: 23, type: 'del',  code: '- max.poll.interval.ms=300000' },
        { n: 23, type: 'add',  code: '+ max.poll.interval.ms=600000' },
        { n: 24, type: 'del',  code: '- session.timeout.ms=10000' },
        { n: 24, type: 'add',  code: '+ session.timeout.ms=30000' },
      ]
    },
    files: ['src/main/resources/consumer.properties', 'src/main/java/com/bank/fraud/Processor.java'],
    actions: [
      { id: 1, text: 'Increase max.poll.interval.ms to 600000ms in consumer.properties', done: false },
      { id: 2, text: 'Restart consumer worker pods on fleet fraud-stream-prod', done: false },
    ],
    memory: { incidents: 1842, embeddings: '98,412', patches: 214, postmortems: 88 },
  },
  {
    id: 'scenario-c',
    incident_number: 'INC-9340',
    snow_number: 'INC0093405',
    title: 'Payments SSL Certificate Expiry — Vault Token Failure',
    group_name: 'SEC-NET-OPS',
    repo_name: 'bank/auth-vault-certmanager',
    created_by: 'Client Support Escalation (support_lead_john)',
    alert_type: 'TLS / Cert Expiry',
    affected_service: 'payments-gateway',
    impact: 'Critical',
    trans_id: 'TXN_12048',
    severity: 'CRITICAL',
    confidence: 97,
    jira_id: 'TPAI-494',
    summary: 'SSL Handshake Refusal: TLS client certificate expired in HashiCorp Vault at 2026-07-20T12:00:00Z. Cert renewal automated job failed due to expired Vault access token. All HTTPS traffic to payments-gateway rejected.',
    error_signature: 'javax.net.ssl.SSLHandshakeException: Certificate expired at 2026-07-20T12:00:00Z',
    rag_match: { title: 'INC-2026-0094 — payments-gateway TLS cert expiry', score: 97, resolved: '45 days ago', resolution: 'Emergency cert renewal + Vault token rotation' },
    logs: [
      { level: 'ERROR', text: 'org.apache.coyote.http11.Http11NioProtocol — Failed to initialize end point: SSLHandshakeException', ts: '12:05:04', highlight: true },
      { level: 'ERROR', text: 'com.bank.security.VaultClient — HTTP 403 Forbidden on /v1/pki/issue/payments-cert', ts: '12:05:05', highlight: true },
      { level: 'WARN',  text: 'com.bank.certmanager.RenewalJob — Vault token expired — renewal job aborted', ts: '12:05:08' },
      { level: 'FATAL', text: 'com.bank.gateway.Server — Security handshake aborted by peer — marking DOWN', ts: '12:05:10', highlight: true },
      { level: 'ERROR', text: 'com.bank.monitoring.HealthProbe — /health endpoint unreachable (connection refused)', ts: '12:05:15', highlight: true },
    ],
    metrics: { error_rate: '99.8%', latency_p99: '0 ms', throughput: '0 req/s', cpu_usage: '12%', timeseries: [
      { t: '12:00', e: 0.0,  l: 80 }, { t: '12:04', e: 0.0,  l: 85 },
      { t: '12:05', e: 98.2, l: 0  }, { t: '12:06', e: 99.8, l: 0  }, { t: '12:07', e: 99.8, l: 0 },
    ]},
    traces: [
      { service: 'client-tls-handshake', duration: 0,   pct: 100, status: 'fail' },
      { service: 'vault-pki',            duration: 5,   pct: 5,   status: 'fail' },
      { service: 'cert-renewal-job',     duration: 0,   pct: 0,   status: 'fail' },
    ],
    topology: [
      { id: 'client',  name: 'Client HTTPS', icon: '🔒', status: 'failed',   metric: 'TLS rejected' },
      { id: 'nginx',   name: 'Nginx Proxy',  icon: '🌐', status: 'failed',   metric: '99.8% 503',
        detail: { 'Error': 'SSLHandshakeException', 'Cert Expiry': '2026-07-20T12:00:00Z', 'Vault': 'Token expired', 'Impact': '100% traffic blocked' }},
      { id: 'vault',   name: 'HashiCorp Vault', icon: '🔑', status: 'degraded', metric: 'Token expired' },
      { id: 'certmgr', name: 'Cert Manager', icon: '📜', status: 'failed',   metric: 'Job aborted' },
    ],
    diff: {
      file: 'vault/secrets/ssl-cert.pem — auth-vault-certmanager',
      stats: { add: 2, del: 2 },
      lines: [
        { n: 10, type: 'info', code: '@@ -10,4 +10,4 @@ certificate validity' },
        { n: 11, type: 'del',  code: '- VALID_UNTIL: 2026-07-20T12:00:00Z (EXPIRED)' },
        { n: 11, type: 'add',  code: '+ VALID_UNTIL: 2027-12-31T23:59:59Z (VALID)' },
        { n: 12, type: 'del',  code: '- VAULT_TOKEN_TTL=1h  # EXPIRED' },
        { n: 12, type: 'add',  code: '+ VAULT_TOKEN_TTL=720h # RENEWED' },
      ]
    },
    files: ['vault/secrets/ssl-cert.pem', 'src/main/resources/application-prod.yml', 'src/main/java/com/bank/security/TlsSecurityConfig.java'],
    actions: [
      { id: 1, text: 'Renew Vault auth token for cert-manager service account', done: false },
      { id: 2, text: 'Issue emergency 90-day TLS certificate for payments-gateway', done: false },
      { id: 3, text: 'Fix cert renewal cronjob TTL — rotate before expiry', done: false },
    ],
    memory: { incidents: 1842, embeddings: '98,412', patches: 214, postmortems: 88 },
  },
  {
    id: 'scenario-d',
    incident_number: 'INC-9622',
    snow_number: 'INC0096220',
    title: 'Core Banking Auth — JVM Metaspace OOM',
    group_name: 'CORE-BANKING-DEV',
    repo_name: 'bank/core-auth-service',
    created_by: 'ServiceNow Incident Mgmt (client_portal_admin)',
    alert_type: 'JVM Memory / OOM',
    affected_service: 'core-banking-auth',
    impact: 'High',
    trans_id: 'TXN_88301',
    severity: 'HIGH',
    confidence: 89,
    jira_id: 'TPAI-495',
    summary: 'JVM Metaspace Exhaustion: Dynamic CGLIB reflection class generation during peak authentication load exhausted Metaspace memory pool (capped at 128m). Service pods crash-looping with OOM errors.',
    error_signature: 'java.lang.OutOfMemoryError: Metaspace pool exhausted during reflection proxy generation',
    rag_match: { title: 'INC-2026-0412 — JVM Metaspace OOM in auth service', score: 84, resolved: '5 days ago', resolution: 'Set MaxMetaspaceSize=512m + disabled CGLIB proxy' },
    logs: [
      { level: 'WARN',  text: 'org.springframework.security — Metaspace utilization >85% — threshold breached', ts: '11:25:18' },
      { level: 'FATAL', text: 'java.lang.OutOfMemoryError: Metaspace pool exhausted during reflection proxy generation', ts: '11:25:22', highlight: true },
      { level: 'ERROR', text: 'java.lang.ClassLoader — Failed to define class com.bank.auth.Proxy$192840', ts: '11:25:23', highlight: true },
      { level: 'WARN',  text: 'org.springframework.security — Authentication provider fallback triggered', ts: '11:25:30' },
      { level: 'FATAL', text: 'com.bank.auth.AuthService — Pod crash-loop detected — restarting', ts: '11:25:35', highlight: true },
    ],
    metrics: { error_rate: '45.1%', latency_p99: '8,900 ms', throughput: '890 req/s', cpu_usage: '99%', timeseries: [
      { t: '11:20', e: 0.1,  l: 110  }, { t: '11:24', e: 5.2,  l: 1200 },
      { t: '11:25', e: 42.0, l: 8500 }, { t: '11:26', e: 45.1, l: 8900 }, { t: '11:27', e: 44.8, l: 8700 },
    ]},
    traces: [
      { service: 'api-gateway',     duration: 14,   pct: 1,   status: 'ok'   },
      { service: 'auth-service',    duration: 8900, pct: 95,  status: 'fail' },
      { service: 'cglib-proxy',     duration: 7200, pct: 80,  status: 'fail' },
      { service: 'session-store',   duration: 300,  pct: 4,   status: 'slow' },
    ],
    topology: [
      { id: 'lb',    name: 'Load Balancer', icon: '⚖️', status: 'healthy',  metric: 'Routing...' },
      { id: 'auth',  name: 'Auth Service',  icon: '🔐', status: 'failed',   metric: '45.1% err | OOM',
        detail: { 'Error': 'OutOfMemoryError: Metaspace', 'JVM MaxMeta': '128m (exhausted)', 'CGLIB': 'Proxy storm', 'Pods': '2/3 crash-looping' }},
      { id: 'cglib', name: 'CGLIB Proxies', icon: '⚙️', status: 'failed',   metric: '192,840 classes' },
      { id: 'db',    name: 'Auth DB',       icon: '🗄️', status: 'healthy',  metric: 'Idle (blocked)' },
    ],
    diff: {
      file: 'Dockerfile — core-auth-service',
      stats: { add: 2, del: 2 },
      lines: [
        { n: 3, type: 'info', code: '@@ -3,4 +3,4 @@ JVM tuning' },
        { n: 4, type: 'del',  code: '- ENV JVM_ARGS="-XX:MaxMetaspaceSize=128m"' },
        { n: 4, type: 'add',  code: '+ ENV JVM_ARGS="-XX:MaxMetaspaceSize=512m"' },
        { n: 6, type: 'del',  code: '- CGLIB_PROXY_ENABLE=true' },
        { n: 6, type: 'add',  code: '+ CGLIB_PROXY_ENABLE=false' },
      ]
    },
    files: ['Dockerfile', 'src/main/resources/application-prod.yml', 'src/main/java/com/bank/security/AuthSecurityConfig.java'],
    actions: [
      { id: 1, text: 'Set -XX:MaxMetaspaceSize=512m in JVM launch parameters', done: false },
      { id: 2, text: 'Disable runtime CGLIB proxy in AuthSecurityConfig.java', done: false },
    ],
    memory: { incidents: 1842, embeddings: '98,412', patches: 214, postmortems: 88 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeNav, setActiveNav]               = useState('investigate');
  const [selectedId, setSelectedId]             = useState('scenario-a');
  const [llmModel, setLlmModel]                 = useState('Gemini 2.0 Flash');
  const [scenarios, setScenarios]               = useState(SCENARIOS);

  // Outlook modal
  const [showOutlook, setShowOutlook]           = useState(true);

  // Manual Investigation state
  const [manualQuery, setManualQuery]           = useState('');
  const [manualTime, setManualTime]             = useState('60m');
  const [manualSearching, setManualSearching]   = useState(false);
  const [manualResults, setManualResults]       = useState(null);

  // ServiceNow modal
  const [showSnow, setShowSnow]                 = useState(false);
  const [snowGroup, setSnowGroup]               = useState('PAYMENTS-L2-OPS');
  const [snowRepo, setSnowRepo]                 = useState('bank/payment-gateway-service');
  const [snowInc, setSnowInc]                   = useState('INC0094821');
  const [snowFetching, setSnowFetching]         = useState(false);

  // Pipeline state
  const [running, setRunning]                   = useState(false);
  const [pipelineStep, setPipelineStep]         = useState(-1); // -1 = not started, 0-7 = active step idx
  const [completedSteps, setCompletedSteps]     = useState([]);

  // Action list
  const [actionList, setActionList]             = useState(SCENARIOS[0].actions.map(a => ({ ...a })));

  // Integrations
  const [jiraCreated, setJiraCreated]           = useState(false);
  const [slackSent, setSlackSent]               = useState(false);
  const [jiraTickets, setJiraTickets]           = useState([]);

  // Expanded steps
  const [expandedSteps, setExpandedSteps]       = useState(new Set([0, 1, 2, 3, 4]));

  // Topology node detail
  const [selectedNode, setSelectedNode]         = useState(null);

  // Telemetry tab
  const [telemetryTab, setTelemetryTab]         = useState('logs');

  // Settings
  const [apiKey, setApiKey]                     = useState('••••••••••••••••');
  const [slackChannel, setSlackChannel]         = useState('#incident-response');
  const [autoTriage, setAutoTriage]             = useState(true);
  const [saveMsgVisible, setSaveMsgVisible]     = useState(false);

  // Clock
  const [clock, setClock]                       = useState('');

  // Log filter
  const [logSearch, setLogSearch]               = useState('');
  const [logFilter, setLogFilter]               = useState('ALL');

  // Backend
  const [backendOk, setBackendOk]               = useState(null);

  const scenario = scenarios.find(s => s.id === selectedId) || scenarios[0];

  // ── Derived ─────────────────────────────────────────────────────────────
  const getStepStatus = useCallback((idx) => {
    if (running && idx === pipelineStep) return 'active';
    if (completedSteps.includes(idx)) return 'done';
    if (!running && completedSteps.length === 0) return 'done'; // Demo: all done by default
    return 'pending';
  }, [running, pipelineStep, completedSteps]);

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setActionList(scenario.actions.map(a => ({ ...a })));
    setJiraCreated(false);
    setSlackSent(false);
    setSelectedNode(null);
    setCompletedSteps([]);
    setPipelineStep(-1);
    setTelemetryTab('logs');
  }, [selectedId]);

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    }, 1000);
    setClock(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/status`)
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));

    fetch(`${API}/api/scenarios`)
      .then(r => r.json())
      .then(data => {
        if (data.scenarios && data.scenarios.length > 0) {
          // Merge backend scenarios with rich frontend metadata
          console.log('Backend scenarios loaded:', data.scenarios.length);
        }
      })
      .catch(() => {});
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const runPipeline = useCallback(async () => {
    setRunning(true);
    setCompletedSteps([]);
    setPipelineStep(0);

    // Reveal steps one by one with delays
    const stepDelays = [1200, 2000, 2800, 1800, 2200, 3000, 1500, 1200];
    let done = [];

    for (let i = 0; i < 8; i++) {
      setPipelineStep(i);
      // Expand current step
      setExpandedSteps(prev => new Set([...prev, i]));
      await new Promise(r => setTimeout(r, stepDelays[i]));
      done = [...done, i];
      setCompletedSteps([...done]);
    }

    setPipelineStep(-1);
    setRunning(false);

    // Try backend stream
    try {
      const payload = {
        description: scenario.summary,
        error_signature: scenario.error_signature,
        affected_service: scenario.affected_service,
        severity: scenario.severity,
        incident_number: scenario.incident_number,
      };
      const res = await fetch(`${API}/api/alert/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try { console.log('SSE:', JSON.parse(line.slice(6))); } catch {}
          }
        }
      }
    } catch {}
  }, [scenario]);

  const toggleStep = useCallback((idx) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAction = useCallback((id) => {
    setActionList(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  }, []);

  const handleCreateJira = async () => {
    setJiraCreated(true);
    setJiraTickets(prev => [...prev, {
      id: scenario.jira_id,
      summary: scenario.title,
      severity: scenario.severity,
      time: new Date().toLocaleTimeString(),
    }]);
    try {
      await fetch(`${API}/api/jira/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jira_id: scenario.jira_id, summary: scenario.title, severity: scenario.severity, description: scenario.summary }),
      });
    } catch {}
  };

  const handleSendSlack = async () => {
    setSlackSent(true);
    try {
      await fetch(`${API}/api/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: slackChannel, incident_number: scenario.incident_number, message: `🚨 ${scenario.title}` }),
      });
    } catch {}
  };

  const handleSnowFetch = async (e) => {
    e.preventDefault();
    setSnowFetching(true);
    try {
      const params = new URLSearchParams();
      if (snowInc) params.append('incident_number', snowInc);
      if (snowGroup) params.append('group_name', snowGroup);
      if (snowRepo) params.append('repo_name', snowRepo);
      const res = await fetch(`${API}/api/servicenow/tickets?${params.toString()}`);
      const data = await res.json();
      if (data.tickets && data.tickets.length > 0) {
        const t = data.tickets[0];
        const match = scenarios.find(s => s.snow_number === t.incident_number || s.group_name === t.group_name);
        if (match) setSelectedId(match.id);
      }
    } catch {}
    finally {
      setSnowFetching(false);
      setShowSnow(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setManualSearching(true);
    setManualResults(null);
    setTimeout(() => {
      setManualResults({
        session_id: 'sess-' + Math.random().toString(36).substring(2, 9),
        matched_service: 'fraud-event-stream',
        rag_matches: [
          { title: 'INC-2026-0182 — Kafka consumer poll timeout', score: 88, resolution: 'Increased max.poll.interval.ms' }
        ],
        hypothesis: `I analyzed telemetry for the last ${manualTime}. There is a strong correlation between the error signature in your query and a spike in Kafka Consumer Lag in the fraud-event-stream cluster. This strongly matches a past incident (INC-2026-0182).`,
        logs_found: 14,
        metrics_anomaly: 'Memory +40%'
      });
      setManualSearching(false);
    }, 2500);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaveMsgVisible(true);
    setTimeout(() => setSaveMsgVisible(false), 3000);
  };

  const rawLogs = (scenario.logs || []);
  const filteredLogs = rawLogs
    .filter(l => logFilter === 'ALL' || l.level.includes(logFilter))
    .filter(l => !logSearch || l.text.toLowerCase().includes(logSearch.toLowerCase()));

  const chartMax = Math.max(...(scenario.metrics?.timeseries || []).map(d => d.e), 1);

  // ── Step definitions ─────────────────────────────────────────────────────
  const STEPS = [
    { label: 'Incident Intake',          icon: '📥', desc: 'Email/ITSM ingestion, parsing, severity classification' },
    { label: 'Historical Memory Search', icon: '🧠', desc: 'RAG vector search across 6-month incident corpus' },
    { label: 'Telemetry Correlation',    icon: '📊', desc: 'Logs · Metrics · Traces · Deployment events' },
    { label: 'Live Dependency Map',      icon: '🗺️', desc: 'Animated service topology with blast radius' },
    { label: 'Root Cause Analysis',      icon: '💡', desc: 'AI synthesis with confidence scoring' },
    { label: 'Code Investigation',       icon: '🔬', desc: 'Repository scan · Config diff · Patch generation' },
    { label: 'Ticket & Notifications',   icon: '🎫', desc: 'Jira · Slack · Email stakeholder broadcast' },
    { label: 'Incident Memory Update',   icon: '💾', desc: 'Store findings · embeddings · postmortem' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── OUTLOOK MODAL ─────────────────────────────────────────────────── */}
      {showOutlook && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0078d4', letterSpacing: '0.08em', marginBottom: 4 }}>
                  ✉️ MICROSOFT OUTLOOK — UNREAD P1 ALERT
                </div>
                <div className="modal-title">Production Incident Detected</div>
                <div className="modal-sub">{scenario.incident_number} · {scenario.group_name}</div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowOutlook(false)}>✕</button>
            </div>

            <div className="outlook-email-preview">
              <div style={{ marginBottom: 8 }}>
                <span className="from">From: </span>monitoring-alerts@bank.internal<br />
                <span className="from">To: </span>sre-team@bank.internal, {scenario.group_name.toLowerCase()}@bank.internal<br />
                <span className="from">Subject: </span>
                <span className="subj">[{scenario.severity}] {scenario.incident_number} — {scenario.title}</span>
              </div>
              <div className="body">
                <span className="email-flag p1">{scenario.severity}</span>{' '}
                A production incident has been raised in <strong>{scenario.affected_service}</strong>.<br /><br />
                <strong>Error:</strong> <code>{scenario.error_signature.slice(0, 80)}...</code><br />
                <strong>Trans ID:</strong> {scenario.trans_id}<br />
                <strong>Impact:</strong> {scenario.impact} — SLA breach risk<br /><br />
                Sentinel AI is beginning autonomous investigation. Reference: <strong>{scenario.snow_number}</strong>
              </div>
            </div>

            <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowOutlook(false)}>Dismiss</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  setShowOutlook(false);
                  setActiveNav('investigate');
                  runPipeline();
                }}
              >
                ⚡ Launch AI Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICENOW MODAL ──────────────────────────────────────────────── */}
      {showSnow && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#82b4ff', letterSpacing: '0.06em', marginBottom: 4 }}>
                  📥 SERVICENOW ITSM CONNECTOR
                </div>
                <div className="modal-title">Ingest Enterprise Ticket</div>
                <div className="modal-sub">Fetch active incident by Group, Repository, or INC number</div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowSnow(false)}>✕</button>
            </div>

            <form onSubmit={handleSnowFetch}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">ServiceNow Group</label>
                  <input className="form-input" value={snowGroup} onChange={e => setSnowGroup(e.target.value)} placeholder="PAYMENTS-L2-OPS" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Repository</label>
                  <input className="form-input" value={snowRepo} onChange={e => setSnowRepo(e.target.value)} placeholder="bank/service" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">INC Ticket Number</label>
                <input className="form-input" value={snowInc} onChange={e => setSnowInc(e.target.value)} placeholder="INC0094821" />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSnow(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={snowFetching}>
                  {snowFetching ? 'Fetching...' : '🔗 Ingest & Triage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOP NAV ───────────────────────────────────────────────────────── */}
      <nav className="topnav">
        <div className="topnav-left">
          <div className="nav-logo">⚡</div>
          <div className="nav-brand">
            <span className="nav-brand-name">Sentinel AI</span>
            <span className="nav-brand-sub">Autonomous SRE Operating System</span>
          </div>
        </div>

        <div className="topnav-right">
          <button className="btn-outlook" onClick={() => setShowOutlook(true)}>
            ✉️ Outlook P1
          </button>

          <div className={`nav-pill ${backendOk ? 'online' : ''}`}>
            <span className="dot" />
            {backendOk === null ? 'Checking...' : backendOk ? 'API Online' : 'API Offline'}
          </div>

          <div className="nav-pill alert">
            <span className="dot" />
            {scenario.severity} · {scenario.incident_number}
          </div>

          <div className="nav-pill live">
            <span className="dot" />
            Live
          </div>

          <div className="nav-time">{clock}</div>
        </div>
      </nav>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="body-layout">

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="sidebar-label">Investigation</span>
            {[
              { id: 'investigate', icon: '⚡', label: 'AI Triage', badge: running ? 'LIVE' : null },
              { id: 'manual',      icon: '🔎', label: 'Manual Search' },
              { id: 'rca',        icon: '💡', label: 'Root Cause' },
              { id: 'topology',   icon: '🗺️', label: 'Service Map' },
            ].map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Telemetry</span>
            {[
              { id: 'logs',    icon: '📜', label: 'Logs' },
              { id: 'metrics', icon: '📊', label: 'Metrics' },
            ].map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Platform</span>
            {[
              { id: 'integration', icon: '⚙️', label: 'Integrations' },
              { id: 'memory',      icon: '🧠', label: 'Incident Memory' },
              { id: 'impact',      icon: '📈', label: 'AI Impact' },
              { id: 'about',       icon: 'ℹ️', label: 'About Sentinel AI' },
              { id: 'settings',    icon: '🔧', label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Scenario selector */}
          <div className="scenario-select-wrap">
            <span className="scenario-select-label">Demo Scenario</span>
            <select
              className="scenario-select"
              value={selectedId}
              onChange={e => {
                if (e.target.value === '__snow') { setShowSnow(true); return; }
                setSelectedId(e.target.value);
              }}
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.incident_number} — {s.affected_service}</option>
              ))}
              <option value="__snow">📥 Ingest ServiceNow Ticket...</option>
            </select>
          </div>

          {/* LLM selector */}
          <div className="scenario-select-wrap" style={{ paddingTop: 0 }}>
            <span className="scenario-select-label">LLM Model</span>
            <select className="sidebar-select" value={llmModel} onChange={e => setLlmModel(e.target.value)}>
              <option>Gemini 2.0 Flash</option>
              <option>Gemini 1.5 Pro</option>
              <option>Gemini 1.5 Flash</option>
            </select>
          </div>

          {/* Feature toggles */}
          <div className="toggle-section">
            <div className="toggle-row">
              <span className="toggle-label">Historical RAG</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-track" />
              </label>
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Log Analysis</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-track" />
              </label>
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Code Diff</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          <div className="scenario-select-wrap" style={{ paddingTop: 0 }}>
            <button className="sidebar-btn" onClick={() => setShowSnow(true)}>
              🔗 ServiceNow Lookup
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <main className="main-area">

          {/* ────────────────────────────────────────────────────────────────
              VIEW: AI INVESTIGATION STEP-BY-STEP FLOW
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'investigate' && (
            <div className="view-screen">

              {/* Page header */}
              <div className="page-header">
                <div className="page-breadcrumb">
                  <span>Sentinel AI</span>
                  <span>›</span>
                  <span>AI Investigation</span>
                  <span>›</span>
                  <span style={{ color: 'var(--text-2)' }}>{scenario.incident_number}</span>
                </div>
                <div className="page-title-row">
                  <div>
                    <div className="page-title">
                      {scenario.icon} <span>{scenario.incident_number}</span> — {scenario.title}
                    </div>
                    <div className="page-subtitle">
                      {scenario.affected_service} · {scenario.group_name} · {scenario.repo_name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className={`severity-badge ${scenario.severity === 'CRITICAL' ? 'critical' : scenario.severity === 'HIGH' ? 'high' : 'medium'}`}>
                      <span style={{ fontSize: 8 }}>●</span>
                      {scenario.severity} SEVERITY
                    </div>
                    <div className="badge blue">Confidence: {scenario.confidence}%</div>
                  </div>
                </div>
              </div>

              {/* Incident meta strip */}
              <div className="incident-meta-strip">
                {[
                  { label: 'INC Number',  val: scenario.incident_number },
                  { label: 'SNOW Number', val: <code>{scenario.snow_number}</code> },
                  { label: 'Service',     val: <code>{scenario.affected_service}</code> },
                  { label: 'Alert Type',  val: scenario.alert_type },
                  { label: 'Trans ID',    val: <code>{scenario.trans_id}</code> },
                  { label: 'Jira',        val: <code>{scenario.jira_id}</code> },
                  { label: 'Impact',      val: scenario.impact },
                ].map((item, i) => (
                  <div key={i} className="meta-item">
                    <span className="meta-item-label">{item.label}</span>
                    <span className="meta-item-value">{item.val}</span>
                  </div>
                ))}
              </div>

              {/* CTA Bar */}
              <div className="cta-run-pipeline">
                <div>
                  <div className="cta-title">
                    {running ? (
                      <>
                        <span className="loading-dots">
                          <span/><span/><span/>
                        </span>
                        {' '}Running AI Investigation Pipeline — Step {pipelineStep + 1}/8
                      </>
                    ) : completedSteps.length === 8 ? (
                      '✅ Investigation Complete — All 8 steps finished'
                    ) : (
                      '⚡ Run Autonomous AI Investigation Pipeline'
                    )}
                  </div>
                  <div className="cta-sub">
                    {running
                      ? `${llmModel} analyzing ${scenario.affected_service}...`
                      : `${llmModel} · ${scenario.incident_number} · ${scenario.affected_service}`
                    }
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={running}
                  onClick={runPipeline}
                >
                  {running ? 'Investigating...' : '⚡ Run AI Pipeline'}
                </button>
              </div>

              {/* ── STEP-BY-STEP FLOW ────────────────────────────────────── */}
              <div className="investigation-flow">
                {STEPS.map((step, idx) => {
                  const status = getStepStatus(idx);
                  const isOpen = expandedSteps.has(idx);
                  const lineStatus = getStepStatus(idx);

                  return (
                    <div key={idx} className="flow-step">
                      {/* Vertical connector */}
                      {idx < STEPS.length - 1 && (
                        <div className={`step-connector-line ${lineStatus}`} />
                      )}

                      {/* Step indicator */}
                      <div className="step-indicator-col">
                        <div className={`step-circle ${status}`}>
                          {status === 'done' ? '✓' : status === 'active' ? step.icon : idx + 1}
                        </div>
                      </div>

                      {/* Step content */}
                      <div className="step-content-col">
                        <div className="step-header-row" onClick={() => toggleStep(idx)}>
                          <span className="step-number-tag">Step {idx + 1}</span>
                          <span className={`step-title ${status}`}>{step.icon} {step.label}</span>
                          <span className={`step-status-chip ${status}`}>
                            {status === 'done' ? '✓ Done' : status === 'active' ? '● Running' : '○ Pending'}
                          </span>
                          <button className="step-toggle-btn">
                            {isOpen ? '▲' : '▼'}
                          </button>
                        </div>

                        {/* Step body */}
                        {isOpen && (
                          <div className={`step-body ${status === 'active' ? 'active-step' : status === 'done' ? 'done-step' : ''}`}>
                            {status === 'active' && <div className="step-running-bar" />}

                            {/* STEP 0: Incident Intake */}
                            {idx === 0 && (
                              <div className="intake-grid">
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8 }}>
                                    📧 Source Email / Alert
                                  </div>
                                  <div className="intake-email-preview">
                                    <span className="email-from">From:</span> monitoring-alerts@bank.internal<br />
                                    <span className="email-from">To:</span> {scenario.group_name.toLowerCase()}@bank.internal<br />
                                    <span className="email-from">Subject:</span>{' '}
                                    <span className="email-subj">[{scenario.severity}] {scenario.incident_number} — {scenario.title}</span>
                                    <div className="email-body">
                                      Error detected in <strong>{scenario.affected_service}</strong>.<br />
                                      Trans ID: {scenario.trans_id} · Impact: {scenario.impact}<br />
                                      SNOW Ref: {scenario.snow_number}
                                    </div>
                                  </div>
                                </div>
                                <div className="intake-meta-box">
                                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8 }}>
                                    🎫 Parsed Incident Fields
                                  </div>
                                  {[
                                    { k: 'INC Number', v: scenario.incident_number },
                                    { k: 'Severity',   v: scenario.severity },
                                    { k: 'Service',    v: scenario.affected_service },
                                    { k: 'Alert Type', v: scenario.alert_type },
                                    { k: 'Trans ID',   v: scenario.trans_id },
                                    { k: 'Reporter',   v: scenario.created_by },
                                  ].map(({ k, v }) => (
                                    <div key={k} className="meta-row">
                                      <span className="meta-row-label">{k}</span>
                                      <span className="meta-row-val"><code>{v}</code></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* STEP 1: Historical Memory */}
                            {idx === 1 && (
                              <div className="memory-matches">
                                <div className="memory-match-card">
                                  <div className="memory-score">
                                    <span className={`memory-score-val ${scenario.rag_match.score > 90 ? 'high' : scenario.rag_match.score > 75 ? 'medium' : 'low'}`}>
                                      {scenario.rag_match.score}%
                                    </span>
                                    <span className="memory-score-label">Match</span>
                                  </div>
                                  <div className="memory-match-body">
                                    <div className="memory-match-title">{scenario.rag_match.title}</div>
                                    <div className="memory-match-meta">
                                      <span>🕐 Resolved {scenario.rag_match.resolved}</span>
                                      <span>✅ {scenario.rag_match.resolution}</span>
                                    </div>
                                  </div>
                                  <span className="rag-tag">🧠 RAG</span>
                                </div>

                                {/* Second lower-score match */}
                                <div className="memory-match-card">
                                  <div className="memory-score">
                                    <span className="memory-score-val low">61%</span>
                                    <span className="memory-score-label">Match</span>
                                  </div>
                                  <div className="memory-match-body">
                                    <div className="memory-match-title">INC-2025-1832 — similar service degradation event</div>
                                    <div className="memory-match-meta">
                                      <span>🕐 Resolved 3 months ago</span>
                                      <span>🔁 Rolled back deployment v2.3.1</span>
                                    </div>
                                  </div>
                                  <span className="rag-tag">🧠 RAG</span>
                                </div>
                              </div>
                            )}

                            {/* STEP 2: Telemetry Correlation */}
                            {idx === 2 && (
                              <div>
                                <div className="step-panel-tabs">
                                  {['logs', 'metrics', 'traces'].map(tab => (
                                    <button
                                      key={tab}
                                      className={`panel-tab ${telemetryTab === tab ? 'active' : ''}`}
                                      onClick={e => { e.stopPropagation(); setTelemetryTab(tab); }}
                                    >
                                      {tab === 'logs' ? '📜' : tab === 'metrics' ? '📊' : '🔗'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                  ))}
                                </div>

                                <div className="telemetry-tabs-content">
                                  {telemetryTab === 'logs' && (
                                    <div className="log-viewer">
                                      {scenario.logs.map((l, i) => (
                                        <div key={i} className="log-line">
                                          <span className="log-ln">{i + 1}</span>
                                          <span style={{ color: 'var(--text-4)', fontSize: 10, minWidth: 60, fontFamily: 'var(--font-mono)' }}>{l.ts}</span>
                                          <span className={`log-level ${l.level}`}>{l.level}</span>
                                          <span className={`log-text ${l.highlight ? 'highlight' : ''}`}>{l.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {telemetryTab === 'metrics' && (
                                    <>
                                      <div className="metrics-kpi-grid">
                                        <div className="kpi-card error">
                                          <span className="kpi-label">Error Rate</span>
                                          <span className="kpi-value">{scenario.metrics.error_rate}</span>
                                          <span className="kpi-sub">▲ vs baseline</span>
                                        </div>
                                        <div className="kpi-card warning">
                                          <span className="kpi-label">p99 Latency</span>
                                          <span className="kpi-value">{scenario.metrics.latency_p99}</span>
                                          <span className="kpi-sub">SLA breach</span>
                                        </div>
                                        <div className="kpi-card info">
                                          <span className="kpi-label">Throughput</span>
                                          <span className="kpi-value">{scenario.metrics.throughput}</span>
                                          <span className="kpi-sub">req/s</span>
                                        </div>
                                        <div className="kpi-card purple">
                                          <span className="kpi-label">CPU Usage</span>
                                          <span className="kpi-value">{scenario.metrics.cpu_usage}</span>
                                          <span className="kpi-sub">Fleet saturation</span>
                                        </div>
                                      </div>

                                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}>
                                        Error Rate % — Incident Timeline
                                      </div>
                                      <div className="chart-bars">
                                        {scenario.metrics.timeseries.map((d, i) => (
                                          <div key={i} className="chart-bar-wrap">
                                            <div
                                              className={`chart-bar ${d.e > 10 ? 'critical' : d.e > 1 ? 'warning' : 'normal'}`}
                                              style={{ height: `${Math.max((d.e / chartMax) * 64, 3)}px` }}
                                              title={`${d.e}% error rate`}
                                            />
                                            <span className="chart-label">{d.t}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}

                                  {telemetryTab === 'traces' && (
                                    <div className="trace-rows">
                                      {scenario.traces.map((tr, i) => (
                                        <div key={i} className="trace-row">
                                          <span className="trace-service">{tr.service}</span>
                                          <div className="trace-bar-wrap">
                                            <div
                                              className={`trace-bar ${tr.status}`}
                                              style={{ width: `${tr.pct}%` }}
                                            />
                                          </div>
                                          <span className="trace-duration">{tr.duration}ms</span>
                                          <span className={`trace-status ${tr.status}`}>
                                            {tr.status === 'ok' ? '✓' : tr.status === 'slow' ? '⚠' : '✗'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* STEP 3: Live Topology Map */}
                            {idx === 3 && (
                              <div className="topology-step-body">
                                <div className="topology-canvas">
                                  <div className="topology-grid">
                                    {scenario.topology.map((node, ni) => (
                                      <div key={node.id} className="topo-node-wrap">
                                        <div
                                          className="topo-node"
                                          onClick={e => { e.stopPropagation(); setSelectedNode(selectedNode === node.id ? null : node.id); }}
                                        >
                                          <div className={`topo-node-box ${node.status}`}>
                                            <div className={`topo-status-dot ${node.status}`} />
                                            <span className="topo-node-icon">{node.icon}</span>
                                            <div className="topo-node-name">{node.name}</div>
                                            <div className="topo-node-metric">{node.metric}</div>
                                          </div>
                                          <span style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            {node.status}
                                          </span>
                                        </div>

                                        {ni < scenario.topology.length - 1 && (
                                          <div className="topo-edge">
                                            <div className={`topo-line ${scenario.topology[ni + 1].status === 'failed' ? 'alert' : scenario.topology[ni + 1].status === 'degraded' ? 'warn' : ''}`} />
                                            <span className={`topo-arrow ${scenario.topology[ni + 1].status === 'failed' ? 'alert' : scenario.topology[ni + 1].status === 'degraded' ? 'warn' : ''}`}>▶</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Node detail popup */}
                                  {selectedNode && (() => {
                                    const node = scenario.topology.find(n => n.id === selectedNode);
                                    if (!node || !node.detail) return null;
                                    return (
                                      <div className="node-detail-popup">
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>
                                          {node.icon} {node.name} — Node Detail
                                        </div>
                                        {Object.entries(node.detail).map(([k, v]) => (
                                          <div key={k} className="node-detail-row">
                                            <span className="node-detail-key">{k}</span>
                                            <span className="node-detail-val">{v}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="btn-group mt-2" style={{ justifyContent: 'flex-end' }}>
                                  <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setActiveNav('topology'); }}>
                                    🗺️ Full Topology View
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* STEP 4: Root Cause Analysis */}
                            {idx === 4 && (
                              <div className="rca-step-body">
                                <div className="rca-confidence-bar-wrap">
                                  <div className="rca-confidence-header">
                                    <span className="rca-confidence-label">AI Confidence Score</span>
                                    <span className="rca-confidence-pct">{scenario.confidence}%</span>
                                  </div>
                                  <div className="confidence-bar">
                                    <div className="confidence-fill" style={{ width: `${scenario.confidence}%` }} />
                                  </div>
                                </div>

                                <div className="rca-summary-box">{scenario.summary}</div>

                                <div className="rca-grid">
                                  <div className="rca-panel">
                                    <div className="rca-panel-title">Error Signature</div>
                                    <div className="error-sig-box">{scenario.error_signature}</div>
                                  </div>
                                  <div className="rca-panel">
                                    <div className="rca-panel-title">Historical Match</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 6 }}>
                                      <span className="rag-tag">🧠 {scenario.rag_match.score}% match</span>{' '}
                                      {scenario.rag_match.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                      Resolution: {scenario.rag_match.resolution}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8 }}>
                                  ✅ Recommended Actions
                                </div>
                                <div className="checklist">
                                  {actionList.map(a => (
                                    <label key={a.id} className={`checklist-item ${a.done ? 'checked' : ''}`}>
                                      <input
                                        type="checkbox"
                                        checked={a.done}
                                        onChange={() => toggleAction(a.id)}
                                        onClick={e => e.stopPropagation()}
                                      />
                                      <span>{a.text}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* STEP 5: Code Investigation & Patch */}
                            {idx === 5 && (
                              <div className="patch-step-body">
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8 }}>
                                  📂 UAT vs Production Config Diff
                                </div>

                                <div className="diff-viewer">
                                  <div className="diff-toolbar">
                                    <span className="diff-filename">{scenario.diff.file}</span>
                                    <div className="diff-stats">
                                      <span className="add">+{scenario.diff.stats.add}</span>
                                      <span className="del">−{scenario.diff.stats.del}</span>
                                    </div>
                                  </div>
                                  <div className="diff-lines-body">
                                    {scenario.diff.lines.map((l, i) => (
                                      <div key={i} className={`diff-line ${l.type}`}>
                                        <span className="diff-line-num">{l.n}</span>
                                        <span className="diff-line-code">{l.code}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8 }}>
                                  🕵️ Files to Inspect
                                </div>
                                <div className="files-to-inspect">
                                  {scenario.files.map(f => (
                                    <span key={f} className="file-chip">
                                      📄 {f}
                                    </span>
                                  ))}
                                </div>

                                <div className="btn-group mt-2">
                                  <button className="btn btn-success" onClick={e => e.stopPropagation()}>
                                    ✓ Apply Patch
                                  </button>
                                  <button className="btn btn-ghost" onClick={e => e.stopPropagation()}>
                                    🔍 Review in Repo
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* STEP 6: Ticket & Notifications */}
                            {idx === 6 && (
                              <div className="ticket-step-body">
                                <div className="ticket-preview-card">
                                  <div className="ticket-preview-header">
                                    <span>🔵 Jira Software</span>
                                    <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 11 }}>{scenario.jira_id}</span>
                                  </div>
                                  <div className="ticket-preview-body">
                                    {[
                                      { k: 'Summary',    v: scenario.title },
                                      { k: 'Priority',   v: scenario.severity },
                                      { k: 'Service',    v: <code>{scenario.affected_service}</code> },
                                      { k: 'SNOW Ref',   v: <code>{scenario.snow_number}</code> },
                                      { k: 'Assignee',   v: scenario.group_name },
                                    ].map(({ k, v }) => (
                                      <div key={k} className="ticket-field">
                                        <span className="ticket-field-key">{k}:</span>
                                        <span className="ticket-field-val">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="notification-rows">
                                  <div className="notif-row">
                                    <span className="notif-icon">🔵</span>
                                    <div className="notif-info">
                                      <div className="notif-title">Atlassian Jira — {scenario.jira_id}</div>
                                      <div className="notif-sub">{scenario.affected_service} · {scenario.severity}</div>
                                    </div>
                                    <span className={`notif-status ${jiraCreated ? 'sent' : 'pending'}`}>
                                      {jiraCreated ? '✓ Created' : 'Pending'}
                                    </span>
                                    <button
                                      className="btn btn-jira"
                                      style={{ marginLeft: 8 }}
                                      disabled={jiraCreated}
                                      onClick={e => { e.stopPropagation(); handleCreateJira(); }}
                                    >
                                      {jiraCreated ? '✓ Done' : 'Create'}
                                    </button>
                                  </div>

                                  <div className="notif-row">
                                    <span className="notif-icon">💬</span>
                                    <div className="notif-info">
                                      <div className="notif-title">Slack — {slackChannel}</div>
                                      <div className="notif-sub">P1 alert broadcast to SRE team</div>
                                    </div>
                                    <span className={`notif-status ${slackSent ? 'sent' : 'pending'}`}>
                                      {slackSent ? '✓ Sent' : 'Pending'}
                                    </span>
                                    <button
                                      className="btn btn-slack"
                                      style={{ marginLeft: 8 }}
                                      disabled={slackSent}
                                      onClick={e => { e.stopPropagation(); handleSendSlack(); }}
                                    >
                                      {slackSent ? '✓ Sent' : 'Send'}
                                    </button>
                                  </div>

                                  <div className="notif-row">
                                    <span className="notif-icon">📧</span>
                                    <div className="notif-info">
                                      <div className="notif-title">Email — {scenario.group_name}</div>
                                      <div className="notif-sub">RCA report + patch attachment</div>
                                    </div>
                                    <span className="notif-status sent">✓ Sent</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* STEP 7: Incident Memory */}
                            {idx === 7 && (
                              <div className="memory-step-body">
                                <div className="memory-store-grid">
                                  {[
                                    { icon: '📁', name: 'Total Incidents', sub: 'Stored in PostgreSQL', val: scenario.memory.incidents.toLocaleString() },
                                    { icon: '🧠', name: 'Embeddings', sub: 'pgvector dimensions', val: scenario.memory.embeddings },
                                    { icon: '🔧', name: 'Patches Applied', sub: 'Code fix history', val: scenario.memory.patches },
                                    { icon: '📝', name: 'Postmortems', sub: 'Learning documents', val: scenario.memory.postmortems },
                                    { icon: '🎯', name: 'RCA Confidence', sub: 'This incident', val: `${scenario.confidence}%` },
                                    { icon: '⚡', name: 'Resolution', sub: 'Predicted MTTR', val: '<15 min' },
                                  ].map(card => (
                                    <div key={card.name} className="memory-store-card">
                                      <div className="memory-store-icon">{card.icon}</div>
                                      <div className="memory-store-name">{card.name}</div>
                                      <div className="memory-store-sub">{card.sub}</div>
                                      <div className="memory-store-val">{card.val}</div>
                                    </div>
                                  ))}
                                </div>

                                <div className="rca-summary-box" style={{ fontSize: 12 }}>
                                  ✅ Investigation complete for <strong>{scenario.incident_number}</strong>.
                                  Root cause, patch diff, RAG embeddings, and postmortem have been written to Incident Memory.
                                  Future incidents on <code>{scenario.affected_service}</code> will benefit from this analysis.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: ROOT CAUSE ANALYSIS (standalone)
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'rca' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>💡 Root Cause Analysis — {scenario.incident_number}</h2>
                <p>{scenario.title} · Confidence: {scenario.confidence}%</p>
              </div>

              <div className="view-card">
                <div className="rca-confidence-bar-wrap">
                  <div className="rca-confidence-header">
                    <span className="rca-confidence-label">AI Confidence Score — {llmModel}</span>
                    <span className="rca-confidence-pct">{scenario.confidence}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${scenario.confidence}%` }} />
                  </div>
                </div>

                <div className="rca-summary-box">{scenario.summary}</div>

                <div className="rca-grid">
                  <div className="rca-panel">
                    <div className="rca-panel-title">Error Signature</div>
                    <div className="error-sig-box">{scenario.error_signature}</div>
                  </div>
                  <div className="rca-panel">
                    <div className="rca-panel-title">Impacted Subsystem</div>
                    <div className="meta-row" style={{ flexDirection: 'column', gap: 6 }}>
                      {[['Service', scenario.affected_service], ['SNOW Group', scenario.group_name], ['Repository', scenario.repo_name]].map(([k, v]) => (
                        <div key={k} className="meta-row">
                          <span className="meta-row-label">{k}</span>
                          <span className="meta-row-val"><code>{v}</code></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', margin: '16px 0 8px' }}>
                  Historical RAG Match
                </div>
                <div className="memory-match-card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', gap: 14 }}>
                  <div className="memory-score">
                    <span className={`memory-score-val ${scenario.rag_match.score > 90 ? 'high' : 'medium'}`}>{scenario.rag_match.score}%</span>
                    <span className="memory-score-label">Match</span>
                  </div>
                  <div className="memory-match-body">
                    <div className="memory-match-title">{scenario.rag_match.title}</div>
                    <div className="memory-match-meta">
                      <span>✅ {scenario.rag_match.resolution}</span>
                      <span>🕐 {scenario.rag_match.resolved}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', margin: '16px 0 8px' }}>
                  Mitigation Checklist
                </div>
                <div className="checklist">
                  {actionList.map(a => (
                    <label key={a.id} className={`checklist-item ${a.done ? 'checked' : ''}`}>
                      <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} />
                      <span>{a.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: TOPOLOGY MAP (standalone)
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'topology' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>🗺️ Live Service Dependency Map</h2>
                <p>Animated microservice topology for {scenario.affected_service} — click nodes for detail</p>
              </div>

              <div className="view-card">
                <div className="topology-canvas" style={{ minHeight: 180 }}>
                  <div className="topology-grid">
                    {scenario.topology.map((node, ni) => (
                      <div key={node.id} className="topo-node-wrap">
                        <div
                          className="topo-node"
                          onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                        >
                          <div className={`topo-node-box ${node.status}`}>
                            <div className={`topo-status-dot ${node.status}`} />
                            <span className="topo-node-icon" style={{ fontSize: 28 }}>{node.icon}</span>
                            <div className="topo-node-name">{node.name}</div>
                            <div className="topo-node-metric">{node.metric}</div>
                          </div>
                          <span style={{ fontSize: 10, color: node.status === 'failed' ? 'var(--red)' : node.status === 'degraded' ? 'var(--amber)' : 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                            {node.status}
                          </span>
                        </div>
                        {ni < scenario.topology.length - 1 && (
                          <div className="topo-edge">
                            <div className={`topo-line ${scenario.topology[ni + 1].status === 'failed' ? 'alert' : scenario.topology[ni + 1].status === 'degraded' ? 'warn' : ''}`} style={{ width: 60 }} />
                            <span className={`topo-arrow ${scenario.topology[ni + 1].status === 'failed' ? 'alert' : scenario.topology[ni + 1].status === 'degraded' ? 'warn' : ''}`}>▶</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedNode && (() => {
                    const node = scenario.topology.find(n => n.id === selectedNode);
                    if (!node || !node.detail) return null;
                    return (
                      <div className="node-detail-popup">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{node.icon} {node.name}</span>
                          <button className="modal-close-btn" onClick={() => setSelectedNode(null)}>✕</button>
                        </div>
                        {Object.entries(node.detail).map(([k, v]) => (
                          <div key={k} className="node-detail-row">
                            <span className="node-detail-key">{k}</span>
                            <span className="node-detail-val">{v}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: LOGS
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'logs' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>📜 Service Telemetry Logs — {scenario.affected_service}</h2>
                <p>Real-time log stream filtered for incident {scenario.incident_number}</p>
              </div>

              <div className="logs-toolbar">
                <input
                  className="toolbar-input"
                  placeholder="Search logs (ERROR, Exception, 504...)"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                />
                <select className="toolbar-select" value={logFilter} onChange={e => setLogFilter(e.target.value)}>
                  <option value="ALL">All Levels</option>
                  <option value="ERROR">ERROR / FATAL</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              <div className="full-log-viewer">
                {filteredLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-4)', padding: '20px 0', textAlign: 'center' }}>No logs match the filter.</div>
                ) : filteredLogs.map((l, i) => (
                  <div key={i} className="log-line">
                    <span className="log-ln">{i + 1}</span>
                    <span style={{ color: 'var(--text-4)', fontSize: 10, minWidth: 60, fontFamily: 'var(--font-mono)' }}>{l.ts}</span>
                    <span className={`log-level ${l.level}`}>{l.level}</span>
                    <span className={`log-text ${l.highlight ? 'highlight' : ''}`}>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: METRICS
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'metrics' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>📊 Telemetry Metrics — {scenario.affected_service}</h2>
                <p>Infrastructure health during incident window for {scenario.incident_number}</p>
              </div>

              <div className="metrics-kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card error">
                  <span className="kpi-label">Error Rate</span>
                  <span className="kpi-value">{scenario.metrics.error_rate}</span>
                  <span className="kpi-sub">▲ +12.4% vs baseline</span>
                </div>
                <div className="kpi-card warning">
                  <span className="kpi-label">p99 Latency</span>
                  <span className="kpi-value">{scenario.metrics.latency_p99}</span>
                  <span className="kpi-sub">SLA breach (&gt; 500ms)</span>
                </div>
                <div className="kpi-card info">
                  <span className="kpi-label">Throughput</span>
                  <span className="kpi-value">{scenario.metrics.throughput}</span>
                  <span className="kpi-sub">Active traffic load</span>
                </div>
                <div className="kpi-card purple">
                  <span className="kpi-label">CPU Usage</span>
                  <span className="kpi-value">{scenario.metrics.cpu_usage}</span>
                  <span className="kpi-sub">Fleet saturation</span>
                </div>
              </div>

              <div className="view-card">
                <h3>Incident Time-Series (Error Rate % vs Latency ms)</h3>
                <div className="metrics-table-wrap">
                  <table className="metrics-table">
                    <thead>
                      <tr>
                        <th>Time Window</th>
                        <th>Error Rate</th>
                        <th>Latency p99</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenario.metrics.timeseries.map((row, i) => (
                        <tr key={i}>
                          <td><code>{row.t}</code></td>
                          <td style={{ color: row.e > 5 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{row.e}%</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{row.l} ms</td>
                          <td>
                            {row.e > 10 ? <span className="badge red">CRITICAL SPIKE</span>
                              : row.e > 1 ? <span className="badge amber">ELEVATED</span>
                              : <span className="badge green">NORMAL</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: INTEGRATIONS
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'integration' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>⚙️ ITSM & Enterprise Integrations</h2>
                <p>Connect and manage ServiceNow, Jira, Slack, and monitoring systems</p>
              </div>

              <div className="integration-grid">
                {[
                  { icon: '📋', name: 'ServiceNow', desc: 'Sync client-raised ITSM tickets directly from ServiceNow portal REST API.', connected: true,
                    action: () => setShowSnow(true), label: '📥 Ingest Ticket' },
                  { icon: '🔵', name: 'Atlassian Jira', desc: 'Auto-create engineering tickets with RCA diagnostics and stack traces.', connected: true,
                    action: handleCreateJira, label: jiraCreated ? `✓ ${scenario.jira_id} Created` : `Create ${scenario.jira_id}`, done: jiraCreated },
                  { icon: '💬', name: 'Slack', desc: 'Broadcast critical alerts and AI root-cause summaries to incident channels.', connected: true,
                    action: handleSendSlack, label: slackSent ? '✓ Alert Sent' : 'Send Alert', done: slackSent },
                  { icon: '📊', name: 'New Relic', desc: 'Stream APM metrics, distributed traces, and alert notifications.', connected: true,
                    action: () => {}, label: 'View Dashboard' },
                  { icon: '🔥', name: 'PagerDuty', desc: 'Auto-escalate P1 incidents to on-call engineers with full context.', connected: false,
                    action: () => {}, label: 'Connect' },
                  { icon: '📡', name: 'Prometheus', desc: 'Ingest Prometheus metrics and Alertmanager webhook notifications.', connected: false,
                    action: () => {}, label: 'Configure' },
                ].map(card => (
                  <div key={card.name} className="integration-card">
                    <div className="integration-icon">{card.icon}</div>
                    <div className="integration-name">{card.name}</div>
                    <div className="integration-desc">{card.desc}</div>
                    <div className={`integration-status ${card.connected ? 'connected' : 'disconnected'}`}>
                      <span className="sdot" />
                      {card.connected ? 'Connected' : 'Not configured'}
                    </div>
                    <button
                      className={`btn ${card.connected ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={card.action}
                      disabled={card.done}
                    >
                      {card.label}
                    </button>
                  </div>
                ))}
              </div>

              {jiraTickets.length > 0 && (
                <div className="view-card" style={{ marginTop: 20 }}>
                  <h3>Recently Created Jira Tickets</h3>
                  <div className="notification-rows">
                    {jiraTickets.map((t, i) => (
                      <div key={i} className="notif-row">
                        <span className="notif-icon">🔵</span>
                        <div className="notif-info">
                          <div className="notif-title">{t.id} — {t.summary}</div>
                          <div className="notif-sub">{t.severity} · Created {t.time}</div>
                        </div>
                        <span className="notif-status sent">✓ Open</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: MANUAL INVESTIGATION SEARCH
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'manual' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>🔎 Proactive Manual Investigation</h2>
                <p>Search stack traces, logs, transaction IDs, or symptoms without an active incident</p>
              </div>

              <div className="view-card" style={{ marginBottom: 24 }}>
                <form onSubmit={handleManualSearch}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 13, marginBottom: 8 }}>Describe the anomaly or paste a stack trace</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="e.g., Why did we see a spike in ConsumerGroupRebalanceError in the fraud-stream-prod cluster around 14:00?"
                      value={manualQuery}
                      onChange={e => setManualQuery(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-grid" style={{ alignItems: 'flex-end', marginTop: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Lookback Window</label>
                      <select className="form-select" value={manualTime} onChange={e => setManualTime(e.target.value)}>
                        <option value="15m">Last 15 minutes</option>
                        <option value="60m">Last 60 minutes</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={manualSearching || !manualQuery.trim()}>
                      {manualSearching ? 'Investigating...' : '🔎 Run AI Investigation'}
                    </button>
                  </div>
                </form>
              </div>

              {manualSearching && (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <div style={{ marginTop: 16, color: 'var(--text-3)' }}>Sentinel AI is correlating logs, metrics, and incident memory...</div>
                </div>
              )}

              {manualResults && (
                <div className="manual-results">
                  <div className="page-title-row" style={{ marginBottom: 16 }}>
                    <div className="page-title">Session: <code>{manualResults.session_id}</code></div>
                    <div className="badge blue">Observation Stored</div>
                  </div>

                  <div className="rca-summary-box" style={{ marginBottom: 20 }}>
                    {manualResults.hypothesis}
                  </div>

                  <div className="rca-grid">
                    <div className="rca-panel">
                      <div className="rca-panel-title">🧠 Top Historical Match (RAG)</div>
                      <div className="memory-match-card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-dim)' }}>
                        <div className="memory-score">
                          <span className="memory-score-val high">{manualResults.rag_matches[0].score}%</span>
                        </div>
                        <div className="memory-match-body">
                          <div className="memory-match-title">{manualResults.rag_matches[0].title}</div>
                          <div className="memory-match-meta">
                            <span>✅ {manualResults.rag_matches[0].resolution}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rca-panel">
                      <div className="rca-panel-title">📊 Telemetry Anomalies Found</div>
                      <div className="meta-row">
                        <span className="meta-row-label">Suspected Service:</span>
                        <span className="meta-row-val"><code>{manualResults.matched_service}</code></span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-row-label">Log Occurrences:</span>
                        <span className="meta-row-val" style={{ color: 'var(--red)' }}>{manualResults.logs_found} ERROR lines</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-row-label">Metric Deviation:</span>
                        <span className="meta-row-val" style={{ color: 'var(--amber)' }}>{manualResults.metrics_anomaly}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="btn-group" style={{ marginTop: 20 }}>
                    <button className="btn btn-jira">Promote to P1 Incident</button>
                    <button className="btn btn-ghost">Discard Session</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: INCIDENT MEMORY
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'memory' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>🧠 Incident Memory Database</h2>
                <p>PostgreSQL + pgvector — organizational knowledge base spanning 6+ months</p>
              </div>

              <div className="memory-store-grid" style={{ marginBottom: 20 }}>
                {[
                  { icon: '📁', name: 'Total Incidents', sub: 'PostgreSQL rows', val: '1,842' },
                  { icon: '🧠', name: 'Vector Embeddings', sub: 'pgvector dimensions', val: '98,412' },
                  { icon: '🔧', name: 'Code Patches', sub: 'Applied & stored', val: '214' },
                  { icon: '📝', name: 'Postmortems', sub: 'Learning documents', val: '88' },
                  { icon: '📅', name: 'Date Range', sub: 'Historical coverage', val: '6 months' },
                  { icon: '⚡', name: 'Avg MTTR', sub: 'With AI assist', val: '14 min' },
                ].map(card => (
                  <div key={card.name} className="memory-store-card">
                    <div className="memory-store-icon">{card.icon}</div>
                    <div className="memory-store-name">{card.name}</div>
                    <div className="memory-store-sub">{card.sub}</div>
                    <div className="memory-store-val">{card.val}</div>
                  </div>
                ))}
              </div>

              <div className="view-card">
                <h3>Schema Overview — Incident Memory Tables</h3>
                <div className="metrics-table-wrap">
                  <table className="metrics-table">
                    <thead>
                      <tr><th>Table</th><th>Purpose</th><th>Records</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ['incidents',      'Core incident records + status',       '1,842'],
                        ['incident_events','Timeline events per incident',          '22,104'],
                        ['observations',   'AI-generated observations',             '9,312'],
                        ['telemetry_logs', 'Log samples indexed per incident',      '186,421'],
                        ['metrics',        'Time-series metric snapshots',          '54,088'],
                        ['traces',         'OpenTelemetry span data',               '33,610'],
                        ['config_diffs',   'UAT vs Prod configuration diffs',       '1,204'],
                        ['deployments',    'Deployment history + commit SHAs',      '4,882'],
                        ['code_patches',   'Generated & applied patches',           '214'],
                        ['embeddings',     'pgvector similarity embeddings',        '98,412'],
                        ['postmortems',    'Postmortem reports (markdown)',         '88'],
                        ['tickets',        'Jira/ServiceNow ticket references',    '3,109'],
                      ].map(([table, purpose, records]) => (
                        <tr key={table}>
                          <td><code style={{ color: 'var(--purple)' }}>{table}</code></td>
                          <td style={{ color: 'var(--text-2)' }}>{purpose}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{records}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: SETTINGS
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'settings' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>🔧 System Configuration</h2>
                <p>Manage API keys, LLM parameters, and notification channels</p>
              </div>

              <div className="view-card">
                <form className="settings-form" onSubmit={handleSaveSettings}>
                  {saveMsgVisible && <div className="save-msg">✓ Configuration saved successfully</div>}

                  <div className="form-group">
                    <label className="form-label">Gemini API Key</label>
                    <input type="password" className="form-input" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Configured via backend <code>.env</code> (GOOGLE_API_KEY)</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default LLM Model</label>
                    <select className="form-select" value={llmModel} onChange={e => setLlmModel(e.target.value)}>
                      <option>Gemini 2.0 Flash</option>
                      <option>Gemini 1.5 Pro</option>
                      <option>Gemini 1.5 Flash</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Slack Notification Channel</label>
                    <input type="text" className="form-input" value={slackChannel} onChange={e => setSlackChannel(e.target.value)} />
                  </div>

                  <div className="toggle-row" style={{ paddingTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Automated Triage Ingestion</span>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={autoTriage} onChange={e => setAutoTriage(e.target.checked)} />
                      <span className="toggle-track" />
                    </label>
                  </div>

                  <div>
                    <button type="submit" className="btn btn-primary">Save Configuration</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* ────────────────────────────────────────────────────────────────
              VIEW: AI IMPACT
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'impact' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>📈 Executive AI Value Dashboard</h2>
                <p>Track KPIs, engineering hours saved, and proactive value delivery</p>
              </div>
              <div className="view-card">
                <div className="metrics-kpi-grid" style={{ marginBottom: '24px' }}>
                  <div className="kpi-card info">
                    <span className="kpi-label">MTTR Reduction</span>
                    <span className="kpi-value">68%</span>
                    <span className="kpi-sub">Across P1/P2 incidents</span>
                  </div>
                  <div className="kpi-card warning">
                    <span className="kpi-label">Eng. Hours Saved</span>
                    <span className="kpi-value">1,240</span>
                    <span className="kpi-sub">Last 30 Days</span>
                  </div>
                  <div className="kpi-card purple">
                    <span className="kpi-label">AI Accuracy</span>
                    <span className="kpi-value">94.2%</span>
                    <span className="kpi-sub">Resolution confidence</span>
                  </div>
                  <div className="kpi-card info">
                    <span className="kpi-label">Incidents Prevented</span>
                    <span className="kpi-value">34</span>
                    <span className="kpi-sub">Proactive manual search</span>
                  </div>
                </div>

                <div className="rca-grid">
                  <div className="rca-panel">
                    <div className="rca-panel-title">Knowledge Base Growth</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      Total incidents learned: <strong>2,491</strong> <br/>
                      Total patches generated: <strong>812</strong> <br/>
                      Vector embeddings size: <strong>14.2M</strong>
                    </div>
                  </div>
                  <div className="rca-panel">
                    <div className="rca-panel-title">Estimated Cost Saved</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)', margin: '8px 0' }}>
                      $248,500
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Based on avg downtime cost of $1,000/min and median MTTR reduction of 35 minutes.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              VIEW: ABOUT
          ──────────────────────────────────────────────────────────────── */}
          {activeNav === 'about' && (
            <div className="view-screen">
              <div className="view-header">
                <h2>ℹ️ About Sentinel AI</h2>
                <p>Architecture, capabilities, and system specifications</p>
              </div>
              <div className="view-card" style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-1)' }}>System Architecture</h3>
                <p style={{ marginBottom: '16px', color: 'var(--text-2)' }}>
                  Sentinel AI is built on a decoupled FastAPI backend and React frontend. It leverages <strong>Retrieval-Augmented Generation (RAG)</strong> to cross-reference real-time alert telemetry against a historical vector database of incidents, logs, and Git commits. 
                </p>
                <h3 style={{ marginTop: '24px', marginBottom: '12px', color: 'var(--text-1)' }}>Core Capabilities</h3>
                <ul style={{ paddingLeft: '20px', marginBottom: '16px', color: 'var(--text-2)' }}>
                  <li><strong>Semantic Search:</strong> In-memory FAISS indexing for hyper-fast past incident retrieval.</li>
                  <li><strong>Generative AI Analysis:</strong> Powered by Gemini 2.0 to synthesize root causes and generate precise code patches.</li>
                  <li><strong>Live Telemetry Correlation:</strong> Aggregates metrics, distributed traces, and log streams to pinpoint anomalies.</li>
                  <li><strong>Automated Action Dispatch:</strong> Directly integrates with Jira, Slack, and Microsoft Outlook.</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
