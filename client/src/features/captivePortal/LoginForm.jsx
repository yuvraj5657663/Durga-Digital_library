import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onSuccess, onFailure }) => {
  const [studentId, setStudentId] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get portal session ID from URL or create new one
      const urlParams = new URLSearchParams(window.location.search);
      const portalSessionId = urlParams.get('portalSessionId');

      if (!portalSessionId) {
        // Need to initiate portal session first
        const initResponse = await fetch('/api/v1/network/portal', {
          headers: {
            'x-gateway-id': 'GATEWAY-001'
          }
        });
        const initData = await initResponse.json();
        
        if (!initData.success) {
          throw new Error('Failed to initialize portal session');
        }
      }

      const currentPortalSessionId = urlParams.get('portalSessionId') || (await fetch('/api/v1/network/portal', {
        headers: { 'x-gateway-id': 'GATEWAY-001' }
      }).then(r => r.json())).portalSessionId;

      const response = await fetch('/api/v1/network/portal/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalSessionId: currentPortalSessionId,
          studentId,
          mobile,
          deviceInfo: {
            name: 'Unknown Device',
            type: 'other',
            platform: navigator.platform
          }
        })
      });

      const data = await response.json();

      if (data.success && data.authorized) {
        onSuccess(data);
      } else {
        setError(data.message || 'Authentication failed');
        onFailure(data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      onFailure(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="login-header">
        <h2>Student Login</h2>
        <p>Enter your credentials to access Wi-Fi</p>
      </div>
      
      <form onSubmit={handleSubmit} className="login-form-container">
        <div className="form-group">
          <label htmlFor="studentId">Student ID</label>
          <input
            type="text"
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your Student ID"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">Mobile Number</label>
          <input
            type="tel"
            id="mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your 10-digit mobile number"
            required
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </form>

      <div className="login-footer">
        <p>Need help? Contact library staff.</p>
      </div>
    </div>
  );
};

export default LoginForm;
