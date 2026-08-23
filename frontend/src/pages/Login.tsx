import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, isNetworkError } from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, connectionStatus, checkConnection } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkErrState, setIsNetworkErrState] = useState(false);

  const fromLocation = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      setIsNetworkErrState(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsNetworkErrState(false);

    try {
      await login({ email: email.trim(), password });
      navigate(fromLocation, { replace: true });
    } catch (err: unknown) {
      console.error('[SpecSense] Login error:', err);
      const isNet = isNetworkError(err);
      setIsNetworkErrState(isNet);
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsRetryingConnection(true);
    setErrorMessage(null);
    setIsNetworkErrState(false);
    const live = await checkConnection();
    setIsRetryingConnection(false);
    if (!live) {
      setIsNetworkErrState(true);
      setErrorMessage("SpecSense AI is temporarily unreachable. Please ensure the backend is running.");
    }
  };

  const handleDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setIsNetworkErrState(false);
  };

  return (
    <div className="login-page-container">
      {/* Left Form Panel */}
      <div className="login-left-panel">
        <motion.div 
          className="login-card-wrapper"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="login-brand-header">
            <div className="login-brand-logo">S</div>
            <div>
              <h1 className="login-brand-title">SpecSense AI</h1>
              <p className="login-brand-tagline">Enterprise Catalog Intelligence</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h2 className="login-heading" style={{ margin: 0 }}>Welcome back</h2>
            
            {/* Real Connection Status Pill */}
            <div className={`connection-status-pill ${connectionStatus}`} title={`Backend status: ${connectionStatus}`}>
              <span className="status-dot-sm"></span>
              <span>
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                {connectionStatus === 'offline' && 'Offline'}
              </span>
            </div>
          </div>
          <p className="login-subheading">Sign in to access your catalog intelligence dashboard.</p>

          {errorMessage && (
            <motion.div 
              className="login-error-alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div className="login-error-alert-content">
                <span>{errorMessage}</span>
                {isNetworkErrState && (
                  <button 
                    type="button" 
                    className="login-retry-btn" 
                    onClick={handleRetryConnection}
                    disabled={isRetryingConnection}
                  >
                    <RefreshCw size={12} className={isRetryingConnection ? 'spin' : ''} />
                    <span>{isRetryingConnection ? 'Checking...' : 'Retry Connection'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field-group">
              <label htmlFor="login-email">Work Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon-left" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon-left" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="remember-me-label">
                <input type="checkbox" defaultChecked />
                <span>Remember this device</span>
              </label>
              <a href="#forgot" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert("Password reset via email is not yet configured. Please contact your administrator or use one of the demo accounts below."); }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <button type="button" onClick={() => navigate('/create-account')}>Create Account</button>
          </p>

          {/* Quick Demo Accounts */}
          <div className="demo-accounts-box">
            <div className="demo-accounts-title">
              <Sparkles size={12} color="#2563eb" />
              <span>1-Click Demo Accounts</span>
            </div>
            <div className="demo-accounts-grid">
              <button 
                type="button" 
                className="demo-account-pill"
                onClick={() => handleDemoAccount('sarah.jenkins@specsense.ai', 'password123')}
              >
                <div className="demo-acc-name">Sarah Jenkins</div>
                <div className="demo-acc-role">Catalog Lead</div>
              </button>
              <button 
                type="button" 
                className="demo-account-pill"
                onClick={() => handleDemoAccount('admin@specsense.ai', 'Admin123!')}
              >
                <div className="demo-acc-name">Alex Mercer</div>
                <div className="demo-acc-role">Chief Data Officer</div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Hero Showcase */}
      <div className="login-right-panel">
        <div className="login-right-pattern"></div>
        <div className="login-right-glow"></div>

        <div>
          <div className="login-hero-badge">
            <ShieldCheck size={14} /> SOC-2 Type II Certified SaaS
          </div>
        </div>

        <div className="login-hero-content">
          <h2 className="login-hero-title">
            Transform messy industrial data into commerce-ready products.
          </h2>
          <p className="login-hero-desc">
            SpecSense AI combines deterministic taxonomy rule engines, source-authority conflict detection, and multi-factor trust scoring to clean catalogs at enterprise scale.
          </p>

          <div className="login-features-list">
            <div className="login-feature-item">
              <div className="login-feature-icon"><Check size={14} /></div>
              <div className="login-feature-text">
                <h4>Automated Attribute Normalization</h4>
                <p>UoM standardization, brand casing alignment, and LOV validation in sub-milliseconds.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><Zap size={14} /></div>
              <div className="login-feature-text">
                <h4>Multi-Factor Trust Scoring</h4>
                <p>100-point transparent score across completeness, validation, reliability, and extraction confidence.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><ShieldCheck size={14} /></div>
              <div className="login-feature-text">
                <h4>Explainable AI Decision Audit</h4>
                <p>Complete "Why?" provenance trails for automated decisions and conflict resolution.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right-footer">
          <span>© 2026 SpecSense AI Inc. All rights reserved.</span>
          <span>Enterprise v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
