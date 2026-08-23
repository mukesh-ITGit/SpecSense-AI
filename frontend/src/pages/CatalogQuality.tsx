import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Sparkles, Layers } from 'lucide-react';
import { api } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FadeIn, AnimatedCard, AnimatedNumber, StaggerContainer, StaggerItem } from '../components/motion';
import { Skeleton, CardSkeleton } from '../components/SkeletonLoader';
import BackButton from '../components/BackButton';
import './CatalogQuality.css';

const CatalogQuality: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardMetrics()
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching quality metrics:', err);
        setMetrics(null);
        setLoading(false);
      });
  }, []);

  const data = metrics?.trendData || [];
  const qualityStats = metrics?.qualityStats || {
    overallHealth: 0,
    lovCompliance: 0,
    uomCompliance: 0,
    missingAttributes: 0,
    issues: []
  };

  return (
    <div className="quality-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <h1 className="page-title">Catalog Quality & Taxonomy Governance</h1>
          <p className="page-subtitle">Deep audit of taxonomy health, LOV compliance, unit of measure consistency, and missing fields.</p>
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
            <AnimatedCard className="stat-card highlight">
              <div className="stat-header-row">
                <span className="stat-label">Taxonomy Health</span>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="stat-value text-primary">
                <AnimatedNumber value={qualityStats.overallHealth} suffix="%" />
              </div>
              <div className="stat-footer-text">Overall schema adherence</div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card success">
              <div className="stat-header-row">
                <span className="stat-label">LOV Compliance</span>
                <CheckCircle2 size={18} className="text-success" />
              </div>
              <div className="stat-value text-success">
                <AnimatedNumber value={qualityStats.lovCompliance} suffix="%" />
              </div>
              <div className="stat-footer-text">Standardized category terms</div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card">
              <div className="stat-header-row">
                <span className="stat-label">UoM Consistency</span>
                <Layers size={18} className="text-secondary" />
              </div>
              <div className="stat-value">
                <AnimatedNumber value={qualityStats.uomCompliance} suffix="%" />
              </div>
              <div className="stat-footer-text">Standardized inches / mm / pk</div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="stat-card danger">
              <div className="stat-header-row">
                <span className="stat-label">Missing Attributes</span>
                <AlertCircle size={18} className="text-danger" />
              </div>
              <div className="stat-value text-danger">
                <AnimatedNumber value={qualityStats.missingAttributes} />
              </div>
              <div className="stat-footer-text">Missing required dimensions</div>
            </AnimatedCard>
          </StaggerItem>
        </StaggerContainer>
      )}

      {loading ? (
        <div className="charts-grid mt-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      ) : (
        <FadeIn delay={0.2} className="charts-grid mt-4">
          <AnimatedCard className="chart-card">
            <div className="chart-header">
              <h3 className="card-title">Data Completeness & Health Progression</h3>
              <p className="card-subtitle">Daily trend tracking governance rule passing rate</p>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}} />
                  <Area type="monotone" dataKey="score" stroke="#10b981" fillOpacity={1} fill="url(#colorQuality)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
          
          <AnimatedCard className="chart-card issue-card">
            <div className="chart-header">
              <h3 className="card-title">Top Governance Alerts</h3>
              <p className="card-subtitle">Immediate issues requiring taxonomy resolution</p>
            </div>
            <StaggerContainer className="issue-list">
              {qualityStats.issues.length > 0 ? qualityStats.issues.map((issue: any, index: number) => (
                <StaggerItem key={index} className="issue-item">
                  <div className="issue-icon-wrap">
                    <AlertCircle size={18} className={`text-${issue.severity || 'warning'}`} />
                  </div>
                  <div className="issue-content">
                    <strong className="issue-type-title">{issue.type}</strong>
                    <p className="issue-desc-text">{issue.desc}</p>
                  </div>
                </StaggerItem>
              )) : (
                <StaggerItem className="issue-item">
                  <div className="issue-icon-wrap">
                    <CheckCircle2 size={18} className="text-success" />
                  </div>
                  <div className="issue-content">
                    <strong className="issue-type-title">Taxonomy Optimal</strong>
                    <p className="issue-desc-text">Zero critical schema violations or missing required attributes.</p>
                  </div>
                </StaggerItem>
              )}
            </StaggerContainer>
          </AnimatedCard>
        </FadeIn>
      )}
    </div>
  );
};

export default CatalogQuality;
