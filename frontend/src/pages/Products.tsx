import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Search, Download, ArrowRight, Layers, ChevronDown, Plus, 
  CheckCircle2, Clock, ShieldAlert, AlertTriangle, ListFilter,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '../components/motion';
import { TableRowSkeleton } from '../components/SkeletonLoader';
import './Products.css';

type FilterType = 'all' | 'high_confidence' | 'review_required' | 'conflicts' | 'errors';

const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.getProducts()
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const safeProducts = Array.isArray(products) ? products : [];

  // Precise, real product count calculations based on existing data attributes
  const counts = {
    all: safeProducts.length,
    high_confidence: safeProducts.filter(p => !p.needs_review && (p.trust_score || 0) >= 85).length,
    review_required: safeProducts.filter(p => p.needs_review || (p.trust_score || 0) < 85).length,
    conflicts: safeProducts.filter(p => (Array.isArray(p.conflicts) && p.conflicts.length > 0) || (p.review_reasons && p.review_reasons.some((r: string) => r.toLowerCase().includes('conflict')))).length,
    errors: safeProducts.filter(p => p.validation?.overall_status === 'invalid' || (p.validation?.errors && p.validation.errors.length > 0) || (p.trust_score || 0) < 50).length
  };

  const filteredProducts = safeProducts.filter(p => {
    if (!p) return false;
    const partNumber = p.part_number ? String(p.part_number).toLowerCase() : '';
    const title = p.product_title ? String(p.product_title).toLowerCase() : '';
    const brand = p.brand ? String(p.brand).toLowerCase() : '';
    const category = p.category ? String(p.category).toLowerCase() : '';
    const q = (search || '').toLowerCase();
    const matchesQuery = partNumber.includes(q) || title.includes(q) || brand.includes(q) || category.includes(q);

    if (!matchesQuery) return false;
    if (statusFilter === 'high_confidence') {
      return !p.needs_review && (p.trust_score || 0) >= 85;
    }
    if (statusFilter === 'review_required') {
      return p.needs_review || (p.trust_score || 0) < 85;
    }
    if (statusFilter === 'conflicts') {
      return (Array.isArray(p.conflicts) && p.conflicts.length > 0) || 
             (p.review_reasons && p.review_reasons.some((r: string) => r.toLowerCase().includes('conflict')));
    }
    if (statusFilter === 'errors') {
      return p.validation?.overall_status === 'invalid' || 
             (p.validation?.errors && p.validation.errors.length > 0) || 
             (p.trust_score || 0) < 50;
    }
    return true;
  });

  // Reset page when filter or search changes
  const handleFilterChange = (filter: FilterType) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const handleSearchContainerClick = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Product ID', 'Part Number', 'Brand', 'Category', 'Trust Score', 'Status'].join(','),
      ...filteredProducts.map(p => [
        p.product_id, p.part_number, p.brand, p.category, p.trust_score,
        p.needs_review ? 'Needs Review' : 'Commerce Ready'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'specsense_catalog_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportOpen(false);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredProducts, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "specsense_catalog_export.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
      'Product ID': p.product_id,
      'Part Number': p.part_number,
      'Brand': p.brand,
      'Category': p.category,
      'Trust Score': p.trust_score,
      'Status': p.needs_review ? 'Needs Review' : 'Commerce Ready'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "specsense_catalog_export.xlsx");
    setExportOpen(false);
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Product Catalog</h1>
            {!loading && (
              <span className="badge badge-info">{filteredProducts.length} items</span>
            )}
          </div>
          <p className="page-subtitle">Manage, search, and export all validated and enriched catalog items.</p>
        </div>
        <div className="header-actions">
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setExportOpen(!exportOpen)}>
              <Download size={16} /> Export <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {exportOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="export-dropdown-menu"
                >
                  <div className="dropdown-item" onClick={handleExportCSV}>Export CSV (.csv)</div>
                  <div className="dropdown-item" onClick={handleExportExcel}>Export Excel (.xlsx)</div>
                  <div className="dropdown-item" onClick={handleExportJSON}>Export Structured JSON</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/upload', { state: { from: location.pathname + location.search } })}>
            Import Catalog
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/enrich', { state: { from: location.pathname + location.search } })}>
            <Plus size={16} /> Enrich Product
          </button>
        </div>
      </div>

      <FadeIn delay={0.1}>
        <div className="card table-container">
          <div className="table-toolbar">
            <div className="search-bar" onClick={handleSearchContainerClick}>
              <Search size={18} className="search-icon" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search products, SKU, brand, category..." 
                value={search}
                onChange={handleSearchChange}
                aria-label="Search products"
              />
              <div className="kbd-shortcut" title="Command Palette Shortcut">
                <kbd className="kbd-key">⌘</kbd>
                <kbd className="kbd-key">K</kbd>
              </div>
            </div>

            <div className="table-actions">
              <div className="filter-pill-group" role="tablist" aria-label="Product governance filter">
                <button 
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'all'}
                  className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('all')}
                >
                  <ListFilter size={14} className="filter-icon" />
                  <span className="filter-text">All</span>
                  {!loading && <span className="filter-count">{counts.all}</span>}
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'high_confidence'}
                  className={`filter-pill ${statusFilter === 'high_confidence' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('high_confidence')}
                >
                  <CheckCircle2 size={14} className="filter-icon icon-success" />
                  <span className="filter-text">High Confidence</span>
                  {!loading && <span className="filter-count">{counts.high_confidence}</span>}
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'review_required'}
                  className={`filter-pill ${statusFilter === 'review_required' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('review_required')}
                >
                  <Clock size={14} className="filter-icon icon-warning" />
                  <span className="filter-text">Review Required</span>
                  {!loading && <span className="filter-count">{counts.review_required}</span>}
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'conflicts'}
                  className={`filter-pill ${statusFilter === 'conflicts' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('conflicts')}
                >
                  <ShieldAlert size={14} className="filter-icon icon-conflict" />
                  <span className="filter-text">Conflicts</span>
                  {!loading && <span className="filter-count">{counts.conflicts}</span>}
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === 'errors'}
                  className={`filter-pill ${statusFilter === 'errors' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('errors')}
                >
                  <AlertTriangle size={14} className="filter-icon icon-danger" />
                  <span className="filter-text">Errors</span>
                  {!loading && <span className="filter-count">{counts.errors}</span>}
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}><input type="checkbox" /></th>
                  <th>Product Title</th>
                  <th>Part Number</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Trust Score</th>
                  <th>Governance Status</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={8} />
                  ))}
                </tbody>
              ) : paginatedProducts.length > 0 ? (
                <motion.tbody
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
                  }}
                >
                  {paginatedProducts.map((product, idx) => {
                    const prodId = product.product_id || product.part_number || `prod-${idx}`;
                    const isCommerceReady = !product.needs_review && (product.trust_score || 0) >= 85;

                    return (
                      <motion.tr 
                        key={prodId} 
                        onClick={() => navigate(`/products/${prodId}`, { state: { product, from: location.pathname + location.search } })} 
                        className="clickable-row"
                        variants={{
                          hidden: { opacity: 0, y: 6 },
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                        <td>
                          <div className="product-cell">
                            <div className="product-name">{product.product_title || 'Unknown Product'}</div>
                          </div>
                        </td>
                        <td className="text-secondary font-mono" style={{ fontSize: '0.8125rem' }}>{product.part_number || '-'}</td>
                        <td><span className="badge badge-secondary">{product.brand || 'Unknown'}</span></td>
                        <td className="text-secondary">{product.category || '-'}</td>
                        <td>
                          <div className={`score-pill ${(product.trust_score || 0) >= 90 ? 'score-high' : (product.trust_score || 0) >= 75 ? 'score-medium' : 'score-low'}`}>
                            {product.trust_score || 0}%
                          </div>
                        </td>
                        <td>
                          {product.needs_review ? (
                            <span className="badge badge-warning">Needs Review</span>
                          ) : isCommerceReady ? (
                            <span className="badge badge-success">Commerce Ready</span>
                          ) : (
                            <span className="badge badge-danger">Validation Failed</span>
                          )}
                        </td>
                        <td>
                          <button className="btn-icon" onClick={e => { e.stopPropagation(); navigate(`/products/${prodId}`, { state: { product, from: location.pathname + location.search } }); }}>
                            <ArrowRight size={15} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              ) : null}
            </table>

            {!loading && filteredProducts.length === 0 && (
              <div className="empty-state">
                <Layers size={44} className="empty-icon" />
                <h3>No products found</h3>
                <p>No products match your active search or filter criteria.</p>
                <button className="btn btn-primary mt-4" onClick={() => { setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {!loading && filteredProducts.length > 0 && (
            <div className="table-pagination">
              <div className="pagination-info">
                Showing <strong className="text-primary">{startIndex + 1}</strong> to <strong className="text-primary">{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems.toLocaleString()}</strong> products
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
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
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
        </div>
      </FadeIn>
    </div>
  );
};

export default Products;
