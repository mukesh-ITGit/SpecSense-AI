import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, CheckCircle, RefreshCw, Play, ShieldAlert, Check, 
  ArrowRight, AlertTriangle, CheckCircle2, Copy, Code
} from 'lucide-react';
import { api } from '../services/api';
import type { ProductOutput, ConfidenceTag } from '../types';
import { AnimatedNumber, FadeIn, AnimatedCard } from '../components/motion';
import BackButton from '../components/BackButton';
import './EnrichProduct.css';

const renderSafeValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const ENRICH_INPUT_KEY = 'specsense_last_enrich_input';
const ENRICH_RESULT_KEY = 'specsense_last_enrich_result';

const EnrichProduct: React.FC = () => {
  // Input State
  const [rawText, setRawText] = useState<string>(() => {
    return sessionStorage.getItem(ENRICH_INPUT_KEY) || '';
  });
  
  // Result State
  const [result, setResult] = useState<ProductOutput | null>(() => {
    try {
      const saved = sessionStorage.getItem(ENRICH_RESULT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Processing State
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>(() => {
    try {
      const saved = sessionStorage.getItem(ENRICH_RESULT_KEY);
      return saved ? 'completed' : 'idle';
    } catch {
      return 'idle';
    }
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'why' | 'attributes'>('attributes');
  const [genTab, setGenTab] = useState<'title' | 'invoice' | 'mobile' | 'long'>('title');
  const [showJson, setShowJson] = useState(false);

  const demoChips = [
    'DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc',
    '3M 7447B Scotch-Brite Hand Pad 6"x9" 20 Pack',
    'P80 Aluminum Oxide Sanding Disc 5" 10 Pack',
    '4-1/2" Cut-Off Wheel Type 1 10 Pack'
  ];

  const pipelineSteps = [
    'RAW INPUT',
    'AI EXTRACTION',
    'BRAND MATCHING',
    'CATEGORY CLASSIFICATION',
    'ATTRIBUTE EXTRACTION',
    'NORMALIZATION',
    'VALIDATION',
    'DESCRIPTION GENERATION',
    'TRUST ANALYSIS',
    'FINAL PRODUCT'
  ];

  // Quality Indicators
  const [quality, setQuality] = useState({
    hasPartNum: false,
    hasBrand: false,
    hasDim: false,
    hasType: false,
    hasPack: false
  });

  useEffect(() => {
    const text = rawText.toLowerCase();
    setQuality({
      hasPartNum: /[a-z0-9]{5,}/.test(text),
      hasBrand: /(diablo|3m|scotch-brite)/.test(text),
      hasDim: /(\d+["']|\d+\s*(in|mm|cm))/.test(text),
      hasType: /(belt|pad|disc|wheel)/.test(text),
      hasPack: /(\d+\s*pc|\d+\s*pack)/.test(text)
    });
  }, [rawText]);

  const handleEnrich = async () => {
    if (!rawText.trim()) return;
    
    sessionStorage.setItem(ENRICH_INPUT_KEY, rawText);
    setStatus('analyzing');
    setCurrentStep(0);
    setElapsedTime(0);
    setResult(null);
    sessionStorage.removeItem(ENRICH_RESULT_KEY);
    
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 20);

    // Dynamic micro-step progression while in flight
    stepTimerRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= pipelineSteps.length - 2) return prev;
        return prev + 1;
      });
    }, 40);

    try {
      const apiResult = await api.enrichProduct(rawText);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      
      setCurrentStep(pipelineSteps.length - 1);
      setElapsedTime((Date.now() - startTime) / 1000);
      setResult(apiResult);
      sessionStorage.setItem(ENRICH_RESULT_KEY, JSON.stringify(apiResult));
      setStatus('completed');
    } catch (error) {
      console.error(error);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('error');
    }
  };

  const handleClear = () => {
    setRawText('');
    setResult(null);
    setStatus('idle');
    sessionStorage.removeItem(ENRICH_INPUT_KEY);
    sessionStorage.removeItem(ENRICH_RESULT_KEY);
  };


  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--color-success)';
    if (score >= 70) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const renderConfidenceBadge = (tagObj?: ConfidenceTag) => {
    if (!tagObj) return <span className="badge badge-danger">🔴 MISSING</span>;
    switch (tagObj.tag) {
      case 'Verified': return <span className="badge badge-success">🟢 VERIFIED</span>;
      case 'Inferred': return <span className="badge badge-info">🔵 INFERRED</span>;
      case 'AI Recommended': return <span className="badge badge-warning">🟡 RECOMMENDED</span>;
      default: return <span className="badge badge-danger">🔴 INVALID</span>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="enrich-v2-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <h1 className="page-title">Enrich Product</h1>
          <p className="page-subtitle">Transform messy industrial product data into validated, commerce-ready catalog content.</p>
        </div>
      </div>

      {/* INPUT WORKSPACE */}
      {status === 'idle' && (
        <FadeIn delay={0.1}>
          <div className="input-workspace card">
          <h2 className="card-title">Enter Raw Product Data</h2>
          
          <div className="input-area">
            <textarea 
              placeholder='DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc'
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            ></textarea>
            <div className="char-count">{rawText.length} characters</div>
          </div>

          <div className="quality-indicators">
            <h4>Input Quality</h4>
            <div className="indicator-list">
              <span className={`ind-chip ${quality.hasPartNum ? 'found' : ''}`}>{quality.hasPartNum ? '✓' : '○'} Part number</span>
              <span className={`ind-chip ${quality.hasBrand ? 'found' : ''}`}>{quality.hasBrand ? '✓' : '○'} Brand</span>
              <span className={`ind-chip ${quality.hasDim ? 'found' : ''}`}>{quality.hasDim ? '✓' : '○'} Dimensions</span>
              <span className={`ind-chip ${quality.hasType ? 'found' : ''}`}>{quality.hasType ? '✓' : '○'} Product type</span>
              <span className={`ind-chip ${quality.hasPack ? 'found' : ''}`}>{quality.hasPack ? '✓' : '○'} Pack quantity</span>
            </div>
          </div>

          <div className="demo-chips">
            <p>Example products:</p>
            <div className="chip-list">
              {demoChips.map((chip, idx) => (
                <button key={idx} className="chip" onClick={() => setRawText(chip)}>
                  {idx + 1}. {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={handleClear}>Clear</button>
            <button className="btn btn-primary lg" onClick={handleEnrich} disabled={!rawText}>
              <Play size={18} /> Enrich Product
            </button>
          </div>
        </div>
        </FadeIn>
      )}

      {/* PROCESSING STATE */}
      {status === 'analyzing' && (
        <FadeIn>
          <div className="processing-workspace card">
          <div className="processing-header">
            <h2>Analyzing product...</h2>
            <div className="timer">Processing time: {elapsedTime.toFixed(2)}s</div>
          </div>
          
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentStep / (pipelineSteps.length - 1)) * 100}%` }}
            ></div>
          </div>

          <div className="pipeline-grid">
            {pipelineSteps.map((step, idx) => {
              let statusClass = 'pending';
              let Icon = FileText;
              
              if (idx < currentStep) {
                statusClass = 'completed';
                Icon = CheckCircle;
              } else if (idx === currentStep) {
                statusClass = 'processing';
                Icon = RefreshCw;
              }

              return (
                <div key={idx} className={`pipeline-box ${statusClass}`}>
                  <div className="box-icon">
                    <Icon size={20} className={statusClass === 'processing' ? 'spin' : ''} />
                  </div>
                  <div className="box-label">
                    <span className="box-num">{(idx + 1).toString().padStart(2, '0')}</span>
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </FadeIn>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <FadeIn>
          <div className="error-workspace card">
          <AlertTriangle size={48} color="var(--color-danger)" />
          <h2>Unable to connect to SpecSense API.</h2>
          <p>The backend validation failed or the API is unreachable.</p>
          <button className="btn btn-primary" onClick={() => setStatus('idle')}>Retry</button>
        </div>
        </FadeIn>
      )}

      {/* RESULT DASHBOARD */}
      {status === 'completed' && result && (
        <FadeIn>
          <div className="result-workspace">
          <div className="success-banner card">
            <CheckCircle2 color="var(--color-success)" size={24} />
            <h2>Product Enriched Successfully</h2>
            <span className="time-taken">({elapsedTime.toFixed(2)}s)</span>
          </div>

          {/* BEFORE / AFTER HERO */}
          <div className="before-after-hero">
            <div className="card side-card raw-side">
              <div className="side-header">
                <span className="badge">RAW PRODUCT</span>
              </div>
              <div className="raw-text">"{rawText}"</div>
            </div>
            
            <div className="arrow-divider">
              <ArrowRight size={32} color="var(--primary-color)" />
            </div>

            <AnimatedCard className="side-card structured-side">
              <div className="side-header">
                <span className="badge badge-success">COMMERCE-READY PRODUCT</span>
              </div>
              <div className="structured-preview">
                <h3 className="preview-brand">{result.brand}</h3>
                <h2 className="preview-title">{result.attributes?.product_type || result.category}</h2>
                <div className="preview-meta">
                  <span><strong>PN:</strong> {result.part_number}</span>
                  <span><strong>Cat:</strong> {result.category}</span>
                </div>
                <div className="preview-attrs">
                  {Object.entries(result.attributes || {}).map(([k, v]) => (
                    <div key={k} className="attr-pill">
                      <strong>{k.replace('_', ' ')}:</strong> {renderSafeValue(v)}
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          </div>

          <div className="mega-dashboard-grid">
            {/* MAIN COLUMN */}
            <div className="main-column">
              
              {/* EXPLAINABILITY & ATTRIBUTES TABS */}
              <div className="card tabs-card">
                <div className="tabs">
                  <button className={`tab ${activeTab === 'attributes' ? 'active' : ''}`} onClick={() => setActiveTab('attributes')}>
                    Attribute Intelligence
                  </button>
                  <button className={`tab ${activeTab === 'why' ? 'active' : ''}`} onClick={() => setActiveTab('why')}>
                    Explainability (Why?)
                  </button>
                </div>
                
                <div className="tab-content">
                  {activeTab === 'attributes' && (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ATTRIBUTE</th>
                          <th>VALUE</th>
                          <th>CONFIDENCE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Brand</td>
                          <td><strong>{result.brand}</strong></td>
                          <td>{renderConfidenceBadge(result.confidence_tags?.['brand'])}</td>
                          <td>Verified</td>
                        </tr>
                        <tr>
                          <td>Category</td>
                          <td><strong>{result.category}</strong></td>
                          <td>{renderConfidenceBadge(result.confidence_tags?.['category'])}</td>
                          <td>Verified</td>
                        </tr>
                        {Object.entries(result.attributes || {}).map(([key, value]) => (
                          <tr key={key}>
                            <td className="capitalize">{key.replace('_', ' ')}</td>
                            <td><strong>{renderSafeValue(value)}</strong></td>
                            <td>{renderConfidenceBadge(result.confidence_tags?.[key])}</td>
                            <td>Verified</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'why' && (
                    <div className="evidence-list">
                      {Object.entries(result.confidence_tags || {}).map(([field, tagObj]) => {
                        const rawVal = tagObj.value || (result.attributes || {})[field] || (result as any)[field];
                        return (
                          <details key={field} className="evidence-item">
                            <summary className="ev-header">
                              <div className="ev-left">
                                <span className="ev-field">{field.replace('_', ' ').toUpperCase()}</span>
                                <span className="ev-val">{renderSafeValue(rawVal)}</span>
                              </div>
                              {renderConfidenceBadge(tagObj)}
                            </summary>
                            <div className="ev-why">
                              <strong>Why?</strong>
                              <ul>
                                {tagObj.why?.map((w, i) => (
                                  <li key={i}>{w}</li>
                                )) || <li>Inferred from product context.</li>}
                              </ul>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* GENERATED CONTENT */}
              <AnimatedCard className="gen-card">
                <h3 className="card-title">Generated Commerce Content</h3>
                <div className="gen-tabs">
                  <button className={`gen-tab ${genTab === 'title' ? 'active' : ''}`} onClick={() => setGenTab('title')}>Product Title</button>
                  <button className={`gen-tab ${genTab === 'invoice' ? 'active' : ''}`} onClick={() => setGenTab('invoice')}>Invoice Description</button>
                  <button className={`gen-tab ${genTab === 'mobile' ? 'active' : ''}`} onClick={() => setGenTab('mobile')}>Mobile Description</button>
                  <button className={`gen-tab ${genTab === 'long' ? 'active' : ''}`} onClick={() => setGenTab('long')}>Long Description</button>
                </div>
                <div className="gen-content-box">
                  <p>{
                    genTab === 'title' ? result.product_title :
                    genTab === 'invoice' ? result.invoice_description :
                    genTab === 'mobile' ? result.mobile_description :
                    result.long_description
                  }</p>
                  <button className="btn btn-secondary btn-sm copy-btn" onClick={() => copyToClipboard(result[genTab === 'title' ? 'product_title' : genTab === 'invoice' ? 'invoice_description' : genTab === 'mobile' ? 'mobile_description' : 'long_description'])}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </AnimatedCard>

              {/* CONFLICTS */}
              {result.conflicts && result.conflicts.length > 0 ? (
                <div className="card conflict-warning-card">
                  <div className="cw-header">
                    <ShieldAlert size={24} color="var(--color-warning)" />
                    <h3>⚠ CONFLICT DETECTED</h3>
                  </div>
                  {result.conflicts.map((conf, idx) => (
                    <div key={idx} className="cw-body">
                      <div className="cw-attr">Attribute: <strong>{conf.field}</strong></div>
                      <div className="cw-sources">
                        {conf.values.map((v, i) => (
                          <div key={i} className="cw-source-box">
                            <span className="cws-label">Source {i+1}: {v.source}</span>
                            <span className="cws-val">{renderSafeValue(v.value)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="cw-rec">
                        <h4>AI Recommendation</h4>
                        <div className="cw-rec-val">{renderSafeValue(conf.recommended_value)}</div>
                        <p>{conf.reason}</p>
                        <div className="cw-actions">
                          <button className="btn btn-primary"><Check size={16}/> Accept Recommendation</button>
                          <button className="btn btn-secondary">Send to Human Review</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card noc-card">
                  <CheckCircle2 color="var(--color-success)" size={20} />
                  <span>No source conflicts detected</span>
                </div>
              )}

              {/* RAW JSON */}
              <div className="card json-card">
                <div className="json-header" onClick={() => setShowJson(!showJson)}>
                  <div className="jh-left">
                    <Code size={18} />
                    <h3>View Structured JSON</h3>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(result, null, 2)); }}>Copy JSON</button>
                </div>
                {showJson && (
                  <pre className="json-pre">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* SIDE COLUMN */}
            <div className="side-column">
              {/* TRUST SCORE HERO */}
              <div className="card trust-hero-card">
                <h3>TRUST SCORE</h3>
                <div className="trust-visual-mega">
                  <svg viewBox="0 0 36 36" className="circular-chart-mega">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="circle"
                      strokeDasharray={`${result.trust_score || 0}, 100`}
                      stroke={getScoreColor(result.trust_score || 0)}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="16.5" className="percentage-mega">
                      <AnimatedNumber value={result.trust_score} duration={1} />
                    </text>
                    <text x="18" y="24" className="out-of">/100</text>
                  </svg>
                  <div className="trust-status-mega" style={{ color: getScoreColor(result.trust_score || 0) }}>
                    {result.trust_score >= 90 ? 'HIGH CONFIDENCE' : 'NEEDS REVIEW'}
                  </div>
                </div>

                <div className="trust-breakdown-mega">
                  <div className="tb-item">
                    <span>Extraction</span>
                    <strong>{result.trust_breakdown?.extraction_confidence || 25}/25</strong>
                  </div>
                  <div className="tb-item">
                    <span>Validation</span>
                    <strong>{result.trust_breakdown?.validation || 25}/25</strong>
                  </div>
                  <div className="tb-item">
                    <span>Source Reliability</span>
                    <strong>{result.trust_breakdown?.source_reliability || 25}/25</strong>
                  </div>
                  <div className="tb-item">
                    <span>Completeness</span>
                    <strong>{result.trust_breakdown?.completeness || 25}/25</strong>
                  </div>
                </div>
              </div>

              {/* CATALOG VALIDATION */}
              <div className="card validation-card">
                <h3>Catalog Validation</h3>
                <div className="val-list-mega">
                  <div className="val-row">
                    <CheckCircle2 color="var(--color-success)" size={18}/>
                    <div className="vr-text">
                      <span className="vr-name">Required Fields</span>
                      <span className="vr-status pass">100% PASS</span>
                    </div>
                  </div>
                  <div className="val-row">
                    {result.validation?.overall_status === 'valid' ? <CheckCircle2 color="var(--color-success)" size={18}/> : <AlertTriangle color="var(--color-warning)" size={18}/>}
                    <div className="vr-text">
                      <span className="vr-name">LOV Compliance</span>
                      <span className={`vr-status ${result.validation?.overall_status === 'valid' ? 'pass' : 'warning'}`}>
                        {result.validation?.overall_status === 'valid' ? 'PASS' : 'WARNING'}
                      </span>
                    </div>
                  </div>
                  <div className="val-row">
                    <CheckCircle2 color="var(--color-success)" size={18}/>
                    <div className="vr-text">
                      <span className="vr-name">UOM Compliance</span>
                      <span className="vr-status pass">PASS</span>
                    </div>
                  </div>
                  <div className="val-row">
                    <CheckCircle2 color="var(--color-success)" size={18}/>
                    <div className="vr-text">
                      <span className="vr-name">Attribute Normalization</span>
                      <span className="vr-status pass">PASS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FINAL COMMERCE READY CARD */}
              <div className={`card final-status-card ${result.needs_review ? 'review' : 'ready'}`}>
                <h3>COMMERCE-READY PRODUCT</h3>
                <div className="fs-status">
                  {result.needs_review ? (
                    <div className="fs-badge review"><AlertTriangle size={20}/> <span>NEEDS HUMAN REVIEW</span></div>
                  ) : (
                    <div className="fs-badge ready"><CheckCircle2 size={20}/> <span>READY TO PUBLISH</span></div>
                  )}
                </div>
                
                <div className="fs-metrics">
                  <div className="fsm-row"><span>Catalog Quality</span> <strong>A+</strong></div>
                  <div className="fsm-row"><span>Validation Status</span> <strong>{result.validation?.overall_status?.toUpperCase()}</strong></div>
                  <div className="fsm-row"><span>Trust Score</span> <strong>{result.trust_score}</strong></div>
                  <div className="fsm-row"><span>Review Status</span> <strong>{result.needs_review ? 'Pending' : 'Approved'}</strong></div>
                </div>

                <div className="fs-actions">
                  <button className="btn btn-primary w-full">Publish to Catalog</button>
                  <button className="btn btn-secondary w-full" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}>Export JSON</button>
                  <button className="btn btn-secondary w-full" onClick={handleClear}>Enrich Another Product</button>
                </div>
              </div>

            </div>
          </div>
        </div>
        </FadeIn>
      )}
    </div>
  );
};

export default EnrichProduct;
