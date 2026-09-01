import React from 'react';
import './AccessDenied.css';

const AccessDenied = ({ data, onRetry }) => {
  const getErrorMessage = () => {
    if (data?.code) {
      const errorMessages = {
        'PORTAL_SESSION_NOT_FOUND': 'Session not found. Please try again.',
        'PORTAL_SESSION_EXPIRED': 'Session expired. Please login again.',
        'GATEWAY_NOT_AUTHORIZED': 'Gateway authorization failed.',
        'INVALID_STUDENT_CREDENTIALS': 'Invalid student ID or mobile number.',
        'STUDENT_INACTIVE': 'Student account is inactive.',
        'NO_ACTIVE_MEMBERSHIP': 'No active membership found.',
        'DEVICE_LIMIT_REACHED': 'Device limit reached. Please contact staff.',
        'DEVICE_REVOKED': 'Device has been revoked.',
        'DEVICE_SUSPENDED': 'Device has been suspended.',
        'WIFI_SESSION_CREATION_FAILED': 'Failed to create Wi-Fi session.',
        'GATEWAY_AUTHORIZATION_FAILED': 'Gateway authorization failed.'
      };
      return errorMessages[data.code] || data.code;
    }
    return 'Authentication failed. Please try again.';
  };

  return (
    <div className="access-denied">
      <div className="error-icon">✕</div>
      <h2 className="error-title">Access Denied</h2>
      <p className="error-message">{getErrorMessage()}</p>

      <div className="error-details">
        {data?.code && (
          <div className="error-code">
            <span className="error-code-label">Error Code:</span>
            <span className="error-code-value">{data.code}</span>
          </div>
        )}
      </div>

      <button onClick={onRetry} className="retry-button">
        Try Again
      </button>

      <div className="help-message">
        <p>If the problem persists, please contact library staff.</p>
      </div>
    </div>
  );
};

export default AccessDenied;
