import React from 'react';

export default function OutlookTriggerModal({ isOpen, onClose, onLaunch }) {
  if (!isOpen) return null;

  return (
    <div className="outlook-modal-overlay">
      <div className="outlook-window">
        {/* Outlook Header Bar */}
        <div className="outlook-header-bar">
          <div className="outlook-title">
            <span className="outlook-logo-icon">✉</span> Microsoft Outlook - P1 Incident Response
          </div>
          <button className="outlook-window-close" onClick={onClose}>✕</button>
        </div>

        {/* Email Header */}
        <div className="outlook-email-header">
          <div className="outlook-avatar">L1</div>
          <div className="outlook-header-details">
            <div className="outlook-sender">
              <strong>L1-Monitoring-System@bank.com</strong> on behalf of <strong>SOC Ops Center</strong>
            </div>
            <div className="outlook-to">To: OnCall-SRE-Lead@bank.com</div>
            <div className="outlook-subject">
              ⚠️ [CRITICAL P1] Payment-Gateway 504 Gateway Timeout in Production
            </div>
          </div>
          <div className="outlook-date">Just Now</div>
        </div>

        {/* Email Body */}
        <div className="outlook-email-body">
          <p className="outlook-salutation">Dear On-Call SRE Team,</p>
          
          <div className="outlook-warning-callout">
            <strong>CRITICAL INCIDENT ALERT DETECTED</strong>
            <p>1,200 payment transactions failing per minute across UPI & Core Banking channels. Error rates spiked past 14% at 19:42 UTC.</p>
          </div>

          <table className="outlook-alert-table">
            <tbody>
              <tr>
                <td><strong>Incident ID:</strong></td>
                <td>INC0094821 (ServiceNow)</td>
              </tr>
              <tr>
                <td><strong>Affected Node:</strong></td>
                <td>Payment-Gateway / Settlement-Service</td>
              </tr>
              <tr>
                <td><strong>Severity:</strong></td>
                <td><span className="p1-badge">P1 - CRITICAL</span></td>
              </tr>
              <tr>
                <td><strong>Telemetry Signature:</strong></td>
                <td><code>NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree</code></td>
              </tr>
            </tbody>
          </table>

          <p style={{ marginTop: '16px', color: '#64748b' }}>
            Automated health checking indicates a potential version mismatch in runtime jar dependencies between the UAT environment and the Production environment.
          </p>

          {/* Call to Action Button */}
          <div className="outlook-action-wrapper">
            <button className="outlook-action-btn" onClick={onLaunch}>
              🚀 Launch TriagePulse AI Diagnostics →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
