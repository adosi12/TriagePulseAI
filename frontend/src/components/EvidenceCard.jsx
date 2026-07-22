import React from 'react';

export default function EvidenceCard({ currentScenario, enableRag }) {
  // Determine configuration/git diff patterns based on selected incident scenario
  const getDiffAndFiles = () => {
    const isScenarioA = currentScenario.id === 'scenario-a';
    const isScenarioB = currentScenario.id === 'scenario-b' || currentScenario.incident_number === 'INC-9340';
    const isScenarioD = currentScenario.id === 'scenario-d' || currentScenario.incident_number === 'INC-9622';

    if (isScenarioA) {
      return {
        title: 'pom.xml (payment-gateway-service)',
        diff: [
          { type: 'del', text: '-    <jackson.version>2.10.1</jackson.version>' },
          { type: 'add', text: '+    <jackson.version>2.15.2</jackson.version>' },
          { type: 'info', text: '@@ -42,3 +42,3 @@' },
          { type: 'del', text: '-    <artifactId>jackson-databind</artifactId>\n-    <version>2.10.1</version>' },
          { type: 'add', text: '+    <artifactId>jackson-databind</artifactId>\n+    <version>2.15.2</version>' }
        ],
        files: [
          'pom.xml',
          'src/main/java/com/bank/payments/config/JacksonConfig.java',
          'src/main/java/com/bank/payments/service/TransactionSerializer.java'
        ]
      };
    } else if (isScenarioB) {
      return {
        title: 'vault/secrets/ssl-cert.pem & keystore.jks',
        diff: [
          { type: 'del', text: '- SSL_KEYSTORE_EXPIRE=2026-07-21' },
          { type: 'add', text: '+ SSL_KEYSTORE_EXPIRE=2027-12-31' },
          { type: 'info', text: '@@ -12,2 +12,2 @@' },
          { type: 'del', text: '- VALID_UNTIL: 2026-07-21T12:00:00Z (EXPIRED)' },
          { type: 'add', text: '+ VALID_UNTIL: 2027-12-31T23:59:59Z (VALID)' }
        ],
        files: [
          'src/main/resources/application-prod.yml',
          'vault/secrets/ssl-cert.pem',
          'src/main/java/com/bank/security/TlsSecurityConfig.java'
        ]
      };
    } else if (isScenarioD) {
      return {
        title: 'AuthSecurityConfig.java (JVM Metaspace Limit)',
        diff: [
          { type: 'del', text: '- JVM_ARGS="-XX:MaxMetaspaceSize=128m"' },
          { type: 'add', text: '+ JVM_ARGS="-XX:MaxMetaspaceSize=512m"' },
          { type: 'info', text: '@@ -5,1 +5,1 @@' },
          { type: 'del', text: '- CGLIB_PROXY_ENABLE=true' },
          { type: 'add', text: '+ CGLIB_PROXY_ENABLE=false' }
        ],
        files: [
          'src/main/resources/application-prod.yml',
          'src/main/java/com/bank/security/AuthSecurityConfig.java',
          'Dockerfile'
        ]
      };
    } else {
      // Default / Kafka Scenario
      return {
        title: 'consumer.properties (Kafka Stream Config)',
        diff: [
          { type: 'del', text: '- max.poll.interval.ms=300000' },
          { type: 'add', text: '+ max.poll.interval.ms=600000' },
          { type: 'info', text: '@@ -24,2 +24,2 @@' },
          { type: 'del', text: '- session.timeout.ms=10000' },
          { type: 'add', text: '+ session.timeout.ms=30000' }
        ],
        files: [
          'src/main/resources/consumer.properties',
          'src/main/java/com/bank/fraud/Processor.java'
        ]
      };
    }
  };

  const { title: diffTitle, diff: diffLines, files: filesToInspect } = getDiffAndFiles();

  return (
    <div className="evidence-grid animate-fade-in">
      {/* LEFT COLUMN: RCA Summary */}
      <div className="evidence-rca-card">
        <div className="rca-card-header">
          <h4>💡 Root Cause Synthesis</h4>
          <span className="confidence-badge">
            🎯 {currentScenario.confidence || '94%'} Confidence
          </span>
        </div>
        <div className="rca-card-body">
          <div className="rca-summary-section">
            <h5>Incident Summary:</h5>
            <p className="rca-summary-text">{currentScenario.summary}</p>
          </div>

          <div className="rca-evidence-section">
            <h5>Telemetry Stack Trace:</h5>
            <pre className="evidence-pre">
              <code>{currentScenario.error_signature}</code>
            </pre>
          </div>

          {enableRag && currentScenario.rag_match && (
            <div className="rca-rag-section">
              <h5>Historical Knowledge Base Link (RAG):</h5>
              <div className="rag-match-pill">
                🗂️ {currentScenario.rag_match}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Side-by-side Configuration & Git Diff */}
      <div className="evidence-diff-card">
        <div className="diff-card-header">
          <h4>📂 UAT vs Prod Git / Config Diff</h4>
          <span className="file-badge">{diffTitle}</span>
        </div>
        <div className="diff-card-body">
          <div className="diff-viewer">
            <div className="diff-lines">
              {diffLines.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`diff-line ${
                    line.type === 'del' ? 'diff-line-del' : 
                    line.type === 'add' ? 'diff-line-add' : 'diff-line-info'
                  }`}
                >
                  <span className="diff-line-num">{idx + 1}</span>
                  <pre className="diff-line-code"><code>{line.text}</code></pre>
                </div>
              ))}
            </div>
          </div>

          {/* Fallback Files to Inspect */}
          <div className="fallback-files-section">
            <h5>🕵️ Code Context: Specific Files to Inspect</h5>
            <p className="fallback-help-text">
              If the automated root cause cannot be verified immediately, manually check the following codebase definitions:
            </p>
            <div className="files-list">
              {filesToInspect.map((file, idx) => (
                <div key={idx} className="file-item">
                  <span className="file-icon">📄</span>
                  <code className="file-path-link">{file}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
