import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, isNetworkError } from '../services/api';
import './Login.css';
import './CreateAccount.css';

const CreateAccount: React.FC = () => {
  const navigate = useNavigate();
  const { register, connectionStatus, checkConnection } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkErrState, setIsNetworkErrState] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmation) {
      setErrorMessage('Complete all fields to create your account.');
      setIsNetworkErrState(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrorMessage('Enter a valid work email address.');
      setIsNetworkErrState(false);
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      setIsNetworkErrState(false);
      return;
    }
    if (password !== confirmation) {
      setErrorMessage('Passwords do not match.');
      setIsNetworkErrState(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsNetworkErrState(false);
    try {
      await register({ name: trimmedName, email: trimmedEmail, password });
      setSuccessMessage('Account created successfully. Redirecting to your dashboard...');
      window.setTimeout(() => navigate('/', { replace: true }), 700);
    } catch (error: unknown) {
      console.error('[SpecSense] Registration error:', error);
      const isNet = isNetworkError(error);
      setIsNetworkErrState(isNet);
      setErrorMessage(getAuthErrorMessage(error));
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


  return (
    <div className="login-page-container">
      <div className="login-left-panel">
        <motion.div className="login-card-wrapper" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="login-brand-header">
            <div className="login-brand-logo">S</div>
            <div><h1 className="login-brand-title">SpecSense AI</h1><p className="login-brand-tagline">Enterprise Catalog Intelligence</p></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h2 className="login-heading" style={{ margin: 0 }}>Create your SpecSense account</h2>
            
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
          <p className="login-subheading">Turn catalog data into trusted commerce intelligence.</p>

          {errorMessage && (
            <div className="login-error-alert">
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
            </div>
          )}
          {successMessage && <div className="login-success-alert"><span>{successMessage}</span></div>}


          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field-group"><label htmlFor="account-name">Full Name</label><div className="input-with-icon"><User size={16} className="input-icon-left" /><input id="account-name" type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></div></div>
            <div className="form-field-group"><label htmlFor="account-email">Email</label><div className="input-with-icon"><Mail size={16} className="input-icon-left" /><input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></div>
            <div className="form-field-group"><label htmlFor="account-password">Password</label><div className="input-with-icon"><Lock size={16} className="input-icon-left" /><input id="account-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><button type="button" className="input-icon-btn-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div className="form-field-group"><label htmlFor="account-confirmation">Confirm Password</label><div className="input-with-icon"><Lock size={16} className="input-icon-left" /><input id="account-confirmation" type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /><button type="button" className="input-icon-btn-right" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Hide confirmation' : 'Show confirmation'}>{showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <button type="submit" className="login-submit-btn" disabled={isLoading || !!successMessage}>{isLoading ? <><div className="spinner account-spinner" /><span>Creating account...</span></> : <><span>Create Account</span><ArrowRight size={16} /></>}</button>
          </form>
          <p className="auth-switch">Already have an account? <button type="button" onClick={() => navigate('/login')}>Sign In</button></p>
        </motion.div>
      </div>
      <div className="login-right-panel account-hero-panel">
        <div className="login-right-pattern" /><div className="login-right-glow" />
        <div className="login-hero-content"><div className="login-hero-badge">TRUSTED CATALOG INTELLIGENCE</div><h2 className="login-hero-title">From raw records to commerce-ready intelligence.</h2><p className="login-hero-desc">Normalize, validate, explain, and score every product with a transparent AI workflow built for industrial catalogs.</p><div className="account-pipeline"><span>RAW DATA</span><span>AI ENRICHMENT</span><span>VALIDATION</span><span>TRUST SCORE</span><span>READY</span></div></div>
      </div>
    </div>
  );
};

export default CreateAccount;
