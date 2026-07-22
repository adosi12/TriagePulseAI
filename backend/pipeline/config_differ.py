"""
backend/pipeline/config_differ.py
Stage 4: Compares UAT vs Production environment configurations, pom.xml dependencies, SSL cert status, and queue parameters.
"""
from typing import Dict, Any

def perform_config_diff(alert_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates or performs config & code diffing between UAT and Production environments.
    """
    service = alert_data.get("affected_service", "").lower()
    error_sig = alert_data.get("error_signature", "").lower()
    desc = alert_data.get("description", "").lower()

    # Scenario A: Jackson databind / dependency mismatch
    if "jackson" in error_sig or "nosuchmethoderror" in error_sig or "payment" in service:
        return {
            "scenario": "Jackson Databind Version Mismatch",
            "detected_mismatch": True,
            "target_file": "pom.xml (payment-gateway-service)",
            "uat_config": "<dependency>\n  <groupId>com.fasterxml.jackson.core</groupId>\n  <artifactId>jackson-databind</artifactId>\n  <version>2.15.2</version>\n</dependency>",
            "prod_config": "<dependency>\n  <groupId>com.fasterxml.jackson.core</groupId>\n  <artifactId>jackson-databind</artifactId>\n  <version>2.10.1</version>\n</dependency>",
            "diff_type": "Dependency Version Mismatch",
            "git_diff_patch": "--- pom.xml (Prod)\n+++ pom.xml (UAT Recommended Fix)\n@@ -42,3 +42,3 @@\n-    <version>2.10.1</version>\n+    <version>2.15.2</version>",
            "code_files_to_inspect": [
                "src/main/java/com/bank/payments/config/JacksonConfig.java",
                "pom.xml",
                "src/main/java/com/bank/payments/service/TransactionSerializer.java"
            ],
            "explanation": "Production runs jackson-databind v2.10.1 which lacks ObjectMapper.readTree(String) signature introduced in v2.15.2 present in UAT."
        }

    # Scenario B: SSL Cert Expiry
    elif "ssl" in error_sig or "cert" in error_sig or "handshake" in error_sig:
        return {
            "scenario": "Expired SSL KeyStore Certificate",
            "detected_mismatch": True,
            "target_file": "src/main/resources/keystore.jks",
            "uat_config": "Certificate CN=api.internal.bank.com Valid Until: 2027-12-31 (Valid)",
            "prod_config": "Certificate CN=api.internal.bank.com Valid Until: 2026-07-21T12:00:00Z (EXPIRED)",
            "diff_type": "Security Certificate Mismatch",
            "git_diff_patch": "--- production.env\n+++ uat.env\n@@ -12,2 +12,2 @@\n-SSL_KEYSTORE_EXPIRE=2026-07-21\n+SSL_KEYSTORE_EXPIRE=2027-12-31",
            "code_files_to_inspect": [
                "src/main/resources/application-prod.yml",
                "vault/secrets/ssl-cert.pem",
                "src/main/java/com/bank/security/TlsSecurityConfig.java"
            ],
            "explanation": "Production SSL Client Certificate expired on 2026-07-21T12:00:00Z while Vault auto-renewal failed."
        }

    # Scenario C: RabbitMQ Queue & Consumer Prefetch
    else:
        return {
            "scenario": "Consumer Prefetch & Timeout Mismatch",
            "detected_mismatch": True,
            "target_file": "application-prod.yml",
            "uat_config": "spring.rabbitmq.listener.simple.prefetch: 50\nspring.rabbitmq.listener.simple.concurrency: 10",
            "prod_config": "spring.rabbitmq.listener.simple.prefetch: 1\nspring.rabbitmq.listener.simple.concurrency: 1",
            "diff_type": "Queue Configuration Drift",
            "git_diff_patch": "--- application-prod.yml\n+++ application-uat.yml\n@@ -18,2 +18,2 @@\n-  prefetch: 1\n-  concurrency: 1\n+  prefetch: 50\n+  concurrency: 10",
            "code_files_to_inspect": [
                "src/main/resources/application-prod.yml",
                "src/main/java/com/bank/messaging/RabbitMQConfig.java"
            ],
            "explanation": "Production RabbitMQ consumer prefetch is set to 1 causing queue saturation under 1,200 msg/min load."
        }
