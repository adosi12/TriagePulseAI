import React, { useState } from 'react';

export default function LiveSystemMap({ currentScenario }) {
  const [activeNode, setActiveNode] = useState(null);

  // Define nodes and their health based on the scenario
  const getNodes = () => {
    const isScenarioA = currentScenario.id === 'scenario-a';
    const isScenarioB = currentScenario.id === 'scenario-b';
    const isScenarioC = currentScenario.id === 'scenario-c';
    const isScenarioD = currentScenario.id === 'scenario-d';

    return [
      {
        id: 'api-gateway',
        name: 'API Gateway',
        status: 'Healthy',
        metrics: '0.01% err | 12ms',
        desc: 'Enterprise ingress router directing internal traffic.',
      },
      {
        id: 'payments-api',
        name: 'Payments API',
        status: isScenarioA || isScenarioC ? 'Degraded' : 'Healthy',
        metrics: isScenarioA ? '14.2% err | 5420ms' : isScenarioC ? '99.8% err | 0ms' : '0.05% err | 45ms',
        desc: 'Processes credit card, UPI, and bank transfers.',
      },
      {
        id: 'rabbitmq-mq',
        name: 'RabbitMQ (MQ)',
        status: isScenarioA || isScenarioB ? 'Queue Full' : 'Healthy',
        metrics: isScenarioA || isScenarioB ? '10k+ pending' : '0 pending',
        desc: 'Asynchronous event and settlement message broker.',
      },
      {
        id: 'settlement-service',
        name: 'Settlement Service',
        status: isScenarioA || isScenarioB || isScenarioD ? 'Failing' : 'Healthy',
        metrics: isScenarioA ? 'NoSuchMethodError' : isScenarioB ? 'RebalanceError' : isScenarioD ? 'Metaspace OOM' : 'Active',
        desc: 'Processes batch files and updates core ledgers.',
      }
    ];
  };

  const nodes = getNodes();

  return (
    <div className="system-map-card">
      <div className="system-map-header">
        <h3>🔗 Live System Map (Microservice Topology Graph)</h3>
        <span className="live-pulse-badge">
          <span className="live-pulse-dot"></span> Live Telemetry
        </span>
      </div>

      <div className="topology-container">
        {nodes.map((node, index) => {
          const isFailing = node.status === 'Failing' || node.status === 'Queue Full' || node.status === 'Degraded';
          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div 
                className={`topology-node ${isFailing ? 'node-failing' : 'node-healthy'} ${activeNode === node.id ? 'node-selected' : ''}`}
                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
              >
                <div className="node-status-indicator">
                  <span className={`status-dot ${isFailing ? 'red-dot' : 'green-dot'}`}></span>
                  {node.status.toUpperCase()}
                </div>
                <div className="node-name">{node.name}</div>
                <div className="node-metrics">{node.metrics}</div>
              </div>

              {/* Connector Arrow (except for last node) */}
              {index < nodes.length - 1 && (
                <div className="topology-connector">
                  <div className={`connector-line ${isFailing ? 'connector-alert' : ''}`}></div>
                  <span className={`connector-arrow ${isFailing ? 'connector-alert' : ''}`}>➔</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Expandable Flashcard Detail for Selected Node */}
      {activeNode && (
        <div className="node-flashcard animate-fade-in">
          <div className="flashcard-header">
            <h4>Node Details: {nodes.find(n => n.id === activeNode)?.name}</h4>
            <button className="close-flashcard" onClick={() => setActiveNode(null)}>✕</button>
          </div>
          <div className="flashcard-body">
            <p><strong>Description:</strong> {nodes.find(n => n.id === activeNode)?.desc}</p>
            <p><strong>Current Telemetry:</strong> <code>{nodes.find(n => n.id === activeNode)?.metrics}</code></p>
            <p><strong>Health Metric:</strong> {nodes.find(n => n.id === activeNode)?.status === 'Healthy' ? '🟢 Operational' : '🔴 Alert Active'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
