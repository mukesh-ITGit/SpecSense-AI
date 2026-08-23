import React, { useState } from 'react';
import type { BatchJobItem } from '../../types';
import { Search, AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BatchResultTableProps {
  items: BatchJobItem[];
}

const BatchResultTable: React.FC<BatchResultTableProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high' | 'review' | 'conflicts' | 'errors'>('all');
  const navigate = useNavigate();
  const location = useLocation();

  const filteredItems = items.filter(item => {
    // Failed API calls
    if (item.status === 'failed') {
      return filter === 'all' || filter === 'errors';
    }
    
    // Success but we need to check properties
    if (!item.result) return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = item.result.product_title?.toLowerCase().includes(term);
      const matchBrand = item.result.brand?.toLowerCase().includes(term);
      const matchSKU = item.result.part_number?.toLowerCase().includes(term);
      const matchCategory = item.result.category?.toLowerCase().includes(term);
      
      if (!matchName && !matchBrand && !matchSKU && !matchCategory) return false;
    }

    // Category filter
    switch (filter) {
      case 'high': return item.result.trust_score >= 90;
      case 'review': return item.result.needs_review || item.result.trust_score < 75;
      case 'conflicts': return item.result.conflicts && item.result.conflicts.length > 0;
      case 'errors': return item.result.validation?.overall_status === 'invalid';
      default: return true;
    }
  });

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'text-success font-bold';
    if (score >= 75) return 'text-warning font-bold';
    return 'text-danger font-bold';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="card result-table-card mt-4">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by product, SKU, brand..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'high' ? 'active' : ''}`} onClick={() => setFilter('high')}>High Confidence</button>
          <button className={`filter-btn ${filter === 'review' ? 'active' : ''}`} onClick={() => setFilter('review')}>Review Required</button>
          <button className={`filter-btn ${filter === 'conflicts' ? 'active' : ''}`} onClick={() => setFilter('conflicts')}>Conflicts</button>
          <button className={`filter-btn ${filter === 'errors' ? 'active' : ''}`} onClick={() => setFilter('errors')}>Errors</button>
        </div>
      </div>

      <div className="table-responsive mt-4">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Part Number</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Trust Score</th>
              <th>Validation</th>
              <th>Conflicts</th>
              <th>Action</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
            {filteredItems.map((item, idx) => {
              if (item.status === 'failed' || !item.result) {
                return (
                  <motion.tr key={idx} variants={rowVariants} className="row-error">
                    <td colSpan={7}>
                      <div className="flex items-center text-danger">
                        <XCircle size={16} className="mr-2" />
                        Processing Failed: {item.error || 'Unknown error'}
                      </div>
                    </td>
                    <td><button className="btn btn-secondary btn-sm">Retry</button></td>
                  </motion.tr>
                );
              }

              const res = item.result;
              const hasConflict = res.conflicts && res.conflicts.length > 0;
              const isInvalid = res.validation?.overall_status === 'invalid';

              return (
                <motion.tr key={idx} variants={rowVariants} onClick={() => navigate(`/products/${res.product_id}`, { state: { from: location.pathname + location.search } })} className="cursor-pointer hover-row">
                  <td className="truncate-cell font-medium" title={res.product_title || res.long_description}>{res.product_title || 'Unknown Product'}</td>
                  <td>{res.part_number || '-'}</td>
                  <td><span className="badge badge-info">{res.category || 'Unknown'}</span></td>
                  <td>{res.brand || '-'}</td>
                  <td className={getScoreClass(res.trust_score)}>{res.trust_score}</td>
                  <td>
                    {isInvalid ? (
                      <span className="text-danger flex items-center gap-1"><XCircle size={14}/> Failed</span>
                    ) : (
                      <span className="text-success flex items-center gap-1"><CheckCircle2 size={14}/> Valid</span>
                    )}
                  </td>
                  <td>
                    {hasConflict ? (
                      <button 
                        className="badge badge-warning cursor-pointer border-0" 
                        onClick={(e) => { e.stopPropagation(); navigate('/conflicts', { state: { from: location.pathname + location.search } }); }}
                      >
                        <AlertTriangle size={12} /> {res.conflicts.length}
                      </button>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    {res.needs_review ? (
                      <button className="btn btn-primary btn-sm">Review</button>
                    ) : (
                      <button className="btn-icon text-primary"><ChevronRight size={18}/></button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
            
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted">
                  No records found matching your filters.
                </td>
              </tr>
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
};

export default BatchResultTable;
