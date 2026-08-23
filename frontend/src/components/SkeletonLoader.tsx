import React from 'react';
import './SkeletonLoader.css';

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '1rem', borderRadius = '6px', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 6 }) => {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton height={i === 0 ? '16px' : '20px'} width={i === 0 ? '20px' : i === 1 ? '70%' : '50%'} />
        </td>
      ))}
    </tr>
  );
};

export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="card skeleton-card">
      <Skeleton height="24px" width="40%" style={{ marginBottom: '1rem' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="16px" width={i === lines - 1 ? '60%' : '90%'} style={{ marginBottom: '0.6rem' }} />
      ))}
    </div>
  );
};
