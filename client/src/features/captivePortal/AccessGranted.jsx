import React from 'react';
import './AccessGranted.css';

const AccessGranted = ({ data, onLogout }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatExpiry = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minutes`;
    }
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hours ${diffMins % 60} minutes`;
  };

  return (
    <div className="access-granted">
      <div className="success-icon">✓</div>
      <h2 className="success-title">Access Granted</h2>
      <p className="success-message">You are now connected to the library Wi-Fi</p>

      <div className="session-details">
        <div className="detail-item">
          <span className="detail-label">Student:</span>
          <span className="detail-value">{data?.student?.name} ({data?.student?.studentId})</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Session ID:</span>
          <span className="detail-value">{data?.wifiSession?.sessionId}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Expires In:</span>
          <span className="detail-value">{data?.wifiSession?.expiresAt ? formatExpiry(data.wifiSession.expiresAt) : 'N/A'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Gateway:</span>
          <span className="detail-value">{data?.network?.gatewayId}</span>
        </div>
      </div>

      <button onClick={onLogout} className="logout-button">
        Logout
      </button>

      <div className="info-message">
        <p>Keep this page open to monitor your session.</p>
        <p>Session will expire automatically after the time shown above.</p>
      </div>
    </div>
  );
};

export default AccessGranted;
