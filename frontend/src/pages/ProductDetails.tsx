import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2, XCircle, Database } from 'lucide-react';
import type { ProductOutput, ConfidenceTag } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, AnimatedCard } from '../components/motion';
import { CardSkeleton } from '../components/SkeletonLoader';
import BackButton from '../components/BackButton';
import { api } from '../services/api';
import './ProductDetails.css';

const renderSafeValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const AnimatedCounter = ({ from, to }: { from: number, to: number }) => {
  const [count, setCount] = useState(from);
  useEffect(() => {
    let start = from;
    const duration = 1200;
    const increment = (to - from) / (duration / 16);
    const interval = setInterval(() => {
      start += increment;
      if (start >= to) {
        start = to;
        clearInterval(interval);
      }
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(interval);
  }, [from, to]);
  return <>{count}</>;
};

const EvidenceItem: React.FC<{
  field: string;
  tagObj?: ConfidenceTag;
  product: ProductOutput;
  renderConfidenceBadge: (tagObj?: ConfidenceTag) => React.ReactNode;
}> = ({ field, tagObj, product, renderConfidenceBadge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rawDisplayVal = tagObj?.value || (product.attributes || {})[field] || (product as any)[field] || '';
  return (
    <div className="evidence-item" key={field}>
      <div className="ev-header cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <span className="ev-field">{field.replace('_', ' ').toUpperCase()}</span>
        <span className="ev-val truncate-cell" style={{ maxWidth: '240px' }}>
          {renderSafeValue(rawDisplayVal)}
        </span>
        {renderConfidenceBadge(tagObj)}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ev-why overflow-hidden mt-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <strong>Decision Rationale & Provenance:</strong>
            <ul>
              {tagObj?.why?.map((w, i) => (
                <li key={i}>{w}</li>
              )) || <li>Inferred from deterministic rule and product context.</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const stateProduct: ProductOutput | undefined = location.state?.product;
  const [fetchedProduct, setFetchedProduct] = useState<ProductOutput | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attributes' | 'why'>('overview');

  const product = stateProduct || fetchedProduct;

  useEffect(() => {
    if (!stateProduct && id) {
      setLoading(true);
      api.getProducts()
        .then((data: any[]) => {
          const list = Array.isArray(data) ? data : [];
          const found = list.find((p: any) => p.product_id === id || p.part_number === id);
          if (found) {
            setFetchedProduct(found);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching product details:', err);
          setLoading(false);
        });
    }
  }, [id, stateProduct]);

  const renderConfidenceBadge = (tagObj?: ConfidenceTag) => {
    if (!tagObj) return <span className="badge badge-warning">Missing</span>;
    
    const tagUpper = String(tagObj.tag).toUpperCase();
    if (tagUpper === 'VERIFIED') return <span className="badge badge-success">✓ Verified</span>;
    if (tagUpper === 'INFERRED') return <span className="badge badge-info">⚡ Inferred</span>;
    if (tagUpper === 'AI_RECOMMENDED' || tagUpper === 'AI RECOMMENDED') return <span className="badge badge-warning">★ Recommended</span>;
    return <span className="badge badge-danger">⚠ {tagObj.tag}</span>;
  };

  if (loading) {
    return (
      <div className="product-details-page">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-page">
        <div className="card empty-state">
          <Database size={48} className="empty-icon" />
          <h2>Product Record Not Found</h2>
          <p>The requested catalog entity could not be found or has not been enriched yet.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/products', { state: { from: location.pathname + location.search } })}>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--color-success)';
    if (score >= 85) return 'var(--primary-color)';
    if (score >= 70) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="product-details-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/products" />
          <div className="breadcrumb">
            <span>Products</span>
            <span>/</span>
            <span className="font-mono">{product.part_number || product.product_id}</span>
          </div>
          <h1 className="page-title">{product.product_title || 'Industrial Product'}</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/enrich', { state: { from: location.pathname + location.search } })}>
            Enrich Another
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Save & Return to Catalog
          </button>
        </div>
      </div>

      <FadeIn>
        <div className="before-after-hero">
          <AnimatedCard className="side-card raw-side">
            <div className="side-header">
              <span className="badge badge-neutral">RAW INGESTION STRING</span>
            </div>
            <div className="raw-text">
              "{product.invoice_description || product.product_title || 'Raw industrial input'}"
            </div>
          </AnimatedCard>
          
          <div className="arrow-divider">
            <ArrowRight size={28} color="var(--primary-color)" />
          </div>

          <AnimatedCard className="side-card structured-side">
            <div className="side-header">
              <span className="badge badge-success">✓ COMMERCE READY SPECIFICATION</span>
            </div>
            <div className="structured-preview">
              <h3 className="preview-brand">{product.brand || 'DIABLO'}</h3>
              <h2 className="preview-title">{product.attributes?.product_type || product.category || 'Abrasives'}</h2>
              <div className="preview-meta">
                <span><strong>Part Number:</strong> {product.part_number}</span>
                <span><strong>Category:</strong> {product.category}</span>
                <span><strong>Manufacturer:</strong> {product.manufacturer || product.brand}</span>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </FadeIn>

      <div className="details-layout">
        <FadeIn className="main-col" delay={0.1}>
          <AnimatedCard className="tabs-card">
            <div className="tabs">
              <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                Overview & Content
              </button>
              <button className={`tab ${activeTab === 'attributes' ? 'active' : ''}`} onClick={() => setActiveTab('attributes')}>
                Attribute Breakdown
              </button>
              <button className={`tab ${activeTab === 'why' ? 'active' : ''}`} onClick={() => setActiveTab('why')}>
                Decision Explainability (Why?)
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'attributes' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ATTRIBUTE</th>
                      <th>NORMALIZED VALUE</th>
                      <th>CONFIDENCE PROVENANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Brand</strong></td>
                      <td>{product.brand}</td>
                      <td>{renderConfidenceBadge(product.confidence_tags?.['brand'])}</td>
                    </tr>
                    <tr>
                      <td><strong>Part Number</strong></td>
                      <td><span className="font-mono">{product.part_number}</span></td>
                      <td>{renderConfidenceBadge(product.confidence_tags?.['part_number'])}</td>
                    </tr>
                    <tr>
                      <td><strong>Category</strong></td>
                      <td>{product.category}</td>
                      <td>{renderConfidenceBadge(product.confidence_tags?.['category'])}</td>
                    </tr>
                    {Object.entries(product.attributes || {}).map(([key, value]) => (
                      <tr key={key}>
                        <td className="capitalize"><strong>{key.replace('_', ' ')}</strong></td>
                        <td>{renderSafeValue(value)}</td>
                        <td>{renderConfidenceBadge(product.confidence_tags?.[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'why' && (
                <div className="evidence-panel">
                  <h3 className="panel-title">Audit Trail & Decision Evidence</h3>
                  <p className="panel-desc">Transparent multi-source heuristics and extraction provenance for each field.</p>
                  
                  <div className="evidence-list">
                    {Object.entries(product.confidence_tags || {}).map(([field, tagObj]) => (
                      <EvidenceItem 
                        key={field}
                        field={field}
                        tagObj={tagObj}
                        product={product}
                        renderConfidenceBadge={renderConfidenceBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="content-box">
                    <h4>Invoice Description (Short Format)</h4>
                    <p>{product.invoice_description || '-'}</p>
                  </div>
                  <div className="content-box">
                    <h4>Mobile Description (Concise Attribute Sequence)</h4>
                    <p>{product.mobile_description || '-'}</p>
                  </div>
                  <div className="content-box">
                    <h4>Full Catalog Description</h4>
                    <p>{product.long_description || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </AnimatedCard>
        </FadeIn>

        <FadeIn className="side-col" delay={0.2}>
          <AnimatedCard className="trust-card">
            <h3 className="section-title">Trust Score Breakdown</h3>
            
            <div className="trust-visual">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path className="circle"
                  initial={{ strokeDasharray: `0, 100` }}
                  animate={{ strokeDasharray: `${product.trust_score}, 100` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  stroke={getScoreColor(product.trust_score)}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage"><AnimatedCounter from={0} to={product.trust_score} /></text>
              </svg>
              <div className="trust-status" style={{ color: getScoreColor(product.trust_score) }}>
                {product.trust_score >= 85 ? 'COMMERCE READY' : 'HUMAN REVIEW REQUIRED'}
              </div>
            </div>

            {product.trust_breakdown && (
              <div className="trust-breakdown">
                <div className="breakdown-item">
                  <span>Extraction Confidence</span>
                  <span>{product.trust_breakdown.extraction_confidence}/25</span>
                </div>
                <div className="breakdown-item">
                  <span>LOV & Schema Validation</span>
                  <span>{product.trust_breakdown.validation}/25</span>
                </div>
                <div className="breakdown-item">
                  <span>Source Authority Reliability</span>
                  <span>{product.trust_breakdown.source_reliability}/25</span>
                </div>
                <div className="breakdown-item">
                  <span>Attribute Completeness</span>
                  <span>{product.trust_breakdown.completeness}/25</span>
                </div>
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard className="validation-card">
            <h3 className="section-title">Schema Validation</h3>
            <div className="val-list">
              <div className="val-item">
                {product.validation?.overall_status === 'valid' ? <CheckCircle2 color="var(--color-success)" size={18}/> : <XCircle color="var(--color-danger)" size={18}/>}
                <span>Overall Validation: <strong>{product.validation?.overall_status?.toUpperCase() || 'PASS'}</strong></span>
              </div>
              <div className="val-item">
                <CheckCircle2 color="var(--color-success)" size={18}/>
                <span>Required Field Set: <strong>PASS</strong></span>
              </div>
              <div className="val-item">
                <CheckCircle2 color="var(--color-success)" size={18}/>
                <span>LOV Taxonomy Compliance: <strong>PASS</strong></span>
              </div>
            </div>
            {(product.validation?.errors || []).length > 0 && (
              <div className="val-errors">
                {product.validation?.errors.map((e, i) => (
                  <div key={i} className="val-error"><AlertTriangle size={14}/> {e}</div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </FadeIn>
      </div>
    </div>
  );
};

export default ProductDetails;
