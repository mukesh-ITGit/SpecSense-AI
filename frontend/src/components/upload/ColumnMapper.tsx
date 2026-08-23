import React from 'react';
import type { ColumnMapping } from '../../types';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingChange: (originalCol: string, mappedField: string | null) => void;
  onAutoDetect: () => void;
  onReset: () => void;
}

const SPECSENSE_FIELDS = [
  { value: 'product_name', label: 'Product Name' },
  { value: 'description', label: 'Raw Product Text / Description' },
  { value: 'part_number', label: 'Part Number / SKU' },
  { value: 'brand', label: 'Brand Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'category', label: 'Category' },
];

const ColumnMapper: React.FC<ColumnMapperProps> = ({ mappings, onMappingChange, onAutoDetect, onReset }) => {
  return (
    <div className="card column-mapper-card">
      <div className="card-header-flex">
        <h3 className="card-title">Column Detection & Mapping</h3>
        <div className="mapper-actions">
          <button className="btn btn-secondary btn-sm" onClick={onReset}>Reset Mapping</button>
          <button className="btn btn-primary btn-sm" onClick={onAutoDetect}>Auto Detect</button>
        </div>
      </div>
      
      <div className="mapping-list">
        <div className="mapping-header">
          <div>Raw Column</div>
          <div></div>
          <div>SpecSense Field</div>
        </div>
        
        {mappings.map((mapping) => (
          <div key={mapping.originalCol} className="mapping-row">
            <div className="raw-col-name">{mapping.originalCol}</div>
            <div className="mapping-arrow"><ArrowRight size={16} /></div>
            <div className="mapped-field-select">
              <select 
                value={mapping.mappedField || ''} 
                onChange={(e) => onMappingChange(mapping.originalCol, e.target.value || null)}
                className={mapping.mappedField ? 'mapped' : 'unmapped'}
              >
                <option value="">-- Ignore Column --</option>
                {SPECSENSE_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {mapping.mappedField && <CheckCircle2 className="icon-success ml-2" size={18} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnMapper;
