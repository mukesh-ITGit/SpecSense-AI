import React from 'react';
import type { ColumnMapping } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataPreviewProps {
  data: Record<string, any>[];
  mappings: ColumnMapping[];
}

const DataPreview: React.FC<DataPreviewProps> = ({ data, mappings }) => {
  if (!data || data.length === 0) return null;

  const getMappedValue = (row: Record<string, any>, fieldKey: string) => {
    const mapping = mappings.find(m => m.mappedField === fieldKey);
    return mapping ? row[mapping.originalCol] : '';
  };

  const isSuspicious = (row: Record<string, any>) => {
    const desc = getMappedValue(row, 'description');
    const name = getMappedValue(row, 'product_name');
    return (!desc && !name) || String(desc).length < 5;
  };

  return (
    <div className="card data-preview-card">
      <h3 className="card-title">Data Preview (First {Math.min(data.length, 10)} rows)</h3>
      
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Raw Product Text</th>
              <th>Part Number</th>
              <th>Brand</th>
              <th>Detected Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, index) => {
              const suspicious = isSuspicious(row);
              return (
                <tr key={index} className={suspicious ? 'row-warning' : ''}>
                  <td>{index + 1}</td>
                  <td className="truncate-cell" title={getMappedValue(row, 'description') || getMappedValue(row, 'product_name')}>
                    {getMappedValue(row, 'description') || getMappedValue(row, 'product_name') || <span className="text-muted">Empty</span>}
                  </td>
                  <td>{getMappedValue(row, 'part_number') || <span className="text-muted">-</span>}</td>
                  <td>{getMappedValue(row, 'brand') || <span className="text-muted">-</span>}</td>
                  <td>{getMappedValue(row, 'category') || <span className="text-muted">-</span>}</td>
                  <td>
                    {suspicious ? (
                      <span className="badge badge-warning"><AlertCircle size={12} /> WARNING</span>
                    ) : (
                      <span className="badge badge-success"><CheckCircle2 size={12} /> READY</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataPreview;
