import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AlertTriangle, Check, Edit2, XCircle, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '../components/motion';
import { CardSkeleton } from '../components/SkeletonLoader';
import BackButton from '../components/BackButton';
import './ReviewQueue.css';

const ReviewQueue: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    api.getReviews()
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching reviews:', err);
        setReviews([]);
        setLoading(false);
      });
  }, []);

  const handleAction = async (id: string, action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviews(prev => prev.filter(r => r.product_id !== id));
    try {
      await api.updateReview(id, action);
    } catch (err) {
      console.error('Error updating review status:', err);
    }
  };

  // Pagination calculation
  const totalItems = reviews.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReviews = reviews.slice(startIndex, startIndex + pageSize);

  return (
    <div className="review-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <div className="flex items-center gap-2">
            <h1 className="page-title">Human-in-the-Loop Review Queue</h1>
            {!loading && (
              <span className="badge badge-warning">{reviews.length} pending</span>
            )}
          </div>
          <p className="page-subtitle">Review items flagged by the 85-point trust threshold or schema validation rules.</p>
        </div>
      </div>

      <div className="review-list">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        ) : reviews.length === 0 ? (
          <FadeIn>
            <div className="empty-state card">
              <ShieldCheck size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3>Review Queue Clear</h3>
              <p>All catalog items satisfy validation compliance and exceed the 85-point confidence threshold.</p>
            </div>
          </FadeIn>
        ) : (
          <>
            <AnimatePresence>
              {paginatedReviews.map(review => (
                <motion.div 
                  key={review.product_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, x: -15 }}
                  layout
                  className="card review-card"
                  style={{ borderLeft: `4px solid ${review.priority === 'High' ? 'var(--color-danger)' : 'var(--color-warning)'}` }}
                >
                  <div className="review-header">
                    <div className="review-title">
                      <span>{review.product_name || 'Industrial Catalog Item'}</span>
                      <span className="review-pn">{review.part_number}</span>
                    </div>
                    <span className={`badge ${review.priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                      {review.priority || 'Standard'} Priority
                    </span>
                  </div>
                  
                  <div className="review-grid">
                    <div className="review-box">
                      <div className="review-box-label">Trigger Reason</div>
                      <div className="review-box-value danger">
                        <AlertTriangle size={15}/> 
                        <span>{review.reasons?.[0] || 'Trust score below 85 threshold'}</span>
                      </div>
                    </div>
                    <div className="review-box">
                      <div className="review-box-label">Recommendation</div>
                      <div className="review-box-value">
                        <span>{review.ai_recommendation || 'Standardize attribute format'}</span>
                      </div>
                    </div>
                    <div className="review-box">
                      <div className="review-box-label">Timestamp</div>
                      <div className="review-box-value text-muted" style={{ fontSize: '0.8125rem' }}>
                        {new Date(review.timestamp || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="review-actions">
                    <button className="btn btn-secondary btn-reject" onClick={(e) => handleAction(review.product_id, 'rejected', e)}>
                      <XCircle size={15}/> Reject
                    </button>
                    <button className="btn btn-secondary" onClick={(e) => handleAction(review.product_id, 'edited', e)}>
                      <Edit2 size={15}/> Manual Override
                    </button>
                    <button className="btn btn-primary" onClick={(e) => handleAction(review.product_id, 'accepted', e)}>
                      <Check size={15}/> Accept AI Solution
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {totalItems > pageSize && (
              <div className="table-pagination card" style={{ padding: '0.875rem 1.25rem', marginTop: '0.5rem' }}>
                <div className="pagination-info">
                  Showing <strong className="text-primary">{startIndex + 1}</strong> to <strong className="text-primary">{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems.toLocaleString()}</strong> items
                </div>

                <div className="pagination-controls">
                  <div className="page-size-selector">
                    <span>Rows:</span>
                    <select 
                      className="page-size-select"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <span style={{ margin: '0 0.5rem', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewQueue;
