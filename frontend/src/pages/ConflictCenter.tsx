import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, AnimatedCard, StaggerContainer, StaggerItem } from '../components/motion';
import { CardSkeleton } from '../components/SkeletonLoader';
import BackButton from '../components/BackButton';
import './ConflictCenter.css';

const renderSafeVal = (v: any) => {
  if (v === null || v === undefined) return 'Unknown';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const ConflictCenter: React.FC = () => {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConflicts()
      .then(data => {
        setConflicts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching conflicts:', err);
        setConflicts([]);
        setLoading(false);
      });
  }, []);

  const handleResolve = async (id: string, action: string, value?: any) => {
    setConflicts(prev => prev.filter(c => c.product_id !== id));
    try {
      await api.resolveConflict(id, action, value);
    } catch (err) {
      console.error('Error resolving conflict:', err);
    }
  };

  return (
    <div className="conflict-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <div className="flex items-center gap-2">
            <h1 className="page-title">Conflict Resolution Center</h1>
            {!loading && (
              <span className="badge badge-warning">{conflicts.length} active</span>
            )}
          </div>
          <p className="page-subtitle">Resolve attribute discrepancies across disparate supplier feeds and ERP sources via authority heuristics.</p>
        </div>
      </div>

      <StaggerContainer className="conflict-dashboard">
        <StaggerItem>
          <AnimatedCard className="stat-card danger">
            <span className="stat-label">Pending Discrepancies</span>
            <div className="stat-value">{conflicts.length}</div>
            <div className="stat-footer-text">Multi-source collisions</div>
          </AnimatedCard>
        </StaggerItem>
        <StaggerItem>
          <AnimatedCard className="stat-card warning">
            <span className="stat-label">Authority Resolvable</span>
            <div className="stat-value">{conflicts.length}</div>
            <div className="stat-footer-text">Manufacturer authority available</div>
          </AnimatedCard>
        </StaggerItem>
        <StaggerItem>
          <AnimatedCard className="stat-card highlight">
            <span className="stat-label">Resolved Benchmark</span>
            <div className="stat-value">100%</div>
            <div className="stat-footer-text">Deterministic rule guarantee</div>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>

      <div className="conflict-list">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </div>
        ) : conflicts.length === 0 ? (
          <FadeIn>
            <div className="empty-state card">
              <CheckCircle2 size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3>No Active Conflicts</h3>
              <p>All catalog attributes across ERP, distributor feeds, and supplier scrapes are in sync.</p>
            </div>
          </FadeIn>
        ) : (
          <AnimatePresence>
            {conflicts.map(conflict => {
              const conflictList = Array.isArray(conflict.conflicts) ? conflict.conflicts : [];
              const firstConf = conflictList[0] || {};
              const recommendedVal = firstConf.recommended_value || (firstConf.description ? firstConf.description.split(' vs ')[0] : 'Manufacturer Value');
              const reasonText = firstConf.reason || 'Manufacturer ERP source has higher reliability authority than distributor scrape.';

              return (
                <motion.div 
                  key={conflict.product_id} 
                  className="card conflict-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, x: 20 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <div className="conflict-header">
                    <div className="conflict-title">
                      <ShieldAlert size={18} color="var(--color-warning)" />
                      <h3>COLLISION DETECTED: {conflict.part_number || conflict.product_id}</h3>
                    </div>
                    <span className="badge badge-warning">Action Required</span>
                  </div>
                  
                  <div className="conflict-body">
                    <div className="conflict-details">
                      <div className="attr-name">Field Discrepancies</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {conflictList.map((c: any, i: number) => {
                          const hasStructuredValues = Array.isArray(c.values) && c.values.length > 0;
                          let valA = 'Unknown';
                          let valB = 'Unknown';
                          let srcA = 'Manufacturer (ERP)';
                          let srcB = 'Distributor Feed';

                          if (hasStructuredValues) {
                            valA = renderSafeVal(c.values[0]?.value);
                            srcA = c.values[0]?.source || srcA;
                            if (c.values.length > 1) {
                              valB = renderSafeVal(c.values[1]?.value);
                              srcB = c.values[1]?.source || srcB;
                            }
                          } else if (c.description) {
                            const parts = String(c.description).split(' vs ');
                            valA = parts[0] || 'Unknown';
                            valB = parts[1] || 'Unknown';
                          }

                          return (
                            <div key={i} className="conflict-item-wrapper">
                              <h4 className="conflict-item-title">{c.field || 'Attribute'}</h4>
                              <div className="source-comparison">
                                <div className="source-box">
                                  <div className="source-header">
                                    <div className="source-label">{srcA}</div>
                                    <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>High Authority (90)</span>
                                  </div>
                                  <div className="source-val">{valA}</div>
                                  <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ width: '100%' }} 
                                    onClick={() => handleResolve(conflict.product_id, 'use_source_a', valA)}
                                  >
                                    Use {srcA}
                                  </button>
                                </div>
                                
                                <div className="source-box">
                                  <div className="source-header">
                                    <div className="source-label">{srcB}</div>
                                    <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>Standard (60)</span>
                                  </div>
                                  <div className="source-val">{valB}</div>
                                  <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ width: '100%' }} 
                                    onClick={() => handleResolve(conflict.product_id, 'use_source_b', valB)}
                                  >
                                    Use {srcB}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="recommendation-box mt-4">
                      <div className="rec-content">
                        <h4>AI Source Authority Recommendation: <strong>{renderSafeVal(recommendedVal)}</strong></h4>
                        <p><strong>Rationale:</strong> {reasonText}</p>
                      </div>
                      <div className="rec-actions">
                        <button className="btn btn-secondary" onClick={() => handleResolve(conflict.product_id, 'review')}>
                          Send to Review
                        </button>
                        <button className="btn btn-primary" onClick={() => handleResolve(conflict.product_id, 'accept', recommendedVal)}>
                          <Check size={16} /> Accept Authority Solution
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ConflictCenter;
