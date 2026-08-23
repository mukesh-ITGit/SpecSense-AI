import React, { useState } from 'react';
import { Save, CheckCircle2, Sliders, FileCheck } from 'lucide-react';
import BackButton from '../components/BackButton';
import { FadeIn } from '../components/motion';
import './Settings.css';

const Settings: React.FC = () => {
  const [autoPublishThreshold, setAutoPublishThreshold] = useState(90);
  const [humanReviewThreshold, setHumanReviewThreshold] = useState(85);
  const [measurementSystem, setMeasurementSystem] = useState('imperial');
  const [autoCapitalize, setAutoCapitalize] = useState(true);
  const [standardizeFractions, setStandardizeFractions] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <h1 className="page-title">Catalog Governance & Pipeline Settings</h1>
          <p className="page-subtitle">Configure AI trust scoring thresholds, UoM normalization rules, and review routing criteria.</p>
        </div>
        <div className="header-actions">
          {saveSuccess && (
            <div className="save-toast">
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span>Settings saved!</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>

      <div className="settings-content">
        <FadeIn delay={0.1}>
          <div className="card settings-card">
            <div className="settings-header">
              <Sliders size={20} color="var(--primary-color)" />
              <h3>Trust Scoring & Threshold Governance</h3>
            </div>
            <p className="text-muted mb-4">
              Control the sensitivity thresholds for automated commerce-publishing and human-in-the-loop review routing.
            </p>
            
            <div className="form-group">
              <div className="slider-label-row">
                <label>Auto-Publish Direct Threshold</label>
                <span className="slider-val-badge">{autoPublishThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="70" 
                max="98" 
                value={autoPublishThreshold} 
                onChange={(e) => setAutoPublishThreshold(Number(e.target.value))}
                className="range-input" 
              />
              <div className="range-labels">
                <span>Aggressive (75%+)</span>
                <span>Balanced (90%)</span>
                <span>Strict (95%+)</span>
              </div>
            </div>

            <div className="form-group mt-4">
              <div className="slider-label-row">
                <label>Human Review Trigger Threshold</label>
                <span className="slider-val-badge warning">{humanReviewThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="90" 
                value={humanReviewThreshold} 
                onChange={(e) => setHumanReviewThreshold(Number(e.target.value))}
                className="range-input" 
              />
              <p className="help-text">
                Products with a calculated trust score below <strong>{humanReviewThreshold}%</strong> or containing active source conflicts will automatically be routed to the Human Review Queue.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="card settings-card">
            <div className="settings-header">
              <FileCheck size={20} color="var(--primary-color)" />
              <h3>Taxonomy & Normalization Rules</h3>
            </div>
            <p className="text-muted mb-4">
              Configure deterministic unit of measure standardization, string parsing, and List-of-Values (LOV) validation.
            </p>
            
            <div className="form-group">
              <label className="form-label-title">Default Measurement System</label>
              <select 
                className="form-control" 
                value={measurementSystem}
                onChange={(e) => setMeasurementSystem(e.target.value)}
              >
                <option value="imperial">Imperial (Inches, Feet, Lbs)</option>
                <option value="metric">Metric (Millimeters, Centimeters, Kg)</option>
                <option value="source">Preserve Source Feed Original</option>
              </select>
            </div>

            <div className="form-group mt-4">
              <label className="form-label-title">String & UoM Transformations</label>
              <div className="checkbox-group">
                <label className="checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={autoCapitalize} 
                    onChange={(e) => setAutoCapitalize(e.target.checked)} 
                  /> 
                  <span>Auto-capitalize verified brand names (e.g., DIABLO, 3M, DEWALT)</span>
                </label>
                <label className="checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={standardizeFractions} 
                    onChange={(e) => setStandardizeFractions(e.target.checked)} 
                  /> 
                  <span>Standardize inch fractions and quotes (e.g., convert 1/2" to 1/2 in)</span>
                </label>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default Settings;
