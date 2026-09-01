import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LoginForm from './LoginForm';
import AuthenticationStatus from './AuthenticationStatus';
import AccessGranted from './AccessGranted';
import AccessDenied from './AccessDenied';
import SessionExpired from './SessionExpired';
import './CaptivePortalPage.css';

const CaptivePortalPage = () => {
  const { portalSessionId } = useParams();
  const [status, setStatus] = useState('loading');
  const [portalData, setPortalData] = useState(null);

  useEffect(() => {
    if (portalSessionId) {
      checkPortalStatus();
    } else {
      setStatus('login');
    }
  }, [portalSessionId]);

  const checkPortalStatus = async () => {
    try {
      const response = await fetch(`/api/v1/network/portal/status/${portalSessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setPortalData(data);
        setStatus(data.status);
      } else {
        setStatus('login');
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus('login');
    }
  };

  const handleAuthenticationSuccess = (data) => {
    setPortalData(data);
    setStatus('authorized');
  };

  const handleAuthenticationFailure = (error) => {
    setStatus('denied');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/network/portal/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalSessionId })
      });
      setStatus('login');
      setPortalData(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <AuthenticationStatus message="Initializing..." />;
      case 'login':
        return <LoginForm onSuccess={handleAuthenticationSuccess} onFailure={handleAuthenticationFailure} />;
      case 'pending':
        return <AuthenticationStatus message="Authenticating..." />;
      case 'authorized':
        return <AccessGranted data={portalData} onLogout={handleLogout} />;
      case 'failed':
        return <AccessDenied data={portalData} onRetry={() => setStatus('login')} />;
      case 'expired':
        return <SessionExpired onRetry={() => setStatus('login')} />;
      default:
        return <LoginForm onSuccess={handleAuthenticationSuccess} onFailure={handleAuthenticationFailure} />;
    }
  };

  return (
    <div className="captive-portal-page">
      <div className="portal-container">
        <div className="portal-header">
          <h1 className="portal-title">Durga Digital Library</h1>
          <p className="portal-subtitle">Wi-Fi Access Portal</p>
        </div>
        <div className="portal-content">
          {renderContent()}
        </div>
        <div className="portal-footer">
          <p>&copy; 2026 Durga Digital Library. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CaptivePortalPage;
