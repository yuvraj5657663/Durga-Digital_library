import React from 'react';
import './SessionExpired.css';

const SessionExpired = ({ onRetry }) => {
  return (
    <div className="session-expired">
      <div className="expired-icon">⏰</div>
      <h2 className="expired-title">Session Expired</h2>
      <p className="expired-message">Your Wi-Fi session has expired.</p>
      <p className="expired-submessage">Please login again to continue accessing the library Wi-Fi.</p>

      <button onClick={onRetry} className="retry-button">
        Login Again
      </button>

      <div className="info-message">
        <p>Sessions expire after a certain period for security.</p>
        <p>Your attendance has already been recorded.</p>
      </div>
    </div>
  );
};

export default SessionExpired;
