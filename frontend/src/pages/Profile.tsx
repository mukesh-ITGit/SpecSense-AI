import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, Building, LogOut, Key, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import { FadeIn } from '../components/motion';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.name || 'Sarah Jenkins';
  const displayEmail = user?.email || 'sarah.jenkins@specsense.ai';
  const displayRole = user?.role || 'Catalog Intelligence Lead';
  const displayCompany = user?.company || 'SpecSense Industrial Corp';
  const displayInitial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Manage your personal credentials, workspace authority, and active session.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={() => setShowConfirmLogout(true)} id="profile-sign-out-btn">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <div className="profile-content-grid">
        {/* Left Column: Profile Card */}
        <FadeIn delay={0.08}>
          <div className="card profile-main-card">
            <div className="profile-hero-banner" aria-hidden="true"></div>
            
            <div className="profile-header-content">
              <div className="profile-avatar-large" aria-label={`Avatar for ${displayName}`}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} className="profile-avatar-img" />
                ) : (
                  <span>{displayInitial}</span>
                )}
              </div>
              <div className="profile-hero-info">
                <h2 className="profile-name">{displayName}</h2>
                <div className="profile-role-row">
                  <span className="badge badge-info">{displayRole}</span>
                </div>
              </div>
            </div>
            
            <div className="profile-details-grid">
              <div className="profile-detail-cell">
                <div className="detail-icon" aria-hidden="true"><Mail size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-val font-mono">{displayEmail}</span>
                </div>
              </div>

              <div className="profile-detail-cell">
                <div className="detail-icon" aria-hidden="true"><Building size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Organization</span>
                  <span className="detail-val">{displayCompany}</span>
                </div>
              </div>

              <div className="profile-detail-cell">
                <div className="detail-icon" aria-hidden="true"><Shield size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Access Level</span>
                  <span className="detail-val">Catalog Admin (Tier 1 Authority)</span>
                </div>
              </div>

              <div className="profile-detail-cell">
                <div className="detail-icon" aria-hidden="true"><Clock size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Session Status</span>
                  <span className="detail-val text-success">Active &amp; Authenticated (JWT)</span>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Right Column: Security & Permissions + Active Session */}
        <FadeIn delay={0.16}>
          <div className="profile-side-column">
            <div className="card security-card">
              <div className="security-header">
                <div className="sec-header-icon" aria-hidden="true">
                  <Key size={18} color="var(--primary-color)" />
                </div>
                <h3 className="section-title">Security &amp; Permissions</h3>
              </div>
              <div className="security-items-list">
                <div className="sec-item">
                  <CheckCircle size={16} className="sec-item-icon" />
                  <span>Rule Engine Override Permission</span>
                </div>
                <div className="sec-item">
                  <CheckCircle size={16} className="sec-item-icon" />
                  <span>Conflict Resolution Authority</span>
                </div>
                <div className="sec-item">
                  <CheckCircle size={16} className="sec-item-icon" />
                  <span>Batch Ingestion &amp; Export Rights</span>
                </div>
                <div className="sec-item">
                  <CheckCircle size={16} className="sec-item-icon" />
                  <span>Catalog Quality Threshold Setting</span>
                </div>
              </div>
            </div>

            <div className="card session-card">
              <h3 className="section-title">Active Session</h3>
              <p className="session-description">
                Signed in securely via JWT token with 24-hour expiration window.
              </p>
              <button 
                className="btn btn-secondary w-full session-logout-btn" 
                onClick={() => setShowConfirmLogout(true)}
              >
                <LogOut size={16} /> End Session Now
              </button>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Confirmation Modal */}
      {showConfirmLogout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-signout-title">
          <div className="modal-card">
            <h3 id="modal-signout-title">Confirm Sign Out</h3>
            <p>Are you sure you want to end your current SpecSense session?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmLogout(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleLogout}>Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
