"""
Stage 1 — Synthetic Incident Dataset Generator
================================================
Generates 80 synthetic incidents shaped like ServiceNow records, covering
three scenario families:
  A) TLS / certificate issues        (~27 records)
  B) MQ / message-broker outages     (~27 records)
  C) Library / dependency mismatches (~26 records)

Run:
    python data/generate_incidents.py
Output:
    data/incidents.json
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

# ── helpers ───────────────────────────────────────────────────────────────────

def rand_date(days_back: int = 730) -> str:
    """Random ISO date within the last `days_back` days."""
    delta = timedelta(days=random.randint(0, days_back))
    return (datetime.utcnow() - delta).strftime("%Y-%m-%dT%H:%M:%SZ")


RESOLVERS = [
    "Alice Thornton", "Ben Okafor", "Chen Wei", "Diana Morales",
    "Ethan Patel", "Farida Yilmaz", "George Kim", "Hannah Björk",
    "Ivan Novak", "Julia Santos",
]


# ── Scenario A: TLS / Certificate Issues ─────────────────────────────────────

CERT_SERVICES = [
    "payments-gateway", "auth-service", "card-processing",
    "fraud-detection", "customer-api", "mobile-banking-backend",
]

CERT_DESCRIPTIONS = [
    "The {svc} service started throwing SSL handshake failures shortly after "
    "midnight. Certificate for internal CA expired at 00:05 UTC and was not "
    "auto-renewed because the ACME client lost connectivity to the CA server "
    "during a routine network maintenance window.",

    "Engineers observed a spike in 'certificate verify failed' errors from "
    "{svc}. Investigation revealed the wildcard cert covering *.internal.bank "
    "had reached its 398-day browser limit; the cert rotation job had silently "
    "failed two weeks earlier due to a missing Vault token.",

    "Mutual TLS authentication between {svc} and the downstream {dep} service "
    "broke after a Kubernetes secret rotation. The new cert was issued by a "
    "different intermediate CA not present in the client trust store.",

    "Post-deployment smoke tests for {svc} reported HTTP 526 ('invalid SSL "
    "certificate'). Root cause: the deployment pipeline overwrote the prod "
    "cert with a staging cert during an environment-copy step.",

    "{svc} health-check endpoint returned 503 with 'peer certificate: "
    "No certificate signed by known CA'. A new firewall appliance inline "
    "inspection had broken TLS by presenting its own self-signed cert to "
    "backend services.",

    "Monitoring alerted on elevated TLS error rates for {svc}. The cert had "
    "been renewed correctly but the new cert chain included a cross-signed root "
    "removed from Mozilla NSS in a recent update; Java's cacerts bundle on "
    "prod had not been refreshed.",

    "Transaction failures on {svc} traced to an expired client certificate "
    "used by the service account calling the HSM API. The HSM rejected all "
    "signing requests, causing payment authorisation to time out.",

    "Gradual increase in TLS negotiation latency on {svc} over 48 hours. "
    "Caused by a cipher-suite mismatch after a load balancer firmware upgrade "
    "disabled TLS 1.2 fallback; some legacy clients couldn't complete the "
    "TLS 1.3 handshake.",

    "{svc} began rejecting inbound connections from the batch settlement "
    "service. Client cert presented by the batch job expired; the automated "
    "renewal had been disabled by a config drift during last quarter's "
    "infrastructure-as-code migration.",
]

CERT_ERROR_SIGNATURES = [
    "javax.net.ssl.SSLHandshakeException: certificate has expired",
    "ssl.SSLCertVerificationError: [SSL: CERTIFICATE_VERIFY_FAILED]",
    "x509: certificate signed by unknown authority",
    "PKIX path building failed: unable to find valid certification path",
    "SSL_ERROR_RX_RECORD_TOO_LONG",
    "ERR_CERT_AUTHORITY_INVALID",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "TLS handshake timeout after 30000ms",
    "javax.net.ssl.SSLPeerUnverifiedException: peer not authenticated",
]

CERT_RESOLUTIONS = [
    "Renewed the internal CA cert via ACME; restarted the affected service pods. "
    "Added cert-expiry Prometheus alert with 30-day warning threshold.",

    "Re-issued wildcard cert and repaired the Vault token rotation job. "
    "Deployed cert-manager CRD to automate future renewals.",

    "Added the new intermediate CA to the client trust store; rolled out "
    "updated ConfigMap to all affected namespaces. Documented trust-store "
    "update as a mandatory step in the cert-rotation runbook.",

    "Corrected the deployment pipeline's environment-copy step to skip secret "
    "overwrite. Promoted the correct prod cert from the secrets manager.",

    "Configured the firewall appliance in transparent mode for internal "
    "east-west traffic. Whitelisted the internal CA on the appliance policy.",

    "Updated Java cacerts bundle on all prod nodes; scripted the bundle refresh "
    "into the OS image pipeline so future kernel/JDK patches include it.",

    "Renewed the HSM client certificate via PKI portal; updated the Kubernetes "
    "secret and triggered a rolling restart.",

    "Restored TLS 1.2 on the load balancer for the interim; scheduled cipher "
    "suite migration project to upgrade legacy clients.",

    "Re-enabled cert renewal automation in Terraform; triggered an immediate "
    "renewal cycle; updated drift-detection policy to flag disabled renewal.",
]

CERT_ROOT_CAUSES = [
    "Expired internal CA certificate; ACME renewal failure during maintenance window.",
    "Wildcard cert hit 398-day limit; silent Vault token failure blocked renewal.",
    "Kubernetes secret rotation introduced new intermediate CA not in client trust store.",
    "Deployment pipeline overwrote prod cert with staging cert.",
    "Firewall inline TLS inspection presented self-signed cert to backends.",
    "Java cacerts bundle not updated after Mozilla NSS root removal.",
    "Expired HSM client certificate caused all signing requests to be rejected.",
    "Load balancer firmware upgrade disabled TLS 1.2, breaking legacy clients.",
    "Cert renewal automation disabled by infrastructure-as-code config drift.",
]


def build_cert_incidents(count: int) -> list[dict]:
    incidents = []
    for i in range(count):
        svc = random.choice(CERT_SERVICES)
        dep = random.choice([s for s in CERT_SERVICES if s != svc])
        idx = i % len(CERT_DESCRIPTIONS)
        desc = CERT_DESCRIPTIONS[idx].format(svc=svc, dep=dep)
        incidents.append({
            "incident_id": f"INC-CERT-{1000 + i}",
            "description": desc,
            "error_signature": CERT_ERROR_SIGNATURES[idx % len(CERT_ERROR_SIGNATURES)],
            "affected_service": svc,
            "root_cause": CERT_ROOT_CAUSES[idx % len(CERT_ROOT_CAUSES)],
            "resolution": CERT_RESOLUTIONS[idx % len(CERT_RESOLUTIONS)],
            "resolved_by": random.choice(RESOLVERS),
            "date": rand_date(),
            "manual_triage_minutes": random.randint(30, 90),
            "family": "tls_cert",
        })
    return incidents


# ── Scenario B: MQ / Message-Broker Outages ──────────────────────────────────

MQ_SERVICES = [
    "payment-processor", "trade-settlement", "notification-dispatcher",
    "audit-log-consumer", "fraud-event-stream", "interbank-connector",
]

MQ_DESCRIPTIONS = [
    "{svc} stopped consuming messages from the {broker} queue. The broker "
    "had run out of disk space after a dead-letter queue grew unbounded "
    "following an upstream schema change that made all messages unparseable.",

    "Message lag on the {svc} Kafka topic reached 4 million events. A "
    "misconfigured consumer group caused two consumer pods to rebalance "
    "in an infinite loop, never committing offsets.",

    "RabbitMQ cluster lost quorum after two of three nodes failed during "
    "a simultaneous patch window. {svc} could not connect to the broker "
    "and began buffering messages locally until disk was exhausted.",

    "{svc} experienced a complete message processing halt. A poison-pill "
    "message with a malformed timestamp caused the deserialisation layer "
    "to throw and the consumer to exit without re-queuing.",

    "Interbroker replication between {broker} partitions stalled after a "
    "network partition in the DR data centre. {svc} consumers were "
    "directed to the isolated partition and received stale data.",

    "High CPU on the {broker} broker cluster caused throughput to drop "
    "95 percent. Root cause: a compaction job and a schema-registry sync "
    "both ran concurrently during peak hours due to misconfigured cron.",

    "{svc} publish latency spiked from 5 ms to 45 s. The broker's JVM "
    "heap was exhausted because a large batch publish from the reporting "
    "service was not rate-limited and created GC pressure.",

    "Consumer offset reset for {svc} topic was accidentally triggered in "
    "production by a script intended for the staging environment, causing "
    "the consumer to replay 48 hours of messages and overwhelm downstream.",

    "Connection pool to {broker} on {svc} was exhausted after a "
    "connection leak introduced in version 2.4.1 of the internal MQ "
    "client library. Connections were not returned after transient errors.",
]

MQ_BROKERS = ["RabbitMQ", "Kafka", "IBM MQ", "ActiveMQ"]

MQ_ERROR_SIGNATURES = [
    "org.apache.kafka.clients.consumer.CommitFailedException: Offset commit failed",
    "com.rabbitmq.client.AlreadyClosedException: channel is already closed",
    "AMQP_CONNECTION_REFUSED: broker unavailable",
    "KafkaException: Topic partition leader not available",
    "javax.jms.JMSException: MQJMS2005: failed to create MQQueueManager",
    "ConsumerGroupRebalanceError: maximum poll interval exceeded",
    "BrokerNotAvailableException: The server disconnected before a response was received",
    "OffsetOutOfRangeError: offset out of range for topic partition",
    "ConnectionPoolTimeoutError: no available connections in pool",
]

MQ_ROOT_CAUSES = [
    "Dead-letter queue grew unbounded after schema change; broker disk exhausted.",
    "Misconfigured consumer group caused infinite rebalance loop.",
    "RabbitMQ lost quorum after simultaneous patch of two nodes.",
    "Poison-pill message crashed consumer without re-queue handling.",
    "Network partition isolated DR broker partition; consumers received stale data.",
    "Compaction + schema-registry jobs ran concurrently causing CPU saturation.",
    "Unthrottled batch publish exhausted broker JVM heap, triggering GC storm.",
    "Staging offset-reset script accidentally executed against production topic.",
    "Connection leak in MQ client library v2.4.1 exhausted broker connection pool.",
]

MQ_RESOLUTIONS = [
    "Purged dead-letter queue; added DLQ depth alert and schema-validation step.",
    "Fixed consumer group config; added liveness probe to kill stalled consumers.",
    "Restored RabbitMQ quorum by staggering node patches; implemented rolling-patch policy.",
    "Added poison-pill handler: log and move to DLQ rather than crashing consumer.",
    "Updated routing rules to avoid isolated partition; scheduled DR network fix.",
    "Separated compaction and schema-sync cron jobs; added CPU-based backoff.",
    "Added publish rate limiter to reporting service; increased broker heap to 32 GB.",
    "Rolled back the offset; added environment guard to reset script.",
    "Upgraded MQ client library to v2.4.2 with connection-leak fix; added pool monitoring.",
]


def build_mq_incidents(count: int) -> list[dict]:
    incidents = []
    for i in range(count):
        svc = random.choice(MQ_SERVICES)
        broker = random.choice(MQ_BROKERS)
        idx = i % len(MQ_DESCRIPTIONS)
        desc = MQ_DESCRIPTIONS[idx].format(svc=svc, broker=broker)
        incidents.append({
            "incident_id": f"INC-MQ-{2000 + i}",
            "description": desc,
            "error_signature": MQ_ERROR_SIGNATURES[idx % len(MQ_ERROR_SIGNATURES)],
            "affected_service": svc,
            "root_cause": MQ_ROOT_CAUSES[idx % len(MQ_ROOT_CAUSES)],
            "resolution": MQ_RESOLUTIONS[idx % len(MQ_RESOLUTIONS)],
            "resolved_by": random.choice(RESOLVERS),
            "date": rand_date(),
            "manual_triage_minutes": random.randint(25, 120),
            "family": "mq_broker",
        })
    return incidents


# ── Scenario C: Library / Dependency Version Mismatches ──────────────────────

LIB_SERVICES = [
    "loan-origination", "kyc-service", "reporting-engine",
    "batch-reconciliation", "api-gateway", "risk-scoring",
]

LIB_DESCRIPTIONS = [
    "{svc} passed all UAT tests but failed immediately after prod deployment. "
    "Investigation revealed that the prod environment still ran jackson-databind "
    "2.13.x while the new build required 2.15.x for a security patch; "
    "UAT had the newer version installed.",

    "NullPointerException storm on {svc} after promotion to production. "
    "A transitive dependency pulled in Guava 32 which changed the behaviour "
    "of ImmutableList.copyOf when given a null-containing collection; "
    "the UAT environment's pinned version (31) did not exhibit this.",

    "{svc} reported 'NoSuchMethodError' in prod. The commons-lang3 library "
    "was upgraded from 3.11 to 3.14 in the shared platform layer, "
    "but the {svc} JAR still referenced the old method signature "
    "because it was compiled against 3.11 and the fat-JAR was stale.",

    "Production rollout of {svc} triggered ClassCastException deep in the "
    "HTTP client stack. The application server's provided Netty version "
    "(4.1.86) conflicted with the version bundled in the service JAR "
    "(4.1.100); class loading order differed between UAT and prod app servers.",

    "Batch job in {svc} aborted with 'IncompatibleClassChangeError'. "
    "A Lombok annotation processor version bump (1.18.26 → 1.18.30) "
    "generated code incompatible with the Kotlin version used in the "
    "same Maven module; UAT was on a different Kotlin version.",

    "{svc} failed health checks after deployment. OpenAPI spec validation "
    "library springdoc-openapi was upgraded, and the new version required "
    "Spring Boot 3.x; the service still ran Spring Boot 2.7.x in prod, "
    "whereas UAT had already been migrated.",

    "Silent data corruption in {svc} outputs traced to a Protobuf version "
    "mismatch: the producer compiled schemas with protoc 3.21 but the "
    "consumer still used protoc 3.19; a field added in the new schema "
    "was silently dropped by the old deserialiser.",

    "Stack overflow errors on {svc} startup after a Hibernate upgrade "
    "from 5.6 to 6.1 in the shared ORM layer. The new version changed "
    "proxy class generation; a circular @ManyToMany mapping caused "
    "infinite recursion only with the Hibernate 6 proxy strategy.",

    "{svc} integration tests passed in UAT but prod threw "
    "UnsatisfiedDependencyException on boot. A Spring Security version "
    "upgrade changed the bean wiring order; a conditional bean that existed "
    "in UAT (feature flag enabled) was absent in prod, breaking the dependency graph.",
]

LIB_ERROR_SIGNATURES = [
    "com.fasterxml.jackson.databind.JsonMappingException: Incompatible version",
    "java.lang.NullPointerException: ImmutableList.copyOf does not accept null elements",
    "java.lang.NoSuchMethodError: org.apache.commons.lang3.StringUtils.method",
    "java.lang.ClassCastException: io.netty.channel.ChannelPipeline",
    "java.lang.IncompatibleClassChangeError: Found interface, expected class",
    "ApplicationContextException: springdoc requires Spring Boot 3.x",
    "com.google.protobuf.InvalidProtocolBufferException: field number out of range",
    "java.lang.StackOverflowError: at org.hibernate.proxy.pojo.bytebuddy",
    "org.springframework.beans.factory.UnsatisfiedDependencyException",
]

LIB_ROOT_CAUSES = [
    "Prod ran jackson-databind 2.13 but new build required 2.15; UAT had 2.15.",
    "Guava 32 changed ImmutableList.copyOf null handling; UAT pinned to Guava 31.",
    "commons-lang3 upgraded in shared layer; service JAR compiled against old version.",
    "Netty version in app server (4.1.86) conflicted with bundled version (4.1.100).",
    "Lombok and Kotlin version mismatch caused incompatible generated code.",
    "springdoc-openapi upgrade required Spring Boot 3.x; prod still on 2.7.x.",
    "Protobuf version mismatch between producer (3.21) and consumer (3.19).",
    "Hibernate 6 proxy strategy caused StackOverflow on circular @ManyToMany mapping.",
    "Spring Security upgrade changed bean wiring; conditional bean absent in prod.",
]

LIB_RESOLUTIONS = [
    "Pinned jackson-databind to 2.15 in prod base image; added dependency matrix tests.",
    "Pinned Guava version in BOM; added null-element test cases to regression suite.",
    "Rebuilt fat-JAR against commons-lang3 3.14; added shared-layer upgrade notification process.",
    "Excluded bundled Netty from fat-JAR; aligned app server and service versions.",
    "Aligned Lombok and Kotlin versions in shared BOM; added CI version-check gate.",
    "Upgraded prod to Spring Boot 3.x; added Spring version matrix to CI.",
    "Pinned protoc version in CI; added schema-compatibility check between producer and consumer.",
    "Fixed @ManyToMany mapping to use join table; added Hibernate version gate to upgrade process.",
    "Added conditional bean to prod profile; added feature-flag parity check to CD gate.",
]


def build_lib_incidents(count: int) -> list[dict]:
    incidents = []
    for i in range(count):
        svc = random.choice(LIB_SERVICES)
        idx = i % len(LIB_DESCRIPTIONS)
        desc = LIB_DESCRIPTIONS[idx].format(svc=svc)
        incidents.append({
            "incident_id": f"INC-LIB-{3000 + i}",
            "description": desc,
            "error_signature": LIB_ERROR_SIGNATURES[idx % len(LIB_ERROR_SIGNATURES)],
            "affected_service": svc,
            "root_cause": LIB_ROOT_CAUSES[idx % len(LIB_ROOT_CAUSES)],
            "resolution": LIB_RESOLUTIONS[idx % len(LIB_RESOLUTIONS)],
            "resolved_by": random.choice(RESOLVERS),
            "date": rand_date(),
            "manual_triage_minutes": random.randint(20, 100),
            "family": "lib_dependency",
        })
    return incidents


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    incidents = (
        build_cert_incidents(27)
        + build_mq_incidents(27)
        + build_lib_incidents(26)
    )
    random.shuffle(incidents)

    out_path = Path(__file__).parent / "incidents.json"
    out_path.write_text(json.dumps(incidents, indent=2))
    print(f"[+] Generated {len(incidents)} incidents -> {out_path}")

    # quick stats
    for family in ("tls_cert", "mq_broker", "lib_dependency"):
        n = sum(1 for i in incidents if i["family"] == family)
        print(f"   {family}: {n} records")


if __name__ == "__main__":
    main()
