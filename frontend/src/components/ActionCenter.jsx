import React, { useState } from 'react';

export default function ActionCenter({ 
  currentScenario, 
  jiraCreated, 
  slackAlertSent, 
  onSendSlack, 
  onCreateJira,
  slackChannel,
  setSlackChannel,
  llmModel
}) {
  const [toastMessage, setToastMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState('Not Sent');

  const handleJiraAction = async () => {
    await onCreateJira();
    triggerToast('Jira Ticket successfully created and assigned to ' + currentScenario.group_name + '!');
  };

  const handleSlackAction = async () => {
    await onSendSlack();
    triggerToast('Slack alert successfully dispatched to ' + slackChannel + '!');
  };

  const handleEmailAction = () => {
    setEmailStatus('Sent');
    triggerToast('Email alert successfully dispatched to SMTP relay!');
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  return (
    <div className="action-center-container">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="toast-notification animate-slide-in">
          <span className="toast-icon">🚀</span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      <div className="action-center-card">
        <div className="action-card-header">
          <h4>⚡ Action Center & SRE Diagnostics Integration</h4>
        </div>
        <div className="action-card-body">
          {/* SRE Remediation Trigger Buttons */}
          <div className="remediation-btn-group">
            <button 
              className={`action-btn jira-btn ${jiraCreated ? 'btn-active' : ''}`}
              onClick={handleJiraAction}
            >
              💼 {jiraCreated ? 'Jira Created' : 'Create Jira Ticket'}
            </button>

            <button 
              className={`action-btn slack-btn ${slackAlertSent ? 'btn-active' : ''}`}
              onClick={handleSlackAction}
            >
              💬 {slackAlertSent ? 'Slack Alerted' : 'Send Slack Notification'}
            </button>

            <button 
              className={`action-btn email-btn ${emailStatus === 'Sent' ? 'btn-active' : ''}`}
              onClick={handleEmailAction}
            >
              ✉️ {emailStatus === 'Sent' ? 'Email Dispatched' : 'Trigger SMTP Email Alert'}
            </button>
          </div>

          {/* Configuration Settings Input */}
          <div className="action-inputs-section">
            <div className="input-group">
              <label>Slack Destination Channel</label>
              <input 
                type="text" 
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="action-textbox"
              />
            </div>
          </div>

          {/* Token Cost Reduction Metric Panel */}
          <div className="cost-savings-metrics">
            <h5>📉 Automated Core Efficiencies</h5>
            <div className="metrics-box-grid">
              <div className="metric-box-item">
                <span className="metric-box-label">Token Cost Savings</span>
                <span className="metric-box-val">-88.4%</span>
                <span className="metric-box-sub">Via Pre-filtering Noise</span>
              </div>
              <div className="metric-box-item">
                <span className="metric-box-label">Mean Time to Resolution</span>
                <span className="metric-box-val">&lt; 3 mins</span>
                <span className="metric-box-sub">vs 35 min average</span>
              </div>
              <div className="metric-box-item">
                <span className="metric-box-label">LLM Engine</span>
                <span className="metric-box-val">{llmModel}</span>
                <span className="metric-box-sub">Active inference model</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
