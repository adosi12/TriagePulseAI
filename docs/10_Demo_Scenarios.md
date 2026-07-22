# Sentinel AI — 10 Complete Production Demo Scenarios

This document outlines the 10 core synthetic scenarios used to demonstrate the power of Sentinel AI. 

## Scenario 1: Payment Gateway — Jackson Deserialization Failure
* **Business Impact:** Critical checkout failures. Revenue loss.
* **Trigger:** ServiceNow monitoring bot reports 504 Gateway Timeouts.
* **Logs Snapshot:**
  ```text
  19:41:58 INFO  com.bank.GatewayFilter - Request received TXN_98765
  19:41:59 ERROR com.bank.TransactionSerializer - NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree
  19:42:05 ERROR com.bank.PaymentServlet - HTTP 504 Gateway Timeout
  ```
* **Metrics:** Error Rate spiked from 0.2% to 14.2%. p99 Latency at 5,420ms.
* **Historical Match:** RAG finds a 92% match to a similar incident 14 days ago where `jackson-databind` was out of sync between UAT and Prod.
* **AI RCA:** A recent deployment included an older version of `jackson-databind` (2.10.1) which lacks the `readTree` method required by the new transaction payload, causing silent crashes resulting in upstream 504 timeouts.
* **Suggested Patch:** Bump `jackson.version` in `pom.xml` to 2.15.2.

## Scenario 2: Fraud Stream — Kafka Consumer Group Rebalance
* **Business Impact:** Fraud events not being processed, exposing the bank to risk.
* **Trigger:** Datadog alerts on Kafka Consumer Lag exceeding 50k.
* **Logs Snapshot:**
  ```text
  14:01:10 WARN  org.apache.kafka.clients.consumer.KafkaConsumer - max.poll.interval.ms (300000ms) exceeded
  14:01:15 WARN  org.apache.kafka.clients.consumer.KafkaConsumer - Revoking partitions [fraud-events-0]
  14:01:30 ERROR com.bank.fraud.Processor - Stalled partition rebalance loop detected
  ```
* **AI RCA:** Fraud payload deserialization became unexpectedly slow due to a new heavy regex operation. This caused processing to exceed the 300s `max.poll.interval.ms`, triggering a continuous consumer group rebalance loop and freezing partition reading.
* **Suggested Patch:** Increase `max.poll.interval.ms` to 600000 in `consumer.properties`.

## Scenario 3: Payments SSL Certificate Expiry — Vault Token Failure
* **Business Impact:** Complete loss of secure client traffic. 100% downtime.
* **Trigger:** PagerDuty TLS alert.
* **Logs Snapshot:**
  ```text
  12:05:04 ERROR org.apache.coyote.http11.Http11NioProtocol - SSLHandshakeException: Certificate expired
  12:05:05 ERROR com.bank.security.VaultClient - HTTP 403 Forbidden on /v1/pki/issue/payments-cert
  ```
* **AI RCA:** The TLS certificate for the payments gateway expired. The automated cert-manager renewal job failed to run because its HashiCorp Vault authentication token had expired and wasn't rotated.
* **Suggested Patch:** Rotate Vault token for `cert-manager` SA and manually trigger certificate renewal pipeline.

## Scenario 4: Core Banking Auth — JVM Metaspace OOM
* **Business Impact:** Users unable to log in to mobile app.
* **Trigger:** New Relic JVM memory alert.
* **Logs Snapshot:**
  ```text
  11:25:22 FATAL java.lang.OutOfMemoryError: Metaspace pool exhausted
  11:25:23 ERROR java.lang.ClassLoader - Failed to define class com.bank.auth.Proxy$192840
  ```
* **AI RCA:** A recent feature flag enabled aggressive runtime CGLIB proxy generation. The dynamic class generation exhausted the JVM Metaspace (which was hardcoded to 128m in the Dockerfile), causing the pods to crash-loop.
* **Suggested Patch:** Disable the CGLIB feature flag, or update Dockerfile `JVM_ARGS="-XX:MaxMetaspaceSize=512m"`.

## Scenarios 5-10
*(Details for Scenarios 5 through 10—Database Connection Leaks, Cron Job Deadlocks, Regex Backtracking CPU Spikes, Redis Memory Exhaustion, API Rate Limiting, and RabbitMQ Dead-letters—follow the same structured format in the live demonstration database.)*
