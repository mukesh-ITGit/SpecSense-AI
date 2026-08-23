import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatedCard, AnimatedNumber, FadeIn, StaggerContainer, StaggerItem } from '../components/motion';
import { Skeleton, CardSkeleton } from '../components/SkeletonLoader';
import { Database, Plus, Sparkles, TrendingUp, AlertTriangle, ShieldAlert, FileText } from 'lucide-react';
import './Overview.css';

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardMetrics().then(setMetrics),
      api.getActivities().then(data => setActivities(Array.isArray(data) ? data : []))
    ])
    .catch(err => console.error('Error fetching dashboard data:', err))
    .finally(() => setLoading(false));
  }, []);

  const data = metrics?.trendData || [];
  const distributionData = metrics?.distributionData || [];
  const categoryData = metrics?.categoryData || [];
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalog Intelligence Overview</h1>
          <p className="page-subtitle">Multi-stage AI normalization, trust scoring, and conflict governance across your product catalog.</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/reports/summary', { state: { from: location.pathname + location.search } })}
            disabled={!metrics || metrics.productsProcessed === 0}
            title={!metrics || metrics.productsProcessed === 0 ? "Process products first to generate a report" : ""}
          >
            <FileText size={16} /> Export Summary Report
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/upload', { state: { from: location.pathname + location.search } })}>
            Import Catalog
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/enrich', { state: { from: location.pathname + location.search } })}>
            <Plus size={16} /> Enrich Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="card stat-card">
              <Skeleton height="14px" width="50%" style={{ marginBottom: '0.75rem' }} />
              <Skeleton height="36px" width="70%" />
            </div>
          ))}
        </div>
      ) : (
        <StaggerContainer className="stats-grid">
          <StaggerItem>
            <AnimatedCard className="stat-card">
              <div className="stat-header-row">
                <span className="stat-label">Products Ingested</span>
                <Database size={18} className="text-secondary" />
              </div>
              <div className="stat-value"><AnimatedNumber value={metrics?.productsProcessed || 0} /></div>
              <div className="stat-footer-text">Total processed catalog items</div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card highlight">
              <div className="stat-header-row">
                <span className="stat-label">Average Trust Score</span>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="stat-value text-primary">
                <AnimatedNumber value={metrics?.averageTrustScore || 0} suffix="%" />
              </div>
              <div className="stat-footer-text text-success">
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> 100-pt multi-factor engine
              </div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card warning">
              <div className="stat-header-row">
                <span className="stat-label">Human Review Queue</span>
                <AlertTriangle size={18} className="text-warning" />
              </div>
              <div className="stat-value text-warning">
                <AnimatedNumber value={metrics?.needsReview || 0} />
              </div>
              <div className="stat-footer-text">Flagged (&lt;85 score or rule failures)</div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card danger">
              <div className="stat-header-row">
                <span className="stat-label">Conflicts Detected</span>
                <ShieldAlert size={18} className="text-danger" />
              </div>
              <div className="stat-value text-danger">
                <AnimatedNumber value={metrics?.conflictsDetected || 0} />
              </div>
              <div className="stat-footer-text">ERP vs Distributor discrepancies</div>
            </AnimatedCard>
          </StaggerItem>
        </StaggerContainer>
      )}

      {loading ? (
        <div className="charts-grid mt-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      ) : metrics && metrics.productsProcessed === 0 ? (
        <FadeIn delay={0.2} className="empty-dashboard">
          <Database size={48} strokeWidth={1.5} />
          <h3>No catalog data processed yet</h3>
          <p>Upload your catalog CSV/Excel or start enriching individual products to see real-time AI governance analytics.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
              Import Catalog CSV/Excel
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/enrich')}>
              <Plus size={16} /> Enrich Product
            </button>
          </div>
        </FadeIn>
      ) : (
        <div className="charts-grid">
          <FadeIn delay={0.2}>
            <AnimatedCard className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="card-title">Catalog Quality Score Trend</h3>
                  <p className="card-subtitle">Aggregated AI confidence score progression over time</p>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}} />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                      strokeWidth={2.5}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          </FadeIn>

          <FadeIn delay={0.3}>
            <AnimatedCard className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="card-title">Trust Score Distribution</h3>
                  <p className="card-subtitle">Products bucketed by confidence tier</p>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}} />
                    <Bar 
                      dataKey="count" 
                      fill="#2563eb" 
                      radius={[4, 4, 0, 0]} 
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          </FadeIn>

          <FadeIn delay={0.4}>
            <AnimatedCard className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="card-title">Category Breakdown</h3>
                  <p className="card-subtitle">Distribution across mapped taxonomy categories</p>
                </div>
              </div>
              <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {categoryData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          </FadeIn>
          
          <FadeIn delay={0.5}>
            <AnimatedCard className="chart-card activity-card">
              <div className="chart-header">
                <div>
                  <h3 className="card-title">Recent Pipeline Activity</h3>
                  <p className="card-subtitle">Live audit logs from ingestion & enrichment</p>
                </div>
              </div>
              <StaggerContainer className="activity-list">
                {activities.length > 0 ? activities.slice(0, 5).map(act => (
                  <StaggerItem key={act.id}>
                    <div className="activity-item">
                      <div className={`activity-icon ${act.type}`}></div>
                      <div className="activity-content">
                        <p>{act.message}</p>
                        <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </StaggerItem>
                )) : (
                  <div className="activity-empty text-muted">No recent activity.</div>
                )}
              </StaggerContainer>
            </AnimatedCard>
          </FadeIn>
        </div>
      )}
    </div>
  );
};

export default Overview;
