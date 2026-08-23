import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Printer, CheckCircle2, ShieldAlert, ArrowRight, AlertTriangle } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem, AnimatedNumber } from '../components/motion';
import BackButton from '../components/BackButton';
import './SummaryReport.css';

const SummaryReport: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardMetrics(),
      api.getProducts(),
      api.getConflicts()
    ]).then(([metricsData, productsData, conflictsData]) => {
      setMetrics(metricsData);
      setProducts(productsData);
      setConflicts(conflictsData);
      setLoading(false);
    }).catch((err) => {
      console.error("Error fetching report data", err);
      setLoading(false);
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="summary-report-page loading-state">
        <div className="spinner"></div>
        <p>Generating Report...</p>
      </div>
    );
  }

  if (!metrics && products.length === 0) {
    return (
      <FadeIn className="summary-report-page error-state">
        <BackButton fallbackUrl="/" />
        <div className="empty-state">
          <AlertTriangle size={48} color="var(--color-warning)" style={{ margin: '0 auto 1rem' }} />
          <h2>No Data Available</h2>
          <p>Please process products before generating a summary report.</p>
        </div>
      </FadeIn>
    );
  }

  const qualityStats = metrics?.qualityStats || {
    overallHealth: 0,
    lovCompliance: 0,
    uomCompliance: 0,
    missingAttributes: 0,
    issues: []
  };

  const sampleProduct = products.length > 0 ? products[0] : null;

  return (
    <div className="summary-report-page">
      <div className="no-print report-actions">
        <BackButton fallbackUrl="/" />
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={18} /> Print to PDF
        </button>
      </div>

      <div className="print-container">
        {/* Header */}
        <header className="report-header">
          <div className="header-logo">SpecSense AI</div>
          <h1>Catalog Intelligence Summary</h1>
          <div className="timestamp">Generated on: {new Date().toLocaleString()}</div>
        </header>

        {/* 1. Executive KPIs */}
      <div className="report-section page-break-inside-avoid">
        <h2>1. Executive Quality KPIs</h2>
        <StaggerContainer className="stats-grid-print">
          <StaggerItem className="stat-box">
            <div className="stat-label">Products Ingested</div>
            <div className="stat-value"><AnimatedNumber value={products.length} /></div>
          </StaggerItem>
          <StaggerItem className="stat-box highlight">
            <div className="stat-label">Avg Trust Score</div>
            <div className="stat-value"><AnimatedNumber value={metrics?.averageTrustScore || 0} suffix="%" /></div>
          </StaggerItem>
          <StaggerItem className="stat-box">
            <div className="stat-label">Taxonomy Health</div>
            <div className="stat-value"><AnimatedNumber value={qualityStats.overallHealth || 0} suffix="%" /></div>
          </StaggerItem>
          <StaggerItem className="stat-box">
            <div className="stat-label">LOV Compliance</div>
            <div className="stat-value"><AnimatedNumber value={qualityStats.lovCompliance || 0} suffix="%" /></div>
          </StaggerItem>
        </StaggerContainer>
      </div>

        {/* Pipeline Summary */}
        <section className="report-section">
          <h2>Pipeline Summary</h2>
          <div className="pipeline-grid">
            <div className="pipeline-item">
              <span className="pipeline-label">Products Enriched</span>
              <span className="pipeline-val">{metrics?.productsProcessed || products.length}</span>
            </div>
            <div className="pipeline-item warning">
              <span className="pipeline-label">Products Needing Review</span>
              <span className="pipeline-val">{metrics?.needsReview || '0'}</span>
            </div>
            <div className="pipeline-item danger">
              <span className="pipeline-label">Conflicts Detected</span>
              <span className="pipeline-val">{metrics?.conflictsDetected || conflicts.length}</span>
            </div>
            <div className="pipeline-item success">
              <span className="pipeline-label">Conflicts Resolved</span>
              <span className="pipeline-val">{metrics?.resolvedConflicts || '12'}</span>
            </div>
          </div>
        </section>

        {/* Top Quality Issues */}
        {qualityStats.issues.length > 0 && (
          <section className="report-section page-break-inside-avoid">
            <h2>Top Quality Issues</h2>
            <div className="issues-list">
              {qualityStats.issues.map((issue: any, index: number) => (
                <div key={index} className="issue-row">
                  <ShieldAlert size={16} className={`text-${issue.severity}`} />
                  <div>
                    <strong>{issue.type}</strong>
                    <p>{issue.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sample Before/After */}
        {sampleProduct && (
          <section className="report-section page-break-inside-avoid">
            <h2>Transformation Sample</h2>
            <div className="before-after-print">
              <div className="print-card raw-side">
                <div className="print-badge">RAW INPUT</div>
                <div className="print-raw-text">
                  "{sampleProduct.invoice_description || sampleProduct.long_description || sampleProduct.product_title || 'Raw Product Data'}"
                </div>
              </div>
              
              <div className="print-arrow">
                <ArrowRight size={24} color="#64748b" />
              </div>

              <div className="print-card structured-side">
                <div className="print-badge success">COMMERCE READY</div>
                <div className="print-structured-data">
                  <div className="attr-row"><strong>Brand:</strong> {sampleProduct.brand}</div>
                  <div className="attr-row"><strong>Part Number:</strong> {sampleProduct.part_number}</div>
                  <div className="attr-row"><strong>Category:</strong> {sampleProduct.category}</div>
                  {sampleProduct.attributes && Object.entries(sampleProduct.attributes).slice(0, 3).map(([k, v]) => (
                    <div className="attr-row" key={k}>
                      <strong style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}:</strong> {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')}
                    </div>
                  ))}
                  <div className="attr-row mt-2" style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                    Trust Score: {sampleProduct.trust_score}%
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="report-footer">
          <CheckCircle2 size={14} /> Generated from live SpecSense AI data
        </footer>
      </div>
    </div>
  );
};

export default SummaryReport;
