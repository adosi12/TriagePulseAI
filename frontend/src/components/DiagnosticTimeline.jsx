import React from 'react';

export default function DiagnosticTimeline({ running, activeStageKey, liveStages, currentScenario }) {
  // Map internal backend/orchestrator stages to 5 UI stepper stages
  const getStepStatus = (stepName) => {
    if (!running) return 'done'; // Static simulation done when not running

    const stageMap = {
      'Alert Ingested': 'done', // Always done if we started
      'Historical RAG Search': liveStages['rag_matching'] ? 'done' : activeStageKey === 'rag_matching' ? 'active' : 'pending',
      'Log Noise Filtered': liveStages['ai_synthesis'] || liveStages['jira_ticket'] ? 'done' : activeStageKey === 'ai_synthesis' ? 'active' : 'pending',
      'UAT vs Prod Config Diff': liveStages['jira_ticket'] ? 'done' : activeStageKey === 'jira_ticket' ? 'active' : 'pending',
      'RCA Synthesis': liveStages['email_alert'] ? 'done' : activeStageKey === 'email_alert' ? 'active' : 'pending',
    };

    return stageMap[stepName] || 'pending';
  };

  const steps = [
    { name: 'Alert Ingested', desc: `Ingested ${currentScenario.snow_number || 'INC'}` },
    { name: 'Historical RAG Search', desc: currentScenario.rag_match || 'Searching history...' },
    { name: 'Log Noise Filtered', desc: '2,400 lines reduced to 3 lines' },
    { name: 'UAT vs Prod Config Diff', desc: 'pom.xml & SSL check' },
    { name: 'RCA Synthesis', desc: 'Gemini RCA Report' }
  ];

  return (
    <section className="tp-timeline-section">
      <div className="tp-section-header">
        <h3 className="tp-section-title">🤖 Diagnostic Timeline & AI Stepper</h3>
        {running && <span className="tp-live-tag">⚡ Streaming Gemini Pipeline...</span>}
      </div>

      <div className="tp-timeline-stepper">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.name);
          const activeClass = status === 'done' ? 'done' : status === 'active' ? 'active' : 'pending';

          return (
            <div key={idx} className={`tp-step-card ${activeClass}`}>
              <div className="tp-step-header">
                <span className="tp-step-tag">Step {idx + 1}</span>
                <span className={`tp-step-badge ${activeClass}`}>
                  {status === 'done' ? '✓ Completed' : status === 'active' ? '● Active' : '○ Pending'}
                </span>
              </div>
              <div className="tp-step-name">{step.name}</div>
              <div className="tp-step-time" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                {step.desc}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
