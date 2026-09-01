import React from 'react';
import './AuthenticationStatus.css';

const AuthenticationStatus = ({ message }) => {
  return (
    <div className="authentication-status">
      <div className="status-spinner"></div>
      <p className="status-message">{message}</p>
    </div>
  );
};

export default AuthenticationStatus;
