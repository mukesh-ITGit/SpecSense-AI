import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BatchJobResult } from '../../types';

interface BatchStatsProps {
  result: BatchJobResult;
}

const BatchStats: React.FC<BatchStatsProps> = ({ result }) => {
  const successfulItems = result.results.filter(r => r.status === 'success' && r.result);
  
  // Calculate average trust score
  const totalScore = successfulItems.reduce((sum, item) => sum + (item.result?.trust_score || 0), 0);
  const avgTrustScore = successfulItems.length > 0 ? Math.round(totalScore / successfulItems.length) : 0;

  const highConfidence = successfulItems.filter(item => (item.result?.trust_score || 0) >= 90).length;
  const needsReviewCount = result.needs_review;
  const conflictsCount = successfulItems.filter(item => (item.result?.conflicts?.length || 0) > 0).length;

  const highConfPct = Math.round((highConfidence / result.total) * 100) || 0;
  const reviewPct = Math.round((needsReviewCount / result.total) * 100) || 0;
  const conflictsPct = Math.round((conflictsCount / result.total) * 100) || 0;

  // Generate distribution data for chart
  const scoreDistribution = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '<70': 0
  };

  successfulItems.forEach(item => {
    const score = item.result?.trust_score || 0;
    if (score >= 90) scoreDistribution['90-100']++;
    else if (score >= 80) scoreDistribution['80-89']++;
    else if (score >= 70) scoreDistribution['70-79']++;
    else scoreDistribution['<70']++;
  });

  const chartData = [
    { name: '90-100', count: scoreDistribution['90-100'], color: '#10b981' },
    { name: '80-89', count: scoreDistribution['80-89'], color: '#3b82f6' },
    { name: '70-79', count: scoreDistribution['70-79'], color: '#f59e0b' },
    { name: '<70', count: scoreDistribution['<70'], color: '#ef4444' },
  ];

  return (
    <div className="batch-stats-container">
      <div className="kpi-row">
        <div className="card kpi-card">
          <div className="kpi-label">Average Trust Score</div>
          <div className="kpi-value text-primary">{avgTrustScore}%</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">High Confidence</div>
          <div className="kpi-value text-success">{highConfPct}%</div>
          <div className="kpi-subtext">{highConfidence} records</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Needs Review</div>
          <div className="kpi-value text-warning">{reviewPct}%</div>
          <div className="kpi-subtext">{needsReviewCount} records</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Conflicts</div>
          <div className="kpi-value text-danger">{conflictsPct}%</div>
          <div className="kpi-subtext">{conflictsCount} records</div>
        </div>
      </div>

      <div className="card chart-card mt-4">
        <h3 className="card-title">Trust Score Distribution</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BatchStats;
