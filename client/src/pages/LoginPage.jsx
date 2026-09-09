import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Eye, EyeOff, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(credentials);
      
      // Role-based navigation
      if (['admin', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'SUPPORT'].includes(user.role)) {
        toast.success(`Welcome back, ${user.name || 'Admin'}!`);
        navigate('/admin');
      } else if (user.role === 'student') {
        toast.success(`Welcome back, ${user.name || 'Student'}!`);
        navigate('/student');
      } else {
        toast.error('Invalid user role');
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Invalid Username/Password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setResetLoading(true);
    try {
      await fetch('/api/v1/auth/password-reset/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      setResetStep('confirm');
      toast.success('If that email is registered, a reset code has been sent.');
    } catch {
      toast.error('Unable to start password reset');
    } finally { setResetLoading(false); }
  };

  const handleResetConfirm = async (event) => {
    event.preventDefault();
    setResetLoading(true);
    try {
      const response = await fetch('/api/v1/auth/password-reset/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword: resetPassword })
      });
      if (!response.ok) throw new Error('Invalid or expired reset code');
      toast.success('Password reset successfully. You can sign in now.');
      setResetOpen(false); setResetStep('request'); setResetOtp(''); setResetPassword('');
    } catch (error) { toast.error(error.message); }
    finally { setResetLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Durga Digital Library</h1>
          <p className="text-slate-300 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-400"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-400"
              placeholder="Enter your password"
              required
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="mt-2 text-xs text-slate-300 flex items-center gap-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" onClick={() => setResetOpen(true)} className="w-full mt-4 text-sm text-blue-200 hover:text-white underline">Forgot password?</button>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211</p>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-blue-700" /><h2 className="text-lg font-bold text-gray-900">Reset password</h2></div>
            {resetStep === 'request' ? (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <p className="text-sm text-gray-600">Enter your registered email. If an account exists, a time-limited code will be sent.</p>
                <input type="email" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="input" placeholder="Registered email" autoComplete="email" />
                <button disabled={resetLoading} className="btn btn-primary w-full">{resetLoading ? 'Sending...' : 'Send reset code'}</button>
              </form>
            ) : (
              <form onSubmit={handleResetConfirm} className="space-y-4">
                <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={resetOtp} onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, ''))} className="input" placeholder="6-digit code" autoComplete="one-time-code" />
                <input type="password" minLength={6} required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="input" placeholder="New password" autoComplete="new-password" />
                <button disabled={resetLoading} className="btn btn-primary w-full">{resetLoading ? 'Updating...' : 'Update password'}</button>
              </form>
            )}
            <button type="button" onClick={() => { setResetOpen(false); setResetStep('request'); }} className="btn btn-secondary w-full mt-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
